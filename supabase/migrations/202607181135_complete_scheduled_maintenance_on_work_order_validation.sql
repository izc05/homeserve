create or replace function public.add_plan_interval(base_date date, amount integer, unit_text text)
returns date
language sql
immutable
set search_path to 'public'
as $function$
  select case lower(coalesce(nullif(btrim(unit_text), ''), 'mes'))
    when 'dia' then base_date + make_interval(days => greatest(coalesce(amount, 1), 1))
    when 'dias' then base_date + make_interval(days => greatest(coalesce(amount, 1), 1))
    when 'día' then base_date + make_interval(days => greatest(coalesce(amount, 1), 1))
    when 'días' then base_date + make_interval(days => greatest(coalesce(amount, 1), 1))
    when 'semana' then base_date + make_interval(days => greatest(coalesce(amount, 1), 1) * 7)
    when 'semanas' then base_date + make_interval(days => greatest(coalesce(amount, 1), 1) * 7)
    when 'mes' then base_date + make_interval(months => greatest(coalesce(amount, 1), 1))
    when 'meses' then base_date + make_interval(months => greatest(coalesce(amount, 1), 1))
    when 'año' then base_date + make_interval(years => greatest(coalesce(amount, 1), 1))
    when 'años' then base_date + make_interval(years => greatest(coalesce(amount, 1), 1))
    when 'ano' then base_date + make_interval(years => greatest(coalesce(amount, 1), 1))
    when 'anos' then base_date + make_interval(years => greatest(coalesce(amount, 1), 1))
    else base_date + make_interval(months => greatest(coalesce(amount, 1), 1))
  end;
$function$;

grant execute on function public.add_plan_interval(date, integer, text) to authenticated, service_role;

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
begin
  if work_order_uuid is null then
    raise exception 'No se ha indicado la OT a cerrar contra planificación';
  end if;

  select * into order_row
  from public.ordenes_trabajo ot
  where ot.id = work_order_uuid
    and ot.deleted_at is null;

  if order_row.id is null then
    raise exception 'La OT no existe o está eliminada';
  end if;

  if not public.can_access_work_order(work_order_uuid, 'select') then
    raise exception 'No tienes permisos para cerrar la planificación de esta OT';
  end if;

  select * into scheduled_row
  from public.mantenimientos_programados mp
  where mp.ot_id = work_order_uuid
    and mp.deleted_at is null
  order by mp.created_at desc
  limit 1
  for update;

  if scheduled_row.id is null then
    return jsonb_build_object('linked', false, 'work_order_id', work_order_uuid);
  end if;

  performed_date := coalesce(order_row.fecha_fin::date, order_row.closed_at::date, now()::date);

  if scheduled_row.plan_id is not null then
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

  update public.mantenimientos_programados
  set estado = 'completado',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where id = scheduled_row.id;

  update public.activos
  set fecha_ultima_revision = performed_date,
      fecha_proxima_revision = coalesce(next_date, fecha_proxima_revision),
      updated_at = now()
  where id = scheduled_row.activo_id
    and tenant_id = scheduled_row.tenant_id
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
      scheduled_row.tenant_id,
      scheduled_row.activo_id,
      performed_date,
      coalesce(scheduled_row.tipo, order_row.tipo),
      coalesce(order_row.titulo, scheduled_row.titulo),
      order_row.descripcion,
      order_row.assigned_to,
      'mantenimiento_validado',
      case when next_date is null then null else 'Próxima revisión: ' || next_date::text end,
      auth.uid(),
      scheduled_row.plan_id,
      scheduled_row.id,
      order_row.id,
      'ot_validada',
      order_row.fecha_inicio,
      coalesce(order_row.fecha_fin, order_row.closed_at),
      scheduled_row.descripcion,
      coalesce(order_row.trabajo_solicitado, order_row.descripcion),
      'validada',
      'correcto',
      next_date,
      'Histórico generado automáticamente al validar la OT.'
    )
    returning id into history_id;
  end if;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    scheduled_row.tenant_id,
    'complete_scheduled_maintenance_from_work_order',
    'mantenimientos_programados',
    scheduled_row.id,
    auth.uid(),
    jsonb_build_object(
      'work_order_id', order_row.id,
      'history_id', history_id,
      'plan_id', scheduled_row.plan_id,
      'asset_id', scheduled_row.activo_id,
      'performed_date', performed_date,
      'next_date', next_date
    )
  );

  return jsonb_build_object(
    'linked', true,
    'work_order_id', order_row.id,
    'scheduled_maintenance_id', scheduled_row.id,
    'plan_id', scheduled_row.plan_id,
    'asset_id', scheduled_row.activo_id,
    'history_id', history_id,
    'performed_date', performed_date,
    'next_date', next_date
  );
end;
$function$;

grant execute on function public.complete_scheduled_maintenance_from_work_order(uuid) to authenticated, service_role;

create or replace function public.review_work_order(work_order_uuid uuid, decision_text text, notes_text text)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  order_row public.ordenes_trabajo%rowtype;
  updated_row public.ordenes_trabajo%rowtype;
  next_status text;
  planning_result jsonb;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if decision_text not in ('validada','correccion_solicitada') then raise exception 'Decisión de revisión no válida'; end if;
  if nullif(trim(notes_text),'') is null then raise exception 'Escribe una nota de revisión'; end if;

  select * into order_row from public.ordenes_trabajo where id=work_order_uuid and deleted_at is null for update;
  if order_row.id is null or not public.can_manage_work_orders(order_row.tenant_id) then raise exception 'Solo un responsable puede revisar la OT'; end if;
  if order_row.estado<>'FINALIZADA' then raise exception 'Solo se puede revisar una OT finalizada'; end if;

  next_status:=case when decision_text='validada' then 'VALIDADA' else 'EN_CURSO' end;

  update public.ordenes_trabajo
  set estado=next_status,
      revision_admin_estado=decision_text,
      revision_admin_by=auth.uid(),
      revision_admin_at=now(),
      revision_admin_notas=trim(notes_text),
      closed_by=case when decision_text='validada' then auth.uid() else null end,
      closed_at=case when decision_text='validada' then now() else null end,
      reopened_by=case when decision_text='correccion_solicitada' then auth.uid() else reopened_by end,
      reopened_at=case when decision_text='correccion_solicitada' then now() else reopened_at end,
      reopen_reason=case when decision_text='correccion_solicitada' then trim(notes_text) else reopen_reason end,
      fecha_fin=case when decision_text='correccion_solicitada' then null else coalesce(fecha_fin,now()) end,
      updated_at=now()
  where id=order_row.id
  returning * into updated_row;

  insert into public.ot_revisiones_admin(tenant_id,ot_id,reviewer_id,decision,notas,estado_anterior,estado_nuevo)
  values(order_row.tenant_id,order_row.id,auth.uid(),decision_text,trim(notes_text),order_row.estado,next_status);

  if decision_text = 'validada' then
    planning_result := public.complete_scheduled_maintenance_from_work_order(order_row.id);
  else
    planning_result := jsonb_build_object('linked', false, 'correction_requested', true);
  end if;

  insert into public.audit_logs(tenant_id,user_id,action,entity_type,entity_id,metadata)
  values(
    order_row.tenant_id,
    auth.uid(),
    case when decision_text='validada' then 'validate_work_order' else 'request_work_order_corrections' end,
    'orden_trabajo',
    order_row.id,
    jsonb_build_object('notes',trim(notes_text),'from',order_row.estado,'to',next_status,'planning',planning_result)
  );

  return updated_row;
end;
$function$;

grant execute on function public.review_work_order(uuid, text, text) to authenticated, service_role;
