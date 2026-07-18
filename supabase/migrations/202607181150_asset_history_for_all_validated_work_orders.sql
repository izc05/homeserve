create or replace function public.complete_scheduled_maintenance_from_work_order(
  work_order_uuid uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  order_row public.ordenes_trabajo;
  scheduled_row public.mantenimientos_programados;
  plan_row public.planes_mantenimiento;
  performed_date date;
  next_date date;
  history_id uuid;
  target_asset_id uuid;
  planning_linked boolean := false;
begin
  if work_order_uuid is null then
    raise exception 'No se ha indicado la OT a cerrar contra historial';
  end if;

  select * into order_row
  from public.ordenes_trabajo ot
  where ot.id = work_order_uuid
    and ot.deleted_at is null;

  if order_row.id is null then
    raise exception 'La OT no existe o está eliminada';
  end if;

  if not public.can_access_work_order(work_order_uuid, 'select') then
    raise exception 'No tienes permisos para cerrar el histórico de esta OT';
  end if;

  select * into scheduled_row
  from public.mantenimientos_programados mp
  where mp.ot_id = work_order_uuid
    and mp.deleted_at is null
  order by mp.created_at desc
  limit 1
  for update;

  planning_linked := scheduled_row.id is not null;
  target_asset_id := coalesce(scheduled_row.activo_id, order_row.activo_id);
  performed_date := coalesce(order_row.fecha_fin::date, order_row.closed_at::date, now()::date);

  if planning_linked and scheduled_row.plan_id is not null then
    select * into plan_row
    from public.planes_mantenimiento pm
    where pm.id = scheduled_row.plan_id
      and pm.deleted_at is null
    for update;

    if plan_row.id is not null then
      next_date := public.add_plan_interval(
        performed_date,
        coalesce(plan_row.periodicidad_valor, 1),
        coalesce(plan_row.periodicidad_unidad, 'mes')
      );

      update public.planes_mantenimiento
      set fecha_ultima_realizacion = performed_date,
          fecha_proxima_realizacion = next_date,
          updated_at = now()
      where id = plan_row.id;
    end if;
  end if;

  if planning_linked then
    update public.mantenimientos_programados
    set estado = 'completado',
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where id = scheduled_row.id;
  end if;

  if target_asset_id is null then
    return jsonb_build_object(
      'linked', planning_linked,
      'history_created', false,
      'work_order_id', order_row.id,
      'reason', 'OT sin equipo vinculado'
    );
  end if;

  update public.activos
  set fecha_ultima_revision = performed_date,
      fecha_proxima_revision = coalesce(next_date, fecha_proxima_revision),
      estado = coalesce(nullif(order_row.configuracion->>'estado_final_activo', ''), estado),
      updated_at = now()
  where id = target_asset_id
    and tenant_id = order_row.tenant_id
    and deleted_at is null;

  select hm.id into history_id
  from public.historial_mantenimiento hm
  where hm.ot_id = order_row.id
    and hm.deleted_at is null
  limit 1;

  if history_id is null then
    insert into public.historial_mantenimiento (
      tenant_id,
      activo_id,
      fecha,
      tipo,
      titulo,
      descripcion,
      tecnico_id,
      estado_final,
      proxima_accion,
      created_by,
      plan_id,
      mantenimiento_programado_id,
      ot_id,
      origen,
      fecha_inicio,
      fecha_fin,
      trabajo_previsto,
      trabajo_realizado,
      resultado,
      estado_activo_final,
      proxima_fecha,
      observaciones
    ) values (
      order_row.tenant_id,
      target_asset_id,
      performed_date,
      coalesce(scheduled_row.tipo, order_row.tipo),
      order_row.titulo,
      order_row.descripcion,
      order_row.assigned_to,
      'ot_validada',
      case when next_date is null then null else 'Próxima revisión: ' || next_date::text end,
      auth.uid(),
      scheduled_row.plan_id,
      scheduled_row.id,
      order_row.id,
      case when planning_linked then 'planificacion_ot_validada' else 'ot_validada' end,
      order_row.fecha_inicio,
      coalesce(order_row.fecha_fin, order_row.closed_at),
      coalesce(scheduled_row.descripcion, order_row.trabajo_solicitado, order_row.descripcion),
      coalesce(order_row.trabajo_solicitado, order_row.descripcion, order_row.titulo),
      'validada',
      coalesce(nullif(order_row.configuracion->>'estado_final_activo', ''), 'correcto'),
      next_date,
      case when planning_linked then 'Histórico generado automáticamente al validar OT de planificación.' else 'Histórico generado automáticamente al validar OT.' end
    )
    returning id into history_id;
  end if;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    order_row.tenant_id,
    case when planning_linked then 'complete_scheduled_maintenance_from_work_order' else 'create_asset_history_from_work_order' end,
    case when planning_linked then 'mantenimientos_programados' else 'historial_mantenimiento' end,
    coalesce(scheduled_row.id, history_id),
    auth.uid(),
    jsonb_build_object(
      'work_order_id', order_row.id,
      'history_id', history_id,
      'plan_id', scheduled_row.plan_id,
      'asset_id', target_asset_id,
      'performed_date', performed_date,
      'next_date', next_date,
      'linked_to_planning', planning_linked
    )
  );

  return jsonb_build_object(
    'linked', planning_linked,
    'history_created', true,
    'work_order_id', order_row.id,
    'scheduled_maintenance_id', scheduled_row.id,
    'plan_id', scheduled_row.plan_id,
    'asset_id', target_asset_id,
    'history_id', history_id,
    'performed_date', performed_date,
    'next_date', next_date
  );
end;
$function$;

grant execute on function public.complete_scheduled_maintenance_from_work_order(uuid) to authenticated, service_role;
