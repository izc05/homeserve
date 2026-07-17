-- Creación y asignación transaccional de órdenes de trabajo.
-- Migración aditiva y compatible con el esquema heredado de isivolpro-activos.

begin;

-- Secuencia global para mantener codigo_ot único con el constraint heredado actual.
do $migration$
declare
  existing_max bigint;
begin
  if to_regclass('public.work_order_code_seq') is null then
    execute 'create sequence public.work_order_code_seq as bigint start with 1 increment by 1 no minvalue no maxvalue cache 1';

    select max((regexp_match(codigo_ot, '^OT-[0-9]{4}-([0-9]+)$'))[1]::bigint)
      into existing_max
    from public.ordenes_trabajo
    where codigo_ot ~ '^OT-[0-9]{4}-[0-9]+$';

    if existing_max is null then
      perform setval('public.work_order_code_seq'::regclass, 1, false);
    else
      perform setval('public.work_order_code_seq'::regclass, existing_max, true);
    end if;
  end if;
end;
$migration$;

revoke all on sequence public.work_order_code_seq from public, anon;
grant usage on sequence public.work_order_code_seq to authenticated;

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
set search_path = ''
as $function$
declare
  created_order public.ordenes_trabajo%rowtype;
  normalized_title text := nullif(trim(title_text), '');
  normalized_type text := lower(trim(coalesce(work_order_type_text, '')));
  normalized_priority text := lower(trim(coalesce(priority_text, '')));
  normalized_requirements jsonb;
  generated_code text;
  initial_status text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if not public.can_manage_work_orders(tenant_uuid) then
    raise exception 'No tienes permiso para crear OT en esta organización';
  end if;

  if normalized_title is null or char_length(normalized_title) < 3 then
    raise exception 'El título debe tener al menos 3 caracteres';
  end if;

  if char_length(normalized_title) > 180 then
    raise exception 'El título no puede superar 180 caracteres';
  end if;

  if description_text is not null and char_length(description_text) > 8000 then
    raise exception 'La descripción es demasiado larga';
  end if;

  if normalized_type not in (
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

  if normalized_priority not in ('baja', 'normal', 'alta', 'urgente', 'critica') then
    raise exception 'Prioridad no válida';
  end if;

  if estimated_minutes_value is not null
     and (estimated_minutes_value < 1 or estimated_minutes_value > 43200) then
    raise exception 'La duración estimada debe estar entre 1 y 43200 minutos';
  end if;

  if planned_at_value is not null
     and due_at_value is not null
     and due_at_value < planned_at_value then
    raise exception 'La fecha límite no puede ser anterior a la fecha planificada';
  end if;

  if not exists (
    select 1
    from public.instalaciones installation
    where installation.id = installation_uuid
      and installation.tenant_id = tenant_uuid
      and installation.deleted_at is null
  ) then
    raise exception 'La instalación no pertenece a la organización activa';
  end if;

  if location_uuid is not null and not exists (
    select 1
    from public.ubicaciones location
    where location.id = location_uuid
      and location.tenant_id = tenant_uuid
      and location.instalacion_id = installation_uuid
      and location.deleted_at is null
  ) then
    raise exception 'La ubicación no pertenece a la instalación seleccionada';
  end if;

  if asset_uuid is not null and not exists (
    select 1
    from public.activos asset
    where asset.id = asset_uuid
      and asset.tenant_id = tenant_uuid
      and asset.instalacion_id = installation_uuid
      and asset.deleted_at is null
      and (
        location_uuid is null
        or asset.ubicacion_id is null
        or asset.ubicacion_id = location_uuid
      )
  ) then
    raise exception 'El activo no pertenece al contexto seleccionado';
  end if;

  if technician_uuid is not null and not exists (
    select 1
    from public.tenant_members member
    where member.tenant_id = tenant_uuid
      and member.user_id = technician_uuid
      and member.estado = 'activo'
      and member.role in ('tecnico', 'tecnico_externo')
  ) then
    raise exception 'La OT solo puede asignarse a un técnico activo';
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

  generated_code := format(
    'OT-%s-%s',
    to_char(timezone('UTC', now()), 'YYYY'),
    lpad(nextval('public.work_order_code_seq'::regclass)::text, 6, '0')
  );

  initial_status := case when technician_uuid is null then 'BORRADOR' else 'ASIGNADA' end;

  insert into public.ordenes_trabajo (
    tenant_id,
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
    created_by,
    created_at,
    updated_at
  )
  values (
    tenant_uuid,
    generated_code,
    installation_uuid,
    location_uuid,
    asset_uuid,
    normalized_title,
    nullif(trim(description_text), ''),
    normalized_type,
    normalized_type,
    normalized_priority,
    initial_status,
    technician_uuid,
    case when technician_uuid is null then null else auth.uid() end,
    case when technician_uuid is null then null else now() end,
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
    auth.uid(),
    now(),
    now()
  )
  returning * into created_order;

  perform public.log_audit(
    tenant_uuid,
    'create_work_order',
    'orden_trabajo',
    created_order.id,
    jsonb_build_object(
      'code', created_order.codigo_ot,
      'status', created_order.estado,
      'installation_id', created_order.instalacion_id,
      'location_id', created_order.ubicacion_id,
      'asset_id', created_order.activo_id
    )
  );

  if technician_uuid is not null then
    perform public.log_audit(
      tenant_uuid,
      'assign_work_order',
      'orden_trabajo',
      created_order.id,
      jsonb_build_object(
        'assigned_to', technician_uuid,
        'planned_at', planned_at_value,
        'from_status', 'BORRADOR',
        'to_status', 'ASIGNADA'
      )
    );
  end if;

  return created_order;
end;
$function$;

revoke execute on function public.create_work_order(
  uuid, uuid, text, text, text, text, uuid, uuid, uuid,
  timestamptz, timestamptz, integer, text, text, text, jsonb
) from public, anon;

grant execute on function public.create_work_order(
  uuid, uuid, text, text, text, text, uuid, uuid, uuid,
  timestamptz, timestamptz, integer, text, text, text, jsonb
) to authenticated;

create or replace function public.assign_work_order(
  work_order_uuid uuid,
  technician_uuid uuid,
  planned_at_value timestamptz default null,
  reassignment_reason_text text default null
)
returns public.ordenes_trabajo
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  current_order public.ordenes_trabajo%rowtype;
  updated_order public.ordenes_trabajo%rowtype;
  previous_technician uuid;
  audit_action text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select *
    into current_order
  from public.ordenes_trabajo
  where id = work_order_uuid
    and deleted_at is null
  for update;

  if current_order.id is null then
    raise exception 'Orden de trabajo no encontrada';
  end if;

  if not public.can_manage_work_orders(current_order.tenant_id) then
    raise exception 'No tienes permiso para asignar esta OT';
  end if;

  if current_order.estado not in ('BORRADOR', 'NUEVA', 'ASIGNADA') then
    raise exception 'La OT solo puede asignarse o reasignarse antes de ser aceptada';
  end if;

  if not exists (
    select 1
    from public.tenant_members member
    where member.tenant_id = current_order.tenant_id
      and member.user_id = technician_uuid
      and member.estado = 'activo'
      and member.role in ('tecnico', 'tecnico_externo')
  ) then
    raise exception 'La OT solo puede asignarse a un técnico activo';
  end if;

  previous_technician := current_order.assigned_to;
  audit_action := case
    when previous_technician is null then 'assign_work_order'
    when previous_technician = technician_uuid then 'update_work_order_assignment'
    else 'reassign_work_order'
  end;

  update public.ordenes_trabajo
  set assigned_to = technician_uuid,
      assigned_by = auth.uid(),
      assigned_at = now(),
      reassignment_reason = case
        when previous_technician is distinct from technician_uuid
          then nullif(trim(reassignment_reason_text), '')
        else reassignment_reason
      end,
      fecha_prevista = coalesce(planned_at_value, fecha_prevista),
      estado = 'ASIGNADA',
      updated_at = now()
  where id = current_order.id
  returning * into updated_order;

  perform public.log_audit(
    updated_order.tenant_id,
    audit_action,
    'orden_trabajo',
    updated_order.id,
    jsonb_build_object(
      'previous_assigned_to', previous_technician,
      'assigned_to', technician_uuid,
      'planned_at', updated_order.fecha_prevista,
      'reason', nullif(trim(reassignment_reason_text), ''),
      'from_status', current_order.estado,
      'to_status', updated_order.estado
    )
  );

  return updated_order;
end;
$function$;

revoke execute on function public.assign_work_order(uuid, uuid, timestamptz, text)
  from public, anon;
grant execute on function public.assign_work_order(uuid, uuid, timestamptz, text)
  to authenticated;

commit;
