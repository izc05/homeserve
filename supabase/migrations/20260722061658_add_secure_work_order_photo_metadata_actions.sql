-- Registro y eliminación estrechos de metadatos para fotografías privadas.

create or replace function public.register_work_order_photo(
  work_order_uuid uuid,
  photo_type_text text,
  path_text text,
  filename_text text,
  mime_type_text text,
  size_bytes_value bigint,
  checklist_response_uuid uuid default null
)
returns public.ot_fotos
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  photo_row public.ot_fotos;
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
    raise exception 'Solo el técnico asignado puede añadir fotografías a una OT en curso';
  end if;

  if photo_type_text not in ('inicial', 'final', 'checklist', 'evidencia') then
    raise exception 'La categoría de fotografía no es válida';
  end if;

  if path_text not like work_order_row.tenant_id::text || '/' || work_order_row.id::text || '/foto/%'
    or split_part(path_text, '/', 4) = ''
    or split_part(path_text, '/', 5) <> ''
    or split_part(path_text, '/', 4) like '%..%'
  then
    raise exception 'La ruta de fotografía no pertenece a la OT';
  end if;

  select
    lower(coalesce(nullif(object.metadata ->> 'mimetype', ''), nullif(mime_type_text, ''))),
    coalesce(nullif(object.metadata ->> 'size', '')::bigint, size_bytes_value),
    split_part(object.name, '/', 4)
  into object_mime, object_size, object_filename
  from storage.objects object
  where object.bucket_id = 'ot-photos'
    and object.name = path_text
    and object.owner = auth.uid();

  if object_filename is null then
    raise exception 'El archivo privado no está disponible para este usuario';
  end if;

  if object_mime not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'El formato de fotografía debe ser JPEG, PNG o WebP';
  end if;

  if object_size is null or object_size < 1 or object_size > 10485760 then
    raise exception 'La fotografía no puede superar 10 MiB';
  end if;

  if checklist_response_uuid is not null and not exists (
    select 1
    from public.ot_checklist_respuestas response
    where response.id = checklist_response_uuid
      and response.ot_id = work_order_row.id
      and response.tenant_id = work_order_row.tenant_id
  ) then
    raise exception 'El punto de checklist no pertenece a la OT';
  end if;

  insert into public.ot_fotos (
    tenant_id,
    ot_id,
    checklist_respuesta_id,
    tipo,
    bucket,
    path,
    filename,
    mime_type,
    size_bytes,
    created_by
  )
  values (
    work_order_row.tenant_id,
    work_order_row.id,
    checklist_response_uuid,
    photo_type_text,
    'ot-photos',
    path_text,
    coalesce(nullif(btrim(filename_text), ''), object_filename),
    object_mime,
    object_size,
    auth.uid()
  )
  returning * into photo_row;

  return photo_row;
end;
$function$;

create or replace function public.delete_work_order_photo_metadata(
  photo_uuid uuid
)
returns public.ot_fotos
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  photo_row public.ot_fotos;
  work_order_row public.ordenes_trabajo;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select photo.*
    into photo_row
  from public.ot_fotos photo
  where photo.id = photo_uuid
  for update;

  if photo_row.id is null then
    raise exception 'La fotografía no está disponible';
  end if;

  select work_order.*
    into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = photo_row.ot_id
    and work_order.tenant_id = photo_row.tenant_id
    and work_order.deleted_at is null
  for update;

  if work_order_row.id is null
    or not public.is_work_order_mutable(work_order_row.id)
    or not (
      public.can_manage_work_orders(work_order_row.tenant_id)
      or (
        work_order_row.estado = 'EN_CURSO'
        and work_order_row.assigned_to is not distinct from auth.uid()
        and public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
      )
    )
  then
    raise exception 'No tienes permiso para eliminar esta fotografía';
  end if;

  delete from public.ot_fotos
  where id = photo_row.id;

  return photo_row;
end;
$function$;

revoke insert, update, delete on public.ot_fotos from authenticated;

revoke execute on function public.register_work_order_photo(uuid, text, text, text, text, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.delete_work_order_photo_metadata(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.register_work_order_photo(uuid, text, text, text, text, bigint, uuid)
  to authenticated;
grant execute on function public.delete_work_order_photo_metadata(uuid)
  to authenticated;
