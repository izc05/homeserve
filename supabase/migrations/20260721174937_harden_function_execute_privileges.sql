-- Aísla la generación global de códigos fuera de los esquemas expuestos por
-- PostgREST. create_work_order permanece SECURITY INVOKER y solo cambia la
-- función a la que delega la numeración.

create schema if not exists private authorization postgres;
alter schema private owner to postgres;

revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;

create or replace function private.next_work_order_code_internal()
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  current_year text := to_char(now(), 'YYYY');
  next_number integer;
begin
  perform pg_advisory_xact_lock(
    hashtext('public.next_work_order_code.' || current_year)
  );

  select coalesce(
    max(
      substring(
        codigo_ot
        from ('^OT-' || current_year || '-([0-9]+)$')
      )::integer
    ),
    0
  ) + 1
  into next_number
  from public.ordenes_trabajo
  where codigo_ot ~ ('^OT-' || current_year || '-[0-9]+$');

  return 'OT-' || current_year || '-' || lpad(next_number::text, 5, '0');
end;
$function$;

alter function private.next_work_order_code_internal() owner to postgres;

revoke execute on function private.next_work_order_code_internal()
  from public, anon, authenticated, service_role;
grant execute on function private.next_work_order_code_internal()
  to authenticated;

create or replace function public.create_work_order(
  tenant_uuid uuid,
  installation_uuid uuid,
  title_text text,
  description_text text default null,
  work_order_type_text text default 'mantenimiento_preventivo',
  priority_text text default 'normal',
  location_uuid uuid default null,
  asset_uuid uuid default null,
  technician_uuid uuid default null,
  planned_at_value timestamptz default null,
  due_at_value timestamptz default null,
  estimated_minutes_value integer default null,
  instructions_text text default null,
  safety_notes_text text default null,
  expected_result_text text default null,
  requirements_json jsonb default '{}'::jsonb
)
returns public.ordenes_trabajo
language plpgsql
security invoker
set search_path = public
as $function$
declare
  created_row public.ordenes_trabajo;
  installation_row public.instalaciones;
  normalized_requirements jsonb;
  assigned_technician_name text;
