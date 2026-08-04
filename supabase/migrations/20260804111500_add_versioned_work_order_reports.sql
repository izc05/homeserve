-- Informes PDF privados, versionados y con finalización en dos fases.
-- La generación se realiza en Edge Functions; Postgres reserva y valida cada versión.

alter table public.ot_informes
  add column if not exists tipo text not null default 'provisional',
  add column if not exists estado text not null default 'generando',
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists checksum_sha256 text,
  add column if not exists generated_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists failure_reason text;

update public.ot_informes
set
  tipo = coalesce(nullif(tipo, ''), 'provisional'),
  estado = case when nullif(path, '') is null then 'fallido' else 'listo' end,
  generated_at = coalesce(generated_at, created_at),
  completed_at = case when nullif(path, '') is not null then coalesce(completed_at, created_at) else completed_at end
where estado = 'generando'
  and created_at < now() - interval '5 minutes';

alter table public.ot_informes
  drop constraint if exists ot_informes_tipo_check,
  add constraint ot_informes_tipo_check check (tipo in ('provisional', 'final')),
  drop constraint if exists ot_informes_estado_check,
  add constraint ot_informes_estado_check check (estado in ('generando', 'listo', 'fallido')),
  drop constraint if exists ot_informes_size_bytes_check,
  add constraint ot_informes_size_bytes_check check (size_bytes is null or (size_bytes > 0 and size_bytes <= 52428800)),
  drop constraint if exists ot_informes_checksum_check,
  add constraint ot_informes_checksum_check check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$');

create index if not exists idx_ot_informes_ot_estado_version
  on public.ot_informes (ot_id, estado, version desc);

create unique index if not exists uq_ot_informes_final_ready
  on public.ot_informes (ot_id)
  where tipo = 'final' and estado = 'listo';

