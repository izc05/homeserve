create or replace function public.scheduled_maintenance_status_for_date(
  scheduled_date date,
  warning_days integer default 30
)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when scheduled_date < current_date then 'vencido'
    when scheduled_date <= current_date + make_interval(days => greatest(coalesce(warning_days, 30), 0)) then 'proximo'
    else 'programado'
  end;
$function$;

grant execute on function public.scheduled_maintenance_status_for_date(date, integer) to authenticated, service_role;

create or replace function public.generate_due_scheduled_maintenances(
  tenant_uuid uuid,
  horizon_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  plan_row public.planes_mantenimiento;
  target_date date;
  due_date date;
  generated_count integer := 0;
  skipped_count integer := 0;
  generated_ids uuid[] := '{}';
  created_row public.mantenimientos_programados;
begin
  if tenant_uuid is null then
    raise exception 'Selecciona una organización para generar planificación';
  end if;

  if not public.can_manage_work_orders(tenant_uuid) then
    raise exception 'No tienes permisos para generar planificación preventiva';
  end if;

  for plan_row in
    select *
    from public.planes_mantenimiento pm
    where pm.tenant_id = tenant_uuid
      and pm.deleted_at is null
      and coalesce(pm.activo, true) = true
      and coalesce(pm.periodicidad_unidad, 'meses') <> 'manual'
      and coalesce(pm.periodicidad_unidad, 'meses') not in ('horas','ciclos')
      and coalesce(pm.fecha_proxima_realizacion, pm.fecha_inicio, current_date) <= current_date + make_interval(days => greatest(coalesce(horizon_days, 30), 0))
    order by coalesce(pm.fecha_proxima_realizacion, pm.fecha_inicio, current_date), pm.created_at
    for update
  loop
    target_date := coalesce(plan_row.fecha_proxima_realizacion, plan_row.fecha_inicio, current_date);
    due_date := target_date + make_interval(days => greatest(coalesce(plan_row.tolerancia_dias, 0), 0));

    if exists (
      select 1
      from public.mantenimientos_programados mp
      where mp.plan_id = plan_row.id
        and mp.deleted_at is null
        and mp.fecha_programada = target_date
        and mp.estado not in ('cancelado','no_aplica')
    ) then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    insert into public.mantenimientos_programados (
      tenant_id,
      plan_id,
      instalacion_id,
      ubicacion_id,
      activo_id,
      titulo,
      descripcion,
      tipo,
      estado,
      prioridad,
      fecha_programada,
      fecha_limite,
      assigned_to,
      origen,
      created_by
    ) values (
      plan_row.tenant_id,
      plan_row.id,
      plan_row.instalacion_id,
      plan_row.ubicacion_id,
      plan_row.activo_id,
      plan_row.nombre,
      coalesce(plan_row.descripcion, plan_row.instrucciones),
      plan_row.tipo,
      public.scheduled_maintenance_status_for_date(target_date, coalesce(plan_row.dias_aviso, 30)),
      coalesce(plan_row.prioridad, 'normal'),
      target_date,
      due_date,
      plan_row.responsable_id,
      'plan',
      auth.uid()
    )
    returning * into created_row;

    generated_count := generated_count + 1;
    generated_ids := array_append(generated_ids, created_row.id);
  end loop;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    tenant_uuid,
    'generate_due_scheduled_maintenances',
    'planes_mantenimiento',
    tenant_uuid,
    auth.uid(),
    jsonb_build_object(
      'horizon_days', greatest(coalesce(horizon_days, 30), 0),
      'generated_count', generated_count,
      'skipped_count', skipped_count,
      'generated_ids', generated_ids
    )
  );

  return jsonb_build_object(
    'tenant_id', tenant_uuid,
    'horizon_days', greatest(coalesce(horizon_days, 30), 0),
    'generated_count', generated_count,
    'skipped_count', skipped_count,
    'generated_ids', generated_ids
  );
end;
$function$;

grant execute on function public.generate_due_scheduled_maintenances(uuid, integer) to authenticated, service_role;
