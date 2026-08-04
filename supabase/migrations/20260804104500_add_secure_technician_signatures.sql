-- Firma técnica privada y registro estrecho de metadatos.
-- Migración aditiva: no modifica migraciones ya aplicadas.

alter table public.ot_firmas
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists signed_at timestamptz not null default now();

create index if not exists idx_ot_firmas_ot_tipo_created
  on public.ot_firmas (ot_id, tipo, created_at desc);

create or replace function public.register_technician_signature(
  work_order_uuid uuid,
  path_text text,
  signer_name_text text,
  mime_type_text text,
  size_bytes_value bigint
)
returns public.ot_firmas
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  visit_row public.ot_visitas;
  signature_row public.ot_firmas;
  object_mime text;
  object_size bigint;
  object_filename text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select work_order.*
    into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = work_order_uuid
    and work_order.deleted_at is null
  for update;

  if work_order_row.id is null
    or work_order_row.estado <> 'EN_CURSO'
    or work_order_row.assigned_to is distinct from auth.uid()
    or not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or not public.is_work_order_mutable(work_order_row.id)
  then
    raise exception 'Solo el técnico asignado puede firmar una OT en curso';
  end if;

  if nullif(btrim(signer_name_text), '') is null then
    raise exception 'Indica el nombre del técnico firmante';
  end if;

  if exists (
    select 1
    from public.ot_firmas signature
    where signature.ot_id = work_order_row.id
      and signature.tenant_id = work_order_row.tenant_id
      and signature.tipo = 'tecnico'
  ) then
    raise exception 'La firma técnica ya está registrada';
  end if;

  if path_text not like work_order_row.tenant_id::text || '/' || work_order_row.id::text || '/firma/%'
    or split_part(path_text, '/', 4) = ''
    or split_part(path_text, '/', 5) <> ''
    or split_part(path_text, '/', 4) like '%..%'
  then
    raise exception 'La ruta de firma no pertenece a la OT';
  end if;

  select
    lower(coalesce(nullif(object.metadata ->> 'mimetype', ''), nullif(mime_type_text, ''))),
    coalesce(nullif(object.metadata ->> 'size', '')::bigint, size_bytes_value),
    split_part(object.name, '/', 4)
  into object_mime, object_size, object_filename
  from storage.objects object
  where object.bucket_id = 'ot-signatures'
    and object.name = path_text
    and object.owner = auth.uid();

  if object_filename is null then
    raise exception 'El archivo privado de firma no está disponible para este usuario';
  end if;

  if object_mime <> 'image/png' then
    raise exception 'La firma debe guardarse en formato PNG';
  end if;

  if object_size is null or object_size < 1 or object_size > 2097152 then
    raise exception 'La firma no puede superar 2 MiB';
  end if;

  select visit.*
    into visit_row
  from public.ot_visitas visit
  where visit.ot_id = work_order_row.id
    and visit.tenant_id = work_order_row.tenant_id
    and visit.tecnico_id = auth.uid()
    and visit.estado = 'EN_CURSO'
  order by visit.fecha_inicio desc nulls last, visit.created_at desc
  limit 1;

  if visit_row.id is null then
    raise exception 'No existe una intervención activa para registrar la firma';
  end if;

  insert into public.ot_firmas (
    tenant_id,
    ot_id,
    visita_id,
    tipo,
    bucket,
    path,
    firmante_nombre,
    mime_type,
    size_bytes,
    signed_at,
    created_by
  )
  values (
    work_order_row.tenant_id,
    work_order_row.id,
    visit_row.id,
    'tecnico',
    'ot-signatures',
    path_text,
    btrim(signer_name_text),
    object_mime,
    object_size,
    now(),
    auth.uid()
  )
  returning * into signature_row;

  perform public.log_audit(
    work_order_row.tenant_id,
    'register_technician_signature',
    'ot_firmas',
    signature_row.id,
    jsonb_build_object(
      'work_order_id', work_order_row.id,
      'visit_id', visit_row.id,
      'mime_type', object_mime,
      'size_bytes', object_size
    )
  );

  return signature_row;
end;
$function$;

revoke insert, update, delete on public.ot_firmas from authenticated;

revoke execute on function public.register_technician_signature(uuid, text, text, text, bigint)
  from public, anon, authenticated, service_role;

grant execute on function public.register_technician_signature(uuid, text, text, text, bigint)
  to authenticated;