create or replace function public.get_work_order_report_capabilities(work_order_uuid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  manager_access boolean := false;
  final_exists boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select work_order.*
    into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = work_order_uuid
    and work_order.deleted_at is null;

  if work_order_row.id is null
    or not public.can_access_work_order(work_order_row.id)
  then
    raise exception 'La OT no está disponible';
  end if;

  manager_access := public.can_manage_work_orders(work_order_row.tenant_id);

  select exists (
    select 1
    from public.ot_informes report
    where report.ot_id = work_order_row.id
      and report.tipo = 'final'
      and report.estado in ('generando', 'listo')
  ) into final_exists;

  return jsonb_build_object(
    'work_order_status', work_order_row.estado,
    'can_generate_provisional',
      work_order_row.estado = 'FINALIZADA_TECNICO'
      and (manager_access or work_order_row.assigned_to = auth.uid()),
    'can_generate_final',
      work_order_row.estado = 'VALIDADA'
      and manager_access
      and not final_exists,
    'final_report_exists', final_exists
  );
end;
$function$;

create or replace function public.reserve_work_order_report(
  work_order_uuid uuid,
  report_type_text text default 'provisional'
)
returns public.ot_informes
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  report_row public.ot_informes;
  report_uuid uuid := extensions.gen_random_uuid();
  next_version integer;
  manager_access boolean := false;
  safe_code text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if report_type_text not in ('provisional', 'final') then
    raise exception 'El tipo de informe no es válido';
  end if;

  select work_order.*
    into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = work_order_uuid
    and work_order.deleted_at is null
  for update;

  if work_order_row.id is null then
    raise exception 'La OT no existe';
  end if;

  manager_access := public.can_manage_work_orders(work_order_row.tenant_id);

  if report_type_text = 'provisional' and not (
    work_order_row.estado = 'FINALIZADA_TECNICO'
    and (manager_access or work_order_row.assigned_to = auth.uid())
  ) then
    raise exception 'El informe provisional requiere una OT finalizada por su técnico';
  end if;

  if report_type_text = 'final' and not (
    work_order_row.estado = 'VALIDADA'
    and manager_access
  ) then
    raise exception 'Solo un responsable puede generar el informe final de una OT validada';
  end if;

  if report_type_text = 'final' and exists (
    select 1
    from public.ot_informes report
    where report.ot_id = work_order_row.id
      and report.tipo = 'final'
      and report.estado in ('generando', 'listo')
  ) then
    raise exception 'El informe final ya está generado o en proceso';
  end if;

  select coalesce(max(report.version), 0) + 1
    into next_version
  from public.ot_informes report
  where report.ot_id = work_order_row.id;

  safe_code := regexp_replace(work_order_row.codigo_ot, '[^a-zA-Z0-9_-]+', '-', 'g');

  insert into public.ot_informes (
    id,
    tenant_id,
    ot_id,
    version,
    filename,
    bucket,
    path,
    tipo,
    estado,
    generated_at,
    created_by
  )
  values (
    report_uuid,
    work_order_row.tenant_id,
    work_order_row.id,
    next_version,
    safe_code || '-informe-' || report_type_text || '-v' || next_version || '.pdf',
    'ot-reports',
    work_order_row.tenant_id::text || '/' || work_order_row.id::text || '/informe/' || report_uuid::text || '.pdf',
    report_type_text,
    'generando',
    now(),
    auth.uid()
  )
  returning * into report_row;

  perform public.log_audit(
    work_order_row.tenant_id,
    'reserve_work_order_report',
    'ot_informes',
    report_row.id,
    jsonb_build_object(
      'work_order_id', work_order_row.id,
      'version', next_version,
      'report_type', report_type_text
    )
  );

  return report_row;
end;
$function$;

create or replace function public.complete_work_order_report(
  report_uuid uuid,
  mime_type_text text,
  size_bytes_value bigint,
  checksum_text text
)
returns public.ot_informes
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  report_row public.ot_informes;
  work_order_row public.ordenes_trabajo;
  object_mime text;
  object_size bigint;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select report.*
    into report_row
  from public.ot_informes report
  where report.id = report_uuid
  for update;

  if report_row.id is null or report_row.estado <> 'generando' then
    raise exception 'La reserva de informe no está disponible';
  end if;

  select work_order.*
    into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = report_row.ot_id
    and work_order.deleted_at is null;

  if work_order_row.id is null or not (
    report_row.created_by = auth.uid()
    or public.can_manage_work_orders(report_row.tenant_id)
  ) then
    raise exception 'No tienes permiso para completar este informe';
  end if;

  if report_row.path not like report_row.tenant_id::text || '/' || report_row.ot_id::text || '/informe/%'
    or split_part(report_row.path, '/', 4) = ''
    or split_part(report_row.path, '/', 5) <> ''
    or split_part(report_row.path, '/', 4) like '%..%'
  then
    raise exception 'La ruta del informe no pertenece a la OT';
  end if;

  select
    lower(coalesce(nullif(object.metadata ->> 'mimetype', ''), nullif(mime_type_text, ''))),
    coalesce(nullif(object.metadata ->> 'size', '')::bigint, size_bytes_value)
  into object_mime, object_size
  from storage.objects object
  where object.bucket_id = 'ot-reports'
    and object.name = report_row.path;

  if object_mime is null then
    raise exception 'El archivo privado del informe no está disponible';
  end if;

  if object_mime <> 'application/pdf' then
    raise exception 'El informe debe guardarse en formato PDF';
  end if;

  if object_size is null or object_size < 1 or object_size > 52428800 then
    raise exception 'El informe no puede superar 50 MiB';
  end if;

  if lower(checksum_text) !~ '^[0-9a-f]{64}$' then
    raise exception 'La huella del informe no es válida';
  end if;

  update public.ot_informes
  set
    estado = 'listo',
    mime_type = object_mime,
    size_bytes = object_size,
    checksum_sha256 = lower(checksum_text),
    completed_at = now(),
    failure_reason = null
  where id = report_row.id
  returning * into report_row;

  perform public.log_audit(
    report_row.tenant_id,
    'complete_work_order_report',
    'ot_informes',
    report_row.id,
    jsonb_build_object(
      'work_order_id', report_row.ot_id,
      'version', report_row.version,
      'report_type', report_row.tipo,
      'size_bytes', object_size,
      'checksum_sha256', lower(checksum_text)
    )
  );

  return report_row;
end;
$function$;

create or replace function public.fail_work_order_report(
  report_uuid uuid,
  reason_text text default null
)
returns public.ot_informes
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  report_row public.ot_informes;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select report.*
    into report_row
  from public.ot_informes report
  where report.id = report_uuid
  for update;

  if report_row.id is null or report_row.estado <> 'generando' then
    raise exception 'La reserva de informe no está disponible';
  end if;

  if report_row.created_by <> auth.uid()
    and not public.can_manage_work_orders(report_row.tenant_id)
  then
    raise exception 'No tienes permiso para cancelar este informe';
  end if;

  update public.ot_informes
  set
    estado = 'fallido',
    failure_reason = left(coalesce(nullif(btrim(reason_text), ''), 'Error durante la generación'), 500),
    completed_at = now()
  where id = report_row.id
  returning * into report_row;

  perform public.log_audit(
    report_row.tenant_id,
    'fail_work_order_report',
    'ot_informes',
    report_row.id,
    jsonb_build_object(
      'work_order_id', report_row.ot_id,
      'version', report_row.version,
      'report_type', report_row.tipo
    )
  );

  return report_row;
end;
$function$;

revoke insert, update, delete on public.ot_informes from authenticated;
grant select on public.ot_informes to authenticated;

revoke execute on function public.register_work_order_report(uuid, text)
  from public, anon, authenticated;

revoke execute on function public.get_work_order_report_capabilities(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.reserve_work_order_report(uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.complete_work_order_report(uuid, text, bigint, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.fail_work_order_report(uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.get_work_order_report_capabilities(uuid) to authenticated;
grant execute on function public.reserve_work_order_report(uuid, text) to authenticated;
grant execute on function public.complete_work_order_report(uuid, text, bigint, text) to authenticated;
grant execute on function public.fail_work_order_report(uuid, text) to authenticated;