begin
  if auth.uid() is null or not public.can_manage_work_orders(tenant_uuid) then
    raise exception 'No tienes permiso para crear OT';
  end if;

  if nullif(trim(title_text), '') is null or char_length(trim(title_text)) < 3 then
    raise exception 'El título debe tener al menos 3 caracteres';
  end if;

  if work_order_type_text not in (
    'averia',
    'mantenimiento_preventivo',
    'mantenimiento_correctivo',
    'revision',
    'inspeccion',
    'instalacion',
    'sustitucion',
    'medicion',
    'urgencia',
    'otro'
  ) then
    raise exception 'Tipo de OT no válido';
  end if;

  if priority_text not in ('baja', 'normal', 'alta', 'urgente', 'critica') then
    raise exception 'Prioridad no válida';
  end if;

  if due_at_value is not null
    and planned_at_value is not null
    and due_at_value < planned_at_value then
    raise exception 'La fecha límite no puede ser anterior a la prevista';
  end if;

  select *
  into installation_row
  from public.instalaciones
  where id = installation_uuid
    and tenant_id = tenant_uuid
    and deleted_at is null;

  if installation_row.id is null then
    raise exception 'La instalación no pertenece al tenant';
  end if;

  if location_uuid is not null and not exists (
    select 1
    from public.ubicaciones
    where id = location_uuid
      and tenant_id = tenant_uuid
      and instalacion_id = installation_uuid
      and deleted_at is null
  ) then
    raise exception 'La ubicación no pertenece a la instalación';
  end if;

  if asset_uuid is not null and not exists (
    select 1
    from public.activos
    where id = asset_uuid
      and tenant_id = tenant_uuid
      and instalacion_id = installation_uuid
      and deleted_at is null
  ) then
    raise exception 'El activo no pertenece a la instalación';
  end if;

  if technician_uuid is not null then
    select nullif(trim(profile.nombre), '')
    into assigned_technician_name
    from public.tenant_members member
    join public.profiles profile on profile.id = member.user_id
    where member.tenant_id = tenant_uuid
      and member.user_id = technician_uuid
      and member.estado = 'activo'
      and member.role in ('tecnico', 'tecnico_externo');

    if not found then
      raise exception 'El técnico no está activo en este tenant';
    end if;
  end if;

  normalized_requirements := jsonb_build_object(
    'requiere_checklist', coalesce((requirements_json->>'requiere_checklist')::boolean, true),
    'requiere_fotos_iniciales', coalesce((requirements_json->>'requiere_fotos_iniciales')::boolean, false),
    'requiere_fotos_finales', coalesce((requirements_json->>'requiere_fotos_finales')::boolean, true),
    'requiere_mediciones', coalesce((requirements_json->>'requiere_mediciones')::boolean, false),
    'requiere_materiales', coalesce((requirements_json->>'requiere_materiales')::boolean, false),
    'requiere_firma_tecnico', coalesce((requirements_json->>'requiere_firma_tecnico')::boolean, true),
    'requiere_firma_cliente', coalesce((requirements_json->>'requiere_firma_cliente')::boolean, false),
    'requiere_prueba_funcional', coalesce((requirements_json->>'requiere_prueba_funcional')::boolean, false),
    'requiere_informe', coalesce((requirements_json->>'requiere_informe')::boolean, true),
    'requiere_revision_admin', coalesce((requirements_json->>'requiere_revision_admin')::boolean, true)
  );

  insert into public.ordenes_trabajo (
    tenant_id,
    cliente_id,
    codigo_ot,
    instalacion_id,
    ubicacion_id,
    activo_id,
    titulo,
    descripcion,
    tipo,
    tipo_ot,
    prioridad,
    estado,
    assigned_to,
    assigned_by,
    assigned_at,
    fecha_prevista,
    fecha_limite,
    tiempo_estimado_min,
    duracion_estimada_minutos,
    instrucciones_tecnico,
    riesgos_precauciones,
    resultado_esperado,
    configuracion,
    revision_admin_estado,
    created_by
  )
  values (
    tenant_uuid,
    installation_row.cliente_id,
    private.next_work_order_code_internal(),
    installation_uuid,
    location_uuid,
    asset_uuid,
    trim(title_text),
    nullif(trim(description_text), ''),
    work_order_type_text,
    work_order_type_text,
    priority_text,
    case when technician_uuid is null then 'BORRADOR' else 'ASIGNADA' end,
    technician_uuid,
    case when technician_uuid is null then null else auth.uid() end,
    case when technician_uuid is null then null else clock_timestamp() end,
    planned_at_value,
    due_at_value,
    estimated_minutes_value,
    estimated_minutes_value,
    nullif(trim(instructions_text), ''),
    nullif(trim(safety_notes_text), ''),
    nullif(trim(expected_result_text), ''),
    normalized_requirements,
    case
      when (normalized_requirements->>'requiere_revision_admin')::boolean then 'pendiente'
      else 'no_requerida'
    end,
    auth.uid()
  )
  returning * into created_row;

  perform public.log_audit(
    tenant_uuid,
    'create_work_order',
    'ordenes_trabajo',
    created_row.id,
    jsonb_build_object(
      'codigo_ot', created_row.codigo_ot,
      'estado_anterior', null,
      'estado_nuevo', created_row.estado,
      'instalacion_id', created_row.instalacion_id
    )
  );

  if technician_uuid is not null then
    perform public.log_audit(
      tenant_uuid,
      'assign_work_order',
      'ordenes_trabajo',
      created_row.id,
      jsonb_build_object(
        'previous_assigned_to', null,
        'assigned_to', technician_uuid,
        'assigned_to_name', coalesce(assigned_technician_name, 'Técnico sin nombre'),
        'assigned_by', auth.uid(),
        'assigned_at', created_row.assigned_at,
        'estado_anterior', 'BORRADOR',
        'estado_nuevo', 'ASIGNADA',
        'fecha_prevista', created_row.fecha_prevista
      )
    );
  end if;

  return created_row;
end;
$function$;

-- Matriz ACL explícita de las 44 funciones públicas creadas por las
-- migraciones. Se revoca primero toda exposición y después se conceden solo
-- las RPC y dependencias comprobadas.

