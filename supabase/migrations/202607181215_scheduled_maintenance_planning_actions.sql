create or replace function public.ensure_scheduled_maintenance_management_permission(
  scheduled_maintenance_uuid uuid
)
returns public.mantenimientos_programados
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  scheduled_row public.mantenimientos_programados%rowtype;
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

  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if not public.can_manage_work_orders(scheduled_row.tenant_id) then
    raise exception 'Solo un responsable puede modificar la planificación';
  end if;

  if scheduled_row.estado in ('completado','cancelado','no_aplica') then
    raise exception 'La planificación cerrada es de solo lectura';
  end if;

  if scheduled_row.ot_id is not null then
    raise exception 'La planificación ya tiene una OT vinculada';
  end if;

  return scheduled_row;
end;
$function$;

grant execute on function public.ensure_scheduled_maintenance_management_permission(uuid) to authenticated, service_role;

create or replace function public.reschedule_scheduled_maintenance(
  scheduled_maintenance_uuid uuid,
  scheduled_date date,
  due_date date default null,
  reason_text text default null
)
returns public.mantenimientos_programados
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  scheduled_row public.mantenimientos_programados%rowtype;
  updated_row public.mantenimientos_programados%rowtype;
  warning_days integer := 30;
begin
  if scheduled_date is null then
    raise exception 'Indica la nueva fecha programada';
  end if;

  scheduled_row := public.ensure_scheduled_maintenance_management_permission(scheduled_maintenance_uuid);

  select coalesce(pm.dias_aviso, 30) into warning_days
  from public.planes_mantenimiento pm
  where pm.id = scheduled_row.plan_id
    and pm.deleted_at is null;

  update public.mantenimientos_programados
  set fecha_programada = scheduled_date,
      fecha_limite = coalesce(due_date, scheduled_date),
      estado = public.scheduled_maintenance_status_for_date(scheduled_date, coalesce(warning_days, 30)),
      updated_at = now()
  where id = scheduled_row.id
  returning * into updated_row;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    scheduled_row.tenant_id,
    'reschedule_scheduled_maintenance',
    'mantenimientos_programados',
    scheduled_row.id,
    auth.uid(),
    jsonb_build_object(
      'from_scheduled_date', scheduled_row.fecha_programada,
      'to_scheduled_date', scheduled_date,
      'from_due_date', scheduled_row.fecha_limite,
      'to_due_date', coalesce(due_date, scheduled_date),
      'reason', nullif(btrim(reason_text), '')
    )
  );

  return updated_row;
end;
$function$;

grant execute on function public.reschedule_scheduled_maintenance(uuid, date, date, text) to authenticated, service_role;

create or replace function public.cancel_scheduled_maintenance(
  scheduled_maintenance_uuid uuid,
  reason_text text
)
returns public.mantenimientos_programados
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  scheduled_row public.mantenimientos_programados%rowtype;
  updated_row public.mantenimientos_programados%rowtype;
begin
  if nullif(btrim(reason_text), '') is null then
    raise exception 'Indica el motivo de cancelación';
  end if;

  scheduled_row := public.ensure_scheduled_maintenance_management_permission(scheduled_maintenance_uuid);

  update public.mantenimientos_programados
  set estado = 'cancelado',
      cancelled_at = coalesce(cancelled_at, now()),
      motivo_cancelacion = btrim(reason_text),
      updated_at = now()
  where id = scheduled_row.id
  returning * into updated_row;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    scheduled_row.tenant_id,
    'cancel_scheduled_maintenance',
    'mantenimientos_programados',
    scheduled_row.id,
    auth.uid(),
    jsonb_build_object('reason', btrim(reason_text), 'from', scheduled_row.estado, 'to', 'cancelado')
  );

  return updated_row;
end;
$function$;

grant execute on function public.cancel_scheduled_maintenance(uuid, text) to authenticated, service_role;

create or replace function public.skip_scheduled_maintenance(
  scheduled_maintenance_uuid uuid,
  reason_text text
)
returns public.mantenimientos_programados
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  scheduled_row public.mantenimientos_programados%rowtype;
  plan_row public.planes_mantenimiento%rowtype;
  updated_row public.mantenimientos_programados%rowtype;
  next_plan_date date;
begin
  if nullif(btrim(reason_text), '') is null then
    raise exception 'Indica el motivo para marcar como no aplica';
  end if;

  scheduled_row := public.ensure_scheduled_maintenance_management_permission(scheduled_maintenance_uuid);

  if scheduled_row.plan_id is not null then
    select * into plan_row
    from public.planes_mantenimiento pm
    where pm.id = scheduled_row.plan_id
      and pm.deleted_at is null
    for update;

    if plan_row.id is not null then
      next_plan_date := public.add_plan_interval(
        coalesce(scheduled_row.fecha_programada, current_date),
        coalesce(plan_row.periodicidad_valor, 1),
        coalesce(plan_row.periodicidad_unidad, 'meses')
      );

      update public.planes_mantenimiento
      set fecha_proxima_realizacion = next_plan_date,
          updated_at = now()
      where id = plan_row.id;
    end if;
  end if;

  update public.mantenimientos_programados
  set estado = 'no_aplica',
      cancelled_at = coalesce(cancelled_at, now()),
      motivo_cancelacion = btrim(reason_text),
      updated_at = now()
  where id = scheduled_row.id
  returning * into updated_row;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    scheduled_row.tenant_id,
    'skip_scheduled_maintenance',
    'mantenimientos_programados',
    scheduled_row.id,
    auth.uid(),
    jsonb_build_object(
      'reason', btrim(reason_text),
      'from', scheduled_row.estado,
      'to', 'no_aplica',
      'plan_id', scheduled_row.plan_id,
      'next_plan_date', next_plan_date
    )
  );

  return updated_row;
end;
$function$;

grant execute on function public.skip_scheduled_maintenance(uuid, text) to authenticated, service_role;
