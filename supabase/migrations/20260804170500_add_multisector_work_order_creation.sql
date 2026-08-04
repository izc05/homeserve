create or replace function public.create_work_order_v2(
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
  requirements_json jsonb default '{}'::jsonb,
  system_uuid uuid default null,
  specialty_key_text text default 'general'
)
returns public.ordenes_trabajo
language plpgsql
set search_path to 'public'
as $function$
declare
  created_row public.ordenes_trabajo;
  installation_row public.instalaciones;
  asset_row public.activos;
  system_row public.sistemas_instalacion;
  normalized_requirements jsonb;
  normalized_system_id uuid := system_uuid;
  normalized_specialty text := coalesce(nullif(trim(specialty_key_text), ''), 'general');
  assigned_technician_name text;
begin
  if auth.uid() is null or not public.can_manage_work_orders(tenant_uuid) then
    raise exception 'No tienes permiso para crear OT';
  end if;

  if nullif(trim(title_text), '') is null or char_length(trim(title_text)) < 3 then
    raise exception 'El título debe tener al menos 3 caracteres';
  end if;

  if work_order_type_text not in (
    'averia', 'mantenimiento_preventivo', 'mantenimiento_correctivo',
    'revision', 'inspeccion', 'instalacion', 'sustitucion',
    'medicion', 'urgencia', 'otro'
  ) then
    raise exception 'Tipo de OT no válido';
  end if;

  if priority_text not in ('baja', 'normal', 'alta', 'urgente', 'critica') then
    raise exception 'Prioridad no válida';
  end if;

  if due_at_value is not null and planned_at_value is not null and due_at_value < planned_at_value then
    raise exception 'La fecha límite no puede ser anterior a la prevista';
  end if;

  select * into installation_row
  from public.instalaciones
  where id = installation_uuid and tenant_id = tenant_uuid and deleted_at is null;

  if installation_row.id is null then
    raise exception 'La instalación no pertenece al tenant';
  end if;

  if location_uuid is not null and not exists (
    select 1 from public.ubicaciones
    where id = location_uuid
      and tenant_id = tenant_uuid
      and instalacion_id = installation_uuid
      and deleted_at is null
  ) then
    raise exception 'La ubicación no pertenece a la instalación';
  end if;

  if asset_uuid is not null then
    select * into asset_row
    from public.activos
    where id = asset_uuid
      and tenant_id = tenant_uuid
      and instalacion_id = installation_uuid
      and deleted_at is null;

    if asset_row.id is null then
      raise exception 'El activo no pertenece a la instalación';
    end if;

    if normalized_system_id is null and asset_row.sistema_id is not null then
      normalized_system_id := asset_row.sistema_id;
    elsif normalized_system_id is not null
      and asset_row.sistema_id is not null
      and asset_row.sistema_id is distinct from normalized_system_id then
      raise exception 'El activo no pertenece al sistema técnico seleccionado';
    end if;
  end if;

  if normalized_system_id is not null then
    select * into system_row
    from public.sistemas_instalacion
    where id = normalized_system_id
      and tenant_id = tenant_uuid
      and instalacion_id = installation_uuid
      and deleted_at is null
      and estado <> 'inactivo';

    if system_row.id is null then
      raise exception 'El sistema técnico no pertenece a la instalación';
    end if;

    normalized_specialty := system_row.especialidad_clave;
  elsif not exists (
    select 1 from public.especialidades_tecnicas
    where clave = normalized_specialty and estado = 'activo'
  ) then
    raise exception 'La especialidad técnica no es válida';
  end if;

  if technician_uuid is not null then
    select nullif(trim(profile.nombre), '') into assigned_technician_name
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
    tenant_id, cliente_id, codigo_ot, instalacion_id, ubicacion_id, activo_id,
    sistema_id, especialidad_clave, titulo, descripcion, tipo, tipo_ot,
    prioridad, estado, assigned_to, assigned_by, assigned_at, fecha_prevista,
    fecha_limite, tiempo_estimado_min, duracion_estimada_minutos,
    instrucciones_tecnico, riesgos_precauciones, resultado_esperado,
    configuracion, revision_admin_estado, created_by
  ) values (
    tenant_uuid, installation_row.cliente_id, private.next_work_order_code_internal(),
    installation_uuid, location_uuid, asset_uuid, normalized_system_id,
    normalized_specialty, trim(title_text), nullif(trim(description_text), ''),
    work_order_type_text, work_order_type_text, priority_text,
    case when technician_uuid is null then 'BORRADOR' else 'ASIGNADA' end,
    technician_uuid,
    case when technician_uuid is null then null else auth.uid() end,
    case when technician_uuid is null then null else clock_timestamp() end,
    planned_at_value, due_at_value, estimated_minutes_value,
    estimated_minutes_value, nullif(trim(instructions_text), ''),
    nullif(trim(safety_notes_text), ''), nullif(trim(expected_result_text), ''),
    normalized_requirements,
    case when (normalized_requirements->>'requiere_revision_admin')::boolean
      then 'pendiente' else 'no_requerida' end,
    auth.uid()
  ) returning * into created_row;

  perform public.log_audit(
    tenant_uuid,
    'create_work_order',
    'ordenes_trabajo',
    created_row.id,
    jsonb_build_object(
      'codigo_ot', created_row.codigo_ot,
      'estado_anterior', null,
      'estado_nuevo', created_row.estado,
      'instalacion_id', created_row.instalacion_id,
      'sistema_id', created_row.sistema_id,
      'especialidad_clave', created_row.especialidad_clave
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
        'fecha_prevista', created_row.fecha_prevista,
        'especialidad_clave', created_row.especialidad_clave
      )
    );
  end if;

  return created_row;
end;
$function$;

revoke all on function public.create_work_order_v2(
  uuid, uuid, text, text, text, text, uuid, uuid, uuid,
  timestamptz, timestamptz, integer, text, text, text, jsonb, uuid, text
) from public, anon;

grant execute on function public.create_work_order_v2(
  uuid, uuid, text, text, text, text, uuid, uuid, uuid,
  timestamptz, timestamptz, integer, text, text, text, jsonb, uuid, text
) to authenticated;