revoke execute on function public.accept_tenant_invitation(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.accept_work_order(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.add_plan_interval(date, integer, text) from public, anon, authenticated, service_role;
revoke execute on function public.assign_work_order(uuid, uuid, timestamptz, text) from public, anon, authenticated, service_role;
revoke execute on function public.audit_work_order_evidence_insert() from public, anon, authenticated, service_role;
revoke execute on function public.block_work_order(uuid, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.can_access_work_order_storage(text, text, boolean) from public, anon, authenticated, service_role;
revoke execute on function public.can_access_work_order(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.can_execute_work_order(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.can_manage_work_orders(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.cancel_scheduled_maintenance(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.complete_scheduled_maintenance_from_work_order(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.create_tenant_invitation_with_details(uuid, text, text, boolean, text, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.create_tenant_invitation(uuid, text, text, boolean, text) from public, anon, authenticated, service_role;
revoke execute on function public.create_work_order_from_scheduled_maintenance(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.create_work_order(uuid, uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, timestamptz, integer, text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.enforce_work_order_management_transition() from public, anon, authenticated, service_role;
revoke execute on function public.ensure_scheduled_maintenance_management_permission(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.ensure_work_order_default_checklist(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.ensure_work_order_lifecycle_permission(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.finalize_active_work_order_visit(uuid, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.finalize_work_order_visit(uuid, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.generate_due_scheduled_maintenances(uuid, integer) from public, anon, authenticated, service_role;
revoke execute on function public.guard_official_work_order_update() from public, anon, authenticated, service_role;
revoke execute on function public.guard_work_order_update() from public, anon, authenticated, service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;
revoke execute on function public.has_tenant_access(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.has_tenant_role(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.is_super_admin() from public, anon, authenticated, service_role;
revoke execute on function public.is_work_order_mutable(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.log_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.next_work_order_code() from public, anon, authenticated, service_role;
revoke execute on function public.normalize_scheduled_maintenance_ot_type(text) from public, anon, authenticated, service_role;
revoke execute on function public.normalize_scheduled_maintenance_priority(text) from public, anon, authenticated, service_role;
revoke execute on function public.register_work_order_report(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.require_work_order_actor(uuid, boolean) from public, anon, authenticated, service_role;
revoke execute on function public.reschedule_scheduled_maintenance(uuid, date, date, text) from public, anon, authenticated, service_role;
revoke execute on function public.resume_work_order(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.review_work_order(uuid, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.scheduled_maintenance_status_for_date(date, integer) from public, anon, authenticated, service_role;
revoke execute on function public.set_updated_at() from public, anon, authenticated, service_role;
revoke execute on function public.skip_scheduled_maintenance(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.soft_delete_work_order(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.start_work_order_visit(uuid) from public, anon, authenticated, service_role;

-- RPC directas utilizadas por el frontend autenticado.
grant execute on function public.accept_tenant_invitation(uuid) to authenticated;
grant execute on function public.accept_work_order(uuid) to authenticated;
grant execute on function public.assign_work_order(uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.block_work_order(uuid, text, text) to authenticated;
grant execute on function public.cancel_scheduled_maintenance(uuid, text) to authenticated;
grant execute on function public.create_tenant_invitation_with_details(uuid, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.create_tenant_invitation(uuid, text, text, boolean, text) to authenticated;
grant execute on function public.create_work_order_from_scheduled_maintenance(uuid, uuid) to authenticated;
grant execute on function public.create_work_order(uuid, uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, timestamptz, integer, text, text, text, jsonb) to authenticated;
grant execute on function public.ensure_work_order_default_checklist(uuid) to authenticated;
grant execute on function public.finalize_active_work_order_visit(uuid, jsonb) to authenticated;
grant execute on function public.finalize_work_order_visit(uuid, jsonb) to authenticated;
grant execute on function public.generate_due_scheduled_maintenances(uuid, integer) to authenticated;
grant execute on function public.register_work_order_report(uuid, text) to authenticated;
grant execute on function public.reschedule_scheduled_maintenance(uuid, date, date, text) to authenticated;
grant execute on function public.resume_work_order(uuid) to authenticated;
grant execute on function public.review_work_order(uuid, text, text) to authenticated;
grant execute on function public.skip_scheduled_maintenance(uuid, text) to authenticated;
grant execute on function public.soft_delete_work_order(uuid, text) to authenticated;
grant execute on function public.start_work_order_visit(uuid) to authenticated;

-- Helpers llamados directamente por políticas RLS o Storage.
grant execute on function public.can_access_work_order_storage(text, text, boolean) to authenticated;
grant execute on function public.can_access_work_order(uuid, text) to authenticated;
grant execute on function public.can_execute_work_order(uuid, uuid) to authenticated;
grant execute on function public.can_manage_work_orders(uuid) to authenticated;
grant execute on function public.has_tenant_access(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, text) to authenticated;
grant execute on function public.is_work_order_mutable(uuid) to authenticated;

-- create_work_order y assign_work_order son SECURITY INVOKER; su actor necesita
-- ejecutar log_audit para conservar la trazabilidad existente.
grant execute on function public.log_audit(uuid, text, text, uuid, jsonb) to authenticated;
