create or replace function public.ensure_work_order_default_checklist(
  work_order_uuid uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  work_order_row public.ordenes_trabajo;
  created_count integer := 0;
  total_count integer := 0;
  done_count integer := 0;
  config_json jsonb;
begin
  work_order_row := public.ensure_work_order_lifecycle_permission(work_order_uuid);
  config_json := coalesce(work_order_row.configuracion, '{}'::jsonb);

  if not public.is_work_order_mutable(work_order_uuid) then
    raise exception 'La OT finalizada o cerrada es de solo lectura';
  end if;

  insert into public.ot_checklist_respuestas (
    tenant_id,
    ot_id,
    orden,
    punto,
    descripcion,
    resultado,
    requiere_foto,
    obligatorio,
    tipo_respuesta,
    plantilla_item_id,
    created_by
  )
  select
    work_order_row.tenant_id,
    work_order_row.id,
    item.orden,
    item.punto,
    item.descripcion,
    null,
    item.requiere_foto,
    true,
    item.tipo_respuesta,
    item.plantilla_item_id,
    auth.uid()
  from (
    values
      (10, 'Identificación', 'Confirmar instalación, ubicación, equipo y alcance de la OT.', false, 'ok_ko_na', 'identificacion'),
      (20, 'Seguridad', 'Revisar condiciones de seguridad antes de intervenir.', false, 'ok_ko_na', 'seguridad'),
      (30, 'Estado inicial', 'Registrar situación encontrada y anomalías visibles.', coalesce((config_json->>'requiere_fotos_iniciales')::boolean, false), 'texto', 'estado_inicial'),
      (40, 'Ejecución técnica', 'Registrar trabajo realizado y comprobaciones principales.', false, 'texto', 'ejecucion'),
      (50, 'Mediciones', 'Anotar mediciones obligatorias cuando aplique.', false, 'medicion', 'mediciones'),
      (60, 'Materiales', 'Registrar material usado o pendiente de suministro.', false, 'texto', 'materiales'),
      (70, 'Prueba funcional', 'Comprobar funcionamiento final y dejar constancia del resultado.', false, 'ok_ko_na', 'prueba_funcional'),
      (80, 'Fotos finales', 'Adjuntar evidencia fotográfica final cuando aplique.', true, 'ok_ko_na', 'fotos_finales'),
      (90, 'Firma técnico', 'Confirmar firma o responsable técnico de la intervención.', false, 'texto', 'firma_tecnico'),
      (100, 'Informe', 'Generar o revisar el informe técnico de cierre.', false, 'ok_ko_na', 'informe')
  ) as item(orden, punto, descripcion, requiere_foto, tipo_respuesta, plantilla_item_id)
  where (
    item.plantilla_item_id in ('identificacion', 'seguridad', 'estado_inicial', 'ejecucion')
    or (item.plantilla_item_id = 'mediciones' and coalesce((config_json->>'requiere_mediciones')::boolean, false))
    or (item.plantilla_item_id = 'materiales' and coalesce((config_json->>'requiere_materiales')::boolean, false))
    or (item.plantilla_item_id = 'prueba_funcional' and coalesce((config_json->>'requiere_prueba_funcional')::boolean, false))
    or (item.plantilla_item_id = 'fotos_finales' and coalesce((config_json->>'requiere_fotos_finales')::boolean, false))
    or (item.plantilla_item_id = 'firma_tecnico' and coalesce((config_json->>'requiere_firma_tecnico')::boolean, false))
    or (item.plantilla_item_id = 'informe' and coalesce((config_json->>'requiere_informe')::boolean, false))
  )
  and not exists (
    select 1
    from public.ot_checklist_respuestas existing
    where existing.ot_id = work_order_row.id
      and existing.plantilla_item_id = item.plantilla_item_id
  );

  get diagnostics created_count = row_count;

  select count(*), count(*) filter (where resultado is not null and btrim(resultado) <> '')
    into total_count, done_count
  from public.ot_checklist_respuestas
  where ot_id = work_order_row.id;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    work_order_row.tenant_id,
    'ensure_work_order_default_checklist',
    'ordenes_trabajo',
    work_order_row.id,
    auth.uid(),
    jsonb_build_object('created_items', created_count, 'total_items', total_count, 'completed_items', done_count)
  );

  return jsonb_build_object(
    'work_order_id', work_order_row.id,
    'created_items', created_count,
    'total_items', total_count,
    'completed_items', done_count
  );
end;
$function$;

grant execute on function public.ensure_work_order_default_checklist(uuid) to authenticated, service_role;

create or replace function public.register_work_order_report(
  work_order_uuid uuid,
  filename_text text default null
)
returns public.ot_informes
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  work_order_row public.ordenes_trabajo;
  report_row public.ot_informes;
  safe_filename text;
begin
  if not public.can_access_work_order(work_order_uuid, 'select') then
    raise exception 'No tienes permisos para consultar esta OT';
  end if;

  select * into work_order_row
  from public.ordenes_trabajo
  where id = work_order_uuid
    and deleted_at is null;

  if work_order_row.id is null then
    raise exception 'La OT no existe o está eliminada';
  end if;

  safe_filename := coalesce(nullif(btrim(filename_text), ''), concat(coalesce(work_order_row.codigo_ot, work_order_row.id::text), '-informe.html'));

  insert into public.ot_informes (tenant_id, ot_id, filename, bucket, path, created_by)
  values (
    work_order_row.tenant_id,
    work_order_row.id,
    safe_filename,
    null,
    null,
    auth.uid()
  )
  returning * into report_row;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    work_order_row.tenant_id,
    'register_work_order_report',
    'ordenes_trabajo',
    work_order_row.id,
    auth.uid(),
    jsonb_build_object('filename', safe_filename, 'report_id', report_row.id)
  );

  return report_row;
end;
$function$;

grant execute on function public.register_work_order_report(uuid, text) to authenticated, service_role;
