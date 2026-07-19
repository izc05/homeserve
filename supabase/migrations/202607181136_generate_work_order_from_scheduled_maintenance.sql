create or replace function public.normalize_scheduled_maintenance_ot_type(type_text text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case lower(coalesce(nullif(btrim(type_text), ''), 'preventivo'))
    when 'preventivo' then 'mantenimiento_preventivo'
    when 'predictivo' then 'mantenimiento_preventivo'
    when 'limpieza' then 'mantenimiento_preventivo'
    when 'ajuste' then 'mantenimiento_preventivo'
    when 'lubricacion' then 'mantenimiento_preventivo'
    when 'correctivo' then 'mantenimiento_correctivo'
    when 'revision_tecnica' then 'revision'
    when 'prueba_funcional' then 'revision'
    when 'calibracion' then 'medicion'
    when 'sustitucion' then 'sustitucion'
    when 'mejora' then 'instalacion'
    when 'modificacion' then 'instalacion'
    else 'otro'
  end;
$function$;

grant execute on function public.normalize_scheduled_maintenance_ot_type(text) to authenticated, service_role;

create or replace function public.normalize_scheduled_maintenance_priority(priority_text text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case lower(coalesce(nullif(btrim(priority_text), ''), 'normal'))
    when 'baja' then 'baja'
    when 'media' then 'normal'
    when 'normal' then 'normal'
    when 'alta' then 'alta'
    when 'urgente' then 'urgente'
    when 'critica' then 'critica'
    else 'normal'
  end;
$function$;

grant execute on function public.normalize_scheduled_maintenance_priority(text) to authenticated, service_role;

create or replace function public.create_work_order_from_scheduled_maintenance(
  scheduled_maintenance_uuid uuid,
  technician_uuid uuid default null
)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  scheduled_row public.mantenimientos_programados;
  existing_order public.ordenes_trabajo;
  created_order public.ordenes_trabajo;
  target_technician uuid;
  requirements jsonb;
begin
  if scheduled_maintenance_uuid is null then
    raise exception 'No se ha indicado el mantenimiento programado';
  end if;

  select * into scheduled_row
  from public.mantenimientos_programados mp
  where mp.id = scheduled_maintenance_uuid
    and mp.deleted_at is null
  for update;

  if scheduled_row.id is null then
    raise exception 'El mantenimiento programado no existe o está eliminado';
  end if;

  if not public.can_manage_work_orders(scheduled_row.tenant_id) then
    raise exception 'No tienes permisos para generar OT desde planificación';
  end if;

  if scheduled_row.estado in ('cancelado','no_aplica','completado') then
    raise exception 'Este mantenimiento programado no puede generar una OT por su estado actual';
  end if;

  if scheduled_row.ot_id is not null then
    select * into existing_order
    from public.ordenes_trabajo ot
    where ot.id = scheduled_row.ot_id
      and ot.deleted_at is null;

    if existing_order.id is not null then
      return existing_order;
    end if;
  end if;

  target_technician := coalesce(technician_uuid, scheduled_row.assigned_to);
  requirements := jsonb_build_object(
    'requiere_checklist', true,
    'requiere_fotos_iniciales', false,
    'requiere_fotos_finales', true,
    'requiere_mediciones', scheduled_row.tipo in ('calibracion','prueba_funcional','revision_tecnica'),
    'requiere_materiales', scheduled_row.tipo in ('sustitucion','correctivo'),
    'requiere_firma_tecnico', true,
    'requiere_firma_cliente', false,
    'requiere_prueba_funcional', scheduled_row.tipo in ('prueba_funcional','correctivo','sustitucion'),
    'requiere_informe', true,
    'requiere_revision_admin', true
  );

  created_order := public.create_work_order(
    scheduled_row.tenant_id,
    scheduled_row.instalacion_id,
    scheduled_row.titulo,
    scheduled_row.descripcion,
    public.normalize_scheduled_maintenance_ot_type(scheduled_row.tipo),
    public.normalize_scheduled_maintenance_priority(scheduled_row.prioridad),
    scheduled_row.ubicacion_id,
    scheduled_row.activo_id,
    target_technician,
    case when scheduled_row.fecha_programada is null then null else scheduled_row.fecha_programada::timestamp with time zone end,
    case when scheduled_row.fecha_limite is null then null else scheduled_row.fecha_limite::timestamp with time zone end,
    null,
    concat_ws(E'\n', 'OT generada desde mantenimiento programado.', 'Origen: ' || coalesce(scheduled_row.origen, 'manual'), 'Tipo programado: ' || scheduled_row.tipo),
    null,
    'Mantenimiento programado ejecutado y documentado correctamente.',
    requirements
  );

  update public.mantenimientos_programados
  set ot_id = created_order.id,
      estado = 'ot_generada',
      assigned_to = target_technician,
      updated_at = now()
  where id = scheduled_row.id;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    scheduled_row.tenant_id,
    'create_work_order_from_scheduled_maintenance',
    'mantenimientos_programados',
    scheduled_row.id,
    auth.uid(),
    jsonb_build_object(
      'work_order_id', created_order.id,
      'codigo_ot', created_order.codigo_ot,
      'scheduled_status', 'ot_generada',
      'assigned_to', target_technician
    )
  );

  return created_order;
end;
$function$;

grant execute on function public.create_work_order_from_scheduled_maintenance(uuid, uuid) to authenticated, service_role;
