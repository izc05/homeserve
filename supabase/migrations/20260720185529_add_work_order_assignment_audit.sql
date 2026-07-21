-- Restaura la trazabilidad separada de creación y asignación que se perdió
-- al normalizar las RPC operativas. No cambia políticas RLS ni privilegios.

create or replace function public.log_audit(
  tenant_uuid uuid,
  action_text text,
  entity_type_text text,
  entity_uuid uuid,
  metadata_json jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if not public.has_tenant_access(tenant_uuid) then
    raise exception 'Sin acceso al tenant para auditoría';
  end if;

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
    tenant_uuid,
    auth.uid(),
    action_text,
    entity_type_text,
    entity_uuid,
    coalesce(metadata_json, '{}'::jsonb),
    clock_timestamp()
  );
end;
$function$;

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
    public.next_work_order_code(),
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

create or replace function public.assign_work_order(
  work_order_uuid uuid,
  technician_uuid uuid,
  planned_at_value timestamptz default null,
  reassignment_reason_text text default null
)
returns public.ordenes_trabajo
language plpgsql
security invoker
set search_path = public
as $function$
declare
  work_order_row public.ordenes_trabajo;
  updated_row public.ordenes_trabajo;
  previous_technician uuid;
  assigned_technician_name text;
  normalized_reason text := nullif(trim(reassignment_reason_text), '');
  assignment_changed boolean;
  planning_changed boolean;
  reason_changed boolean;
  audit_action text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select *
  into work_order_row
  from public.ordenes_trabajo
  where id = work_order_uuid
    and deleted_at is null
  for update;

  if work_order_row.id is null
    or not public.can_manage_work_orders(work_order_row.tenant_id) then
    raise exception 'No tienes permiso para asignar esta OT';
  end if;

  if work_order_row.estado not in ('BORRADOR', 'ASIGNADA') then
    raise exception 'La OT no puede reasignarse después de ser aceptada';
  end if;

  select nullif(trim(profile.nombre), '')
  into assigned_technician_name
  from public.tenant_members member
  join public.profiles profile on profile.id = member.user_id
  where member.tenant_id = work_order_row.tenant_id
    and member.user_id = technician_uuid
    and member.estado = 'activo'
    and member.role in ('tecnico', 'tecnico_externo');

  if not found then
    raise exception 'El técnico no está activo';
  end if;

  previous_technician := work_order_row.assigned_to;
  assignment_changed := previous_technician is distinct from technician_uuid
    or work_order_row.estado = 'BORRADOR';
  planning_changed := planned_at_value is not null
    and planned_at_value is distinct from work_order_row.fecha_prevista;
  reason_changed := normalized_reason is distinct from work_order_row.reassignment_reason;

  if not assignment_changed and not planning_changed and not reason_changed then
    return work_order_row;
  end if;

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set assigned_to = technician_uuid,
      assigned_by = case when assignment_changed then auth.uid() else assigned_by end,
      assigned_at = case when assignment_changed then clock_timestamp() else assigned_at end,
      reassignment_reason = case
        when assignment_changed or reason_changed then normalized_reason
        else reassignment_reason
      end,
      fecha_prevista = coalesce(planned_at_value, fecha_prevista),
      estado = 'ASIGNADA',
      updated_at = clock_timestamp()
  where id = work_order_uuid
  returning * into updated_row;

  audit_action := case
    when previous_technician is null or work_order_row.estado = 'BORRADOR' then 'assign_work_order'
    when previous_technician is distinct from technician_uuid then 'reassign_work_order'
    else 'update_work_order_assignment'
  end;

  perform public.log_audit(
    updated_row.tenant_id,
    audit_action,
    'ordenes_trabajo',
    updated_row.id,
    jsonb_build_object(
      'previous_assigned_to', previous_technician,
      'assigned_to', technician_uuid,
      'assigned_to_name', coalesce(assigned_technician_name, 'Técnico sin nombre'),
      'assigned_by', auth.uid(),
      'assigned_at', updated_row.assigned_at,
      'estado_anterior', work_order_row.estado,
      'estado_nuevo', updated_row.estado,
      'fecha_prevista_anterior', work_order_row.fecha_prevista,
      'fecha_prevista', updated_row.fecha_prevista,
      'reason', normalized_reason
    )
  );

  return updated_row;
end;
$function$;

revoke all on function public.create_work_order(
  uuid, uuid, text, text, text, text, uuid, uuid, uuid,
  timestamptz, timestamptz, integer, text, text, text, jsonb
) from public, anon;
revoke all on function public.assign_work_order(uuid, uuid, timestamptz, text)
  from public, anon;

grant execute on function public.create_work_order(
  uuid, uuid, text, text, text, text, uuid, uuid, uuid,
  timestamptz, timestamptz, integer, text, text, text, jsonb
) to authenticated;
grant execute on function public.assign_work_order(uuid, uuid, timestamptz, text)
  to authenticated;
