create or replace function public.can_manage_work_orders(tenant_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.is_super_admin()
    or exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = tenant_uuid
        and tm.user_id = auth.uid()
        and tm.estado = 'activo'
        and tm.role in ('admin_cliente','coordinador')
    );
$function$;

grant execute on function public.can_manage_work_orders(uuid) to authenticated, service_role;

create or replace function public.next_work_order_code()
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  current_year text := to_char(now(), 'YYYY');
  next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext('public.next_work_order_code.' || current_year));

  select coalesce(max(substring(codigo_ot from ('^OT-' || current_year || '-([0-9]+)$'))::integer), 0) + 1
    into next_number
  from public.ordenes_trabajo
  where codigo_ot ~ ('^OT-' || current_year || '-[0-9]+$');

  return 'OT-' || current_year || '-' || lpad(next_number::text, 5, '0');
end;
$function$;

grant execute on function public.next_work_order_code() to authenticated, service_role;

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
  planned_at_value timestamp with time zone default null,
  due_at_value timestamp with time zone default null,
  estimated_minutes_value integer default null,
  instructions_text text default null,
  safety_notes_text text default null,
  expected_result_text text default null,
  requirements_json jsonb default '{}'::jsonb
)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  created_row public.ordenes_trabajo;
  requirements_normalized jsonb;
  admin_review_required boolean;
  new_status text;
  new_code text;
begin
  if not public.can_manage_work_orders(tenant_uuid) then
    raise exception 'No tienes permisos para crear órdenes de trabajo en esta organización';
  end if;

  if tenant_uuid is null or installation_uuid is null then
    raise exception 'Selecciona organización e instalación para crear la OT';
  end if;

  if nullif(btrim(coalesce(title_text, '')), '') is null then
    raise exception 'Indica el título de la OT';
  end if;

  if not exists (
    select 1 from public.instalaciones i
    where i.id = installation_uuid
      and i.tenant_id = tenant_uuid
      and i.deleted_at is null
  ) then
    raise exception 'La instalación indicada no pertenece a la organización activa';
  end if;

  if location_uuid is not null and not exists (
    select 1 from public.ubicaciones u
    where u.id = location_uuid
      and u.tenant_id = tenant_uuid
      and u.instalacion_id = installation_uuid
      and u.deleted_at is null
  ) then
    raise exception 'La ubicación indicada no pertenece a la instalación seleccionada';
  end if;

  if asset_uuid is not null and not exists (
    select 1 from public.activos a
    where a.id = asset_uuid
      and a.tenant_id = tenant_uuid
      and a.instalacion_id = installation_uuid
      and a.deleted_at is null
  ) then
    raise exception 'El equipo indicado no pertenece a la instalación seleccionada';
  end if;

  requirements_normalized := jsonb_build_object(
    'requiere_checklist', coalesce((requirements_json->>'requiere_checklist')::boolean, true),
    'requiere_fotos_iniciales', coalesce((requirements_json->>'requiere_fotos_iniciales')::boolean, false),
    'requiere_fotos_finales', coalesce((requirements_json->>'requiere_fotos_finales')::boolean, false),
    'requiere_mediciones', coalesce((requirements_json->>'requiere_mediciones')::boolean, false),
    'requiere_materiales', coalesce((requirements_json->>'requiere_materiales')::boolean, false),
    'requiere_firma_tecnico', coalesce((requirements_json->>'requiere_firma_tecnico')::boolean, false),
    'requiere_firma_cliente', coalesce((requirements_json->>'requiere_firma_cliente')::boolean, false),
    'requiere_prueba_funcional', coalesce((requirements_json->>'requiere_prueba_funcional')::boolean, false),
    'requiere_informe', coalesce((requirements_json->>'requiere_informe')::boolean, false),
    'requiere_revision_admin', coalesce((requirements_json->>'requiere_revision_admin')::boolean, false)
  );

  admin_review_required := coalesce((requirements_normalized->>'requiere_revision_admin')::boolean, false);
  new_status := case when technician_uuid is null then 'BORRADOR' else 'ASIGNADA' end;
  new_code := public.next_work_order_code();

  insert into public.ordenes_trabajo (
    tenant_id,
    codigo_ot,
    instalacion_id,
    ubicacion_id,
    activo_id,
    titulo,
    descripcion,
    tipo,
    prioridad,
    estado,
    assigned_to,
    fecha_prevista,
    fecha_limite,
    created_by,
    revision_admin_estado,
    tipo_ot,
    tipo_ot_detalle,
    trabajo_solicitado,
    instrucciones_tecnico,
    riesgos_precauciones,
    resultado_esperado,
    tiempo_estimado_min,
    duracion_estimada_minutos,
    configuracion,
    activos_relacionados,
    assigned_by,
    assigned_at,
    checklist_snapshot,
    checklist_snapshot_version
  ) values (
    tenant_uuid,
    new_code,
    installation_uuid,
    location_uuid,
    asset_uuid,
    btrim(title_text),
    nullif(btrim(coalesce(description_text, '')), ''),
    coalesce(nullif(btrim(work_order_type_text), ''), 'mantenimiento_preventivo'),
    coalesce(nullif(btrim(priority_text), ''), 'normal'),
    new_status,
    technician_uuid,
    planned_at_value,
    due_at_value,
    auth.uid(),
    case when admin_review_required then 'pendiente' else 'no_requerida' end,
    coalesce(nullif(btrim(work_order_type_text), ''), 'mantenimiento_preventivo'),
    coalesce(nullif(btrim(work_order_type_text), ''), 'mantenimiento_preventivo'),
    nullif(btrim(coalesce(description_text, '')), ''),
    nullif(btrim(coalesce(instructions_text, '')), ''),
    nullif(btrim(coalesce(safety_notes_text, '')), ''),
    nullif(btrim(coalesce(expected_result_text, '')), ''),
    estimated_minutes_value,
    estimated_minutes_value,
    requirements_normalized,
    case when asset_uuid is null then '{}'::uuid[] else array[asset_uuid] end,
    case when technician_uuid is null then null else auth.uid() end,
    case when technician_uuid is null then null else now() end,
    '[]'::jsonb,
    1
  )
  returning * into created_row;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    tenant_uuid,
    'create_work_order',
    'ordenes_trabajo',
    created_row.id,
    auth.uid(),
    jsonb_build_object(
      'codigo_ot', created_row.codigo_ot,
      'estado', created_row.estado,
      'assigned_to', created_row.assigned_to,
      'instalacion_id', created_row.instalacion_id,
      'activo_id', created_row.activo_id
    )
  );

  return created_row;
end;
$function$;

grant execute on function public.create_work_order(
  uuid, uuid, text, text, text, text, uuid, uuid, uuid, timestamp with time zone, timestamp with time zone, integer, text, text, text, jsonb
) to authenticated, service_role;
