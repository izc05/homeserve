-- Refuerza la integridad del informe: el navegador solo puede reservar versiones.
-- La subida, finalización y fallo quedan reservados al runtime de confianza.

 drop policy if exists ot_storage_insert on storage.objects;
 create policy ot_storage_insert
 on storage.objects
 for insert
 to authenticated
 with check (
   bucket_id = any (array['ot-photos'::text, 'ot-signatures'::text])
   and public.can_access_work_order_storage(bucket_id, name, true)
 );

 drop policy if exists ot_storage_update on storage.objects;
 create policy ot_storage_update
 on storage.objects
 for update
 to authenticated
 using (
   bucket_id = any (array['ot-photos'::text, 'ot-signatures'::text])
   and public.can_access_work_order_storage(bucket_id, name, true)
 )
 with check (
   bucket_id = any (array['ot-photos'::text, 'ot-signatures'::text])
   and public.can_access_work_order_storage(bucket_id, name, true)
 );

 drop policy if exists ot_storage_delete on storage.objects;
 create policy ot_storage_delete
 on storage.objects
 for delete
 to authenticated
 using (
   bucket_id = any (array['ot-photos'::text, 'ot-signatures'::text])
   and public.can_access_work_order_storage(bucket_id, name, true)
 );

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
  object_mime text;
  object_size bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'La finalización del informe requiere el servicio de documentos';
  end if;

  select report.*
    into report_row
  from public.ot_informes report
  where report.id = report_uuid
  for update;

  if report_row.id is null or report_row.estado <> 'generando' then
    raise exception 'La reserva de informe no está disponible';
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

  insert into public.audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  )
  values (
    report_row.tenant_id,
    report_row.created_by,
    'complete_work_order_report',
    'ot_informes',
    report_row.id,
    jsonb_build_object(
      'work_order_id', report_row.ot_id,
      'version', report_row.version,
      'report_type', report_row.tipo,
      'size_bytes', object_size,
      'checksum_sha256', lower(checksum_text),
      'completed_by', 'edge_function'
    ),
    clock_timestamp()
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
  if auth.role() is distinct from 'service_role' then
    raise exception 'El fallo del informe requiere el servicio de documentos';
  end if;

  select report.*
    into report_row
  from public.ot_informes report
  where report.id = report_uuid
  for update;

  if report_row.id is null or report_row.estado <> 'generando' then
    raise exception 'La reserva de informe no está disponible';
  end if;

  update public.ot_informes
  set
    estado = 'fallido',
    failure_reason = left(coalesce(nullif(btrim(reason_text), ''), 'Error durante la generación'), 500),
    completed_at = now()
  where id = report_row.id
  returning * into report_row;

  insert into public.audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  )
  values (
    report_row.tenant_id,
    report_row.created_by,
    'fail_work_order_report',
    'ot_informes',
    report_row.id,
    jsonb_build_object(
      'work_order_id', report_row.ot_id,
      'version', report_row.version,
      'report_type', report_row.tipo,
      'failed_by', 'edge_function'
    ),
    clock_timestamp()
  );

  return report_row;
end;
$function$;

revoke execute on function public.complete_work_order_report(uuid, text, bigint, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.fail_work_order_report(uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.complete_work_order_report(uuid, text, bigint, text)
  to service_role;
grant execute on function public.fail_work_order_report(uuid, text)
  to service_role;
