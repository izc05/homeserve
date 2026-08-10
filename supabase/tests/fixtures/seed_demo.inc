-- Seed demostrativo explícito de HomeServe Operaciones.
--
-- No crea usuarios Auth. Requiere que admin.demo@example.test y
-- tecnico.demo@example.test ya existan, sean únicos y estén confirmados.
-- El bloque DO es una única sentencia transaccional: cualquier excepción
-- revierte todos los cambios de esta ejecución.

do $seed$
declare
  demo_tenant_id constant uuid := 'd3e00000-0000-4000-8000-000000000001';
  admin_membership_id constant uuid := 'd3e00000-0000-4000-8000-000000000101';
  technician_membership_id constant uuid := 'd3e00000-0000-4000-8000-000000000102';
  demo_client_id constant uuid := 'd3e00000-0000-4000-8000-000000000201';
  demo_installation_id constant uuid := 'd3e00000-0000-4000-8000-000000000301';
  draft_order_id constant uuid := 'd3e00000-0000-4000-8000-000000000401';
  assigned_order_id constant uuid := 'd3e00000-0000-4000-8000-000000000402';
  active_order_id constant uuid := 'd3e00000-0000-4000-8000-000000000403';
  active_visit_id constant uuid := 'd3e00000-0000-4000-8000-000000000501';
  draft_created_audit_id constant uuid := 'd3e00000-0000-4000-8000-000000000601';
  assigned_created_audit_id constant uuid := 'd3e00000-0000-4000-8000-000000000602';
  assigned_assignment_audit_id constant uuid := 'd3e00000-0000-4000-8000-000000000603';
  active_created_audit_id constant uuid := 'd3e00000-0000-4000-8000-000000000604';
  active_assignment_audit_id constant uuid := 'd3e00000-0000-4000-8000-000000000605';
  active_acceptance_audit_id constant uuid := 'd3e00000-0000-4000-8000-000000000606';
  active_start_audit_id constant uuid := 'd3e00000-0000-4000-8000-000000000607';
  admin_user_id uuid;
  technician_user_id uuid;
  matching_users integer;
  expected record;
begin
  -- Contrato mínimo de las 20 migraciones. Fallar aquí evita sembrar sobre
  -- una versión incompleta o incompatible del esquema.
  for expected in
    select *
    from (values
      ('public', 'profiles', 'telefono', 'text'),
      ('public', 'tenants', 'slug', 'text'),
      ('public', 'tenant_members', 'especialidad', 'text'),
      ('public', 'clientes', 'cif_nif', 'text'),
      ('public', 'clientes', 'contacto_nombre', 'text'),
      ('public', 'instalaciones', 'contacto_nombre', 'text'),
      ('public', 'instalaciones', 'contacto_telefono', 'text'),
      ('public', 'instalaciones', 'contacto_email', 'text'),
      ('public', 'ordenes_trabajo', 'cliente_id', 'uuid'),
      ('public', 'ordenes_trabajo', 'configuracion', 'jsonb'),
      ('public', 'ordenes_trabajo', 'revision_admin_estado', 'text'),
      ('public', 'ot_visitas', 'fecha_inicio', 'timestamp with time zone'),
      ('public', 'audit_logs', 'metadata', 'jsonb')
    ) as required_column(schema_name, table_name, column_name, data_type)
  loop
    if not exists (
      select 1
      from pg_catalog.pg_attribute attribute
      join pg_catalog.pg_class relation on relation.oid = attribute.attrelid
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = expected.schema_name
        and relation.relname = expected.table_name
        and attribute.attname = expected.column_name
        and not attribute.attisdropped
        and pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) = expected.data_type
    ) then
      raise exception 'Esquema incompatible: falta %.%.% con tipo %',
        expected.schema_name,
        expected.table_name,
        expected.column_name,
        expected.data_type;
    end if;
  end loop;

  if to_regprocedure('public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamptz,timestamptz,integer,text,text,text,jsonb)') is null
    or to_regprocedure('public.assign_work_order(uuid,uuid,timestamptz,text)') is null
    or to_regprocedure('public.accept_work_order(uuid)') is null
    or to_regprocedure('public.start_work_order_visit(uuid)') is null
    or to_regprocedure('private.next_work_order_code_internal()') is null
  then
    raise exception 'Esquema incompatible: faltan RPC o helpers de la cadena de 20 migraciones';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_created'
      and not tgisinternal
      and tgenabled <> 'D'
  ) then
    raise exception 'Esquema incompatible: el trigger Auth on_auth_user_created no está activo';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_class
    where oid in (
      'public.tenants'::regclass,
      'public.tenant_members'::regclass,
      'public.clientes'::regclass,
      'public.instalaciones'::regclass,
      'public.ordenes_trabajo'::regclass,
      'public.ot_visitas'::regclass,
      'public.audit_logs'::regclass
    )
      and not relrowsecurity
  ) then
    raise exception 'Esquema incompatible: RLS no está activo en todas las tablas de la demo';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.tenant_members'::regclass
      and conname = 'tenant_members_role_check'
      and pg_get_constraintdef(oid) like '%admin_cliente%'
      and pg_get_constraintdef(oid) like '%tecnico%'
  ) or not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.ordenes_trabajo'::regclass
      and conname = 'ordenes_trabajo_estado_check'
      and pg_get_constraintdef(oid) like '%BORRADOR%'
      and pg_get_constraintdef(oid) like '%ASIGNADA%'
      and pg_get_constraintdef(oid) like '%EN_CURSO%'
  ) then
    raise exception 'Esquema incompatible: roles o estados canónicos no coinciden';
  end if;

  select count(*) into matching_users
  from auth.users
  where lower(email) = 'admin.demo@example.test';

  if matching_users <> 1 then
    raise exception 'Auth inválido: se esperaba exactamente un usuario admin.demo@example.test y existen %', matching_users;
  end if;

  select id into admin_user_id
  from auth.users
  where lower(email) = 'admin.demo@example.test'
    and email_confirmed_at is not null;

  if admin_user_id is null then
    raise exception 'Auth inválido: admin.demo@example.test no tiene el correo confirmado';
  end if;

  select count(*) into matching_users
  from auth.users
  where lower(email) = 'tecnico.demo@example.test';

  if matching_users <> 1 then
    raise exception 'Auth inválido: se esperaba exactamente un usuario tecnico.demo@example.test y existen %', matching_users;
  end if;

  select id into technician_user_id
  from auth.users
  where lower(email) = 'tecnico.demo@example.test'
    and email_confirmed_at is not null;

  if technician_user_id is null then
    raise exception 'Auth inválido: tecnico.demo@example.test no tiene el correo confirmado';
  end if;

  if admin_user_id = technician_user_id then
    raise exception 'Auth inválido: administrador y técnico deben ser usuarios distintos';
  end if;

  if exists (
    select 1
    from public.profiles
    where id in (admin_user_id, technician_user_id)
      and is_super_admin
  ) then
    raise exception 'Auth inválido: las cuentas demo no pueden ser superadministradoras';
  end if;

  -- El seed está diseñado para un proyecto nuevo y marcado como demo. No
  -- mezcla ni limpia tenants preexistentes.
  if exists (select 1 from public.tenants where id <> demo_tenant_id) then
    raise exception 'Destino no vacío: existen tenants ajenos a HomeServe Demo Madrid';
  end if;

  if exists (
    select 1 from public.tenants
    where id = demo_tenant_id
      and (nombre <> 'HomeServe Demo Madrid' or slug is distinct from 'homeserve-demo-madrid')
  ) then
    raise exception 'Conflicto de identidad: el UUID reservado del tenant pertenece a otro registro';
  end if;

  if exists (
    select 1 from public.tenant_members
    where tenant_id = demo_tenant_id
      and id not in (admin_membership_id, technician_membership_id)
  ) or exists (
    select 1 from public.clientes
    where tenant_id = demo_tenant_id
      and id <> demo_client_id
  ) or exists (
    select 1 from public.instalaciones
    where tenant_id = demo_tenant_id
      and id <> demo_installation_id
  ) or exists (
    select 1 from public.ordenes_trabajo
    where tenant_id = demo_tenant_id
      and id not in (draft_order_id, assigned_order_id, active_order_id)
  ) or exists (
    select 1 from public.ot_visitas
    where tenant_id = demo_tenant_id
      and id <> active_visit_id
  ) or exists (
    select 1 from public.audit_logs
    where tenant_id = demo_tenant_id
      and id not in (
        draft_created_audit_id,
        assigned_created_audit_id,
        assigned_assignment_audit_id,
        active_created_audit_id,
        active_assignment_audit_id,
        active_acceptance_audit_id,
        active_start_audit_id
      )
  ) then
    raise exception 'Tenant demo contaminado: contiene registros no gestionados por este seed';
  end if;

  if exists (
    select 1 from public.tenant_members
    where tenant_id = demo_tenant_id
      and user_id in (admin_user_id, technician_user_id)
      and id not in (admin_membership_id, technician_membership_id)
  ) then
    raise exception 'Conflicto de identidad: una membresía demo usa un UUID no reservado';
  end if;

  if exists (
    select 1 from public.clientes
    where tenant_id = demo_tenant_id
      and codigo = 'CLI-DEMO-001'
      and id <> demo_client_id
  ) or exists (
    select 1 from public.instalaciones
    where tenant_id = demo_tenant_id
      and codigo = 'INS-DEMO-001'
      and id <> demo_installation_id
  ) or exists (
    select 1 from public.ordenes_trabajo
    where tenant_id = demo_tenant_id
      and codigo_ot in ('OT-2026-00001', 'OT-2026-00002', 'OT-2026-00003')
      and id not in (draft_order_id, assigned_order_id, active_order_id)
  ) then
    raise exception 'Conflicto de identidad: un código reservado ya pertenece a otro registro';
  end if;

  insert into public.profiles (
    id, nombre, email, telefono, is_super_admin, updated_at
  ) values
    (
      admin_user_id,
      'Admin Demo HomeServe',
      'admin.demo@example.test',
      '600000901',
      false,
      '2026-07-21 07:00:00+00'
    ),
    (
      technician_user_id,
      'Técnico Demo HomeServe',
      'tecnico.demo@example.test',
      '600000902',
      false,
      '2026-07-21 07:00:00+00'
    )
  on conflict (id) do update
  set nombre = excluded.nombre,
      email = excluded.email,
      telefono = excluded.telefono,
      is_super_admin = false,
      updated_at = excluded.updated_at;

  insert into public.tenants (
    id, nombre, slug, estado, created_at, updated_at, deleted_at
  ) values (
    demo_tenant_id,
    'HomeServe Demo Madrid',
    'homeserve-demo-madrid',
    'activo',
    '2026-07-21 07:00:00+00',
    '2026-07-21 07:00:00+00',
    null
  )
  on conflict (id) do update
  set nombre = excluded.nombre,
      slug = excluded.slug,
      estado = excluded.estado,
      updated_at = excluded.updated_at,
      deleted_at = null;

  insert into public.tenant_members (
    id, tenant_id, user_id, cliente_id, role, estado, especialidad, created_at, updated_at
  ) values
    (
      admin_membership_id,
      demo_tenant_id,
      admin_user_id,
      null,
      'admin_cliente',
      'activo',
      null,
      '2026-07-21 07:00:00+00',
      '2026-07-21 07:00:00+00'
    ),
    (
      technician_membership_id,
      demo_tenant_id,
      technician_user_id,
      null,
      'tecnico',
      'activo',
      'Mantenimiento integral de vivienda',
      '2026-07-21 07:00:00+00',
      '2026-07-21 07:00:00+00'
    )
  on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      user_id = excluded.user_id,
      cliente_id = excluded.cliente_id,
      role = excluded.role,
      estado = excluded.estado,
      especialidad = excluded.especialidad,
      updated_at = excluded.updated_at;

  insert into public.clientes (
    id, tenant_id, nombre, codigo, cif_nif, contacto_nombre, email, telefono,
    direccion, observaciones, estado, created_by, created_at, updated_at, deleted_at
  ) values (
    demo_client_id,
    demo_tenant_id,
    'Cliente Demo Madrid',
    'CLI-DEMO-001',
    'B00000000',
    'Contacto Demo',
    'contacto.demo@example.test',
    '600000910',
    'Calle Ejemplo 1, 28000 Madrid',
    'Datos completamente ficticios para una demostración pública.',
    'activo',
    admin_user_id,
    '2026-07-21 07:00:00+00',
    '2026-07-21 07:00:00+00',
    null
  )
  on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      nombre = excluded.nombre,
      codigo = excluded.codigo,
      cif_nif = excluded.cif_nif,
      contacto_nombre = excluded.contacto_nombre,
      email = excluded.email,
      telefono = excluded.telefono,
      direccion = excluded.direccion,
      observaciones = excluded.observaciones,
      estado = excluded.estado,
      created_by = excluded.created_by,
      updated_at = excluded.updated_at,
      deleted_at = null;

  insert into public.instalaciones (
    id, tenant_id, cliente_id, nombre, codigo, tipo, direccion, descripcion,
    contacto_nombre, contacto_telefono, contacto_email, estado, created_by,
    created_at, updated_at, deleted_at
  ) values (
    demo_installation_id,
    demo_tenant_id,
    demo_client_id,
    'Vivienda Demo Madrid',
    'INS-DEMO-001',
    'Vivienda',
    'Calle Demostración 1, 28000 Madrid',
    'Instalación residencial ficticia preparada para la presentación.',
    'Responsable Demo',
    '600000911',
    'instalacion.demo@example.test',
    'activo',
    admin_user_id,
    '2026-07-21 07:00:00+00',
    '2026-07-21 07:00:00+00',
    null
  )
  on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      cliente_id = excluded.cliente_id,
      nombre = excluded.nombre,
      codigo = excluded.codigo,
      tipo = excluded.tipo,
      direccion = excluded.direccion,
      descripcion = excluded.descripcion,
      contacto_nombre = excluded.contacto_nombre,
      contacto_telefono = excluded.contacto_telefono,
      contacto_email = excluded.contacto_email,
      estado = excluded.estado,
      created_by = excluded.created_by,
      updated_at = excluded.updated_at,
      deleted_at = null;

  -- El guard de UPDATE permite este upsert administrativo controlado. La
  -- configuración es local a la transacción y no sobrevive al bloque.
  perform set_config('app.work_order_rpc', 'on', true);

  insert into public.ordenes_trabajo (
    id, tenant_id, cliente_id, codigo_ot, instalacion_id, ubicacion_id, activo_id,
    titulo, descripcion, tipo, tipo_ot, prioridad, estado, assigned_to,
    assigned_by, assigned_at, fecha_prevista, fecha_limite, fecha_inicio,
    tiempo_estimado_min, duracion_estimada_minutos, instrucciones_tecnico,
    riesgos_precauciones, resultado_esperado, configuracion,
    revision_admin_estado, created_by, created_at, updated_at, deleted_at
  ) values
    (
      draft_order_id,
      demo_tenant_id,
      demo_client_id,
      'OT-2026-00001',
      demo_installation_id,
      null,
      null,
      'Revisión inicial de vivienda demo',
      'Borrador preparado para mostrar la creación sin técnico asignado.',
      'revision',
      'revision',
      'baja',
      'BORRADOR',
      null,
      null,
      null,
      null,
      '2026-07-25 16:00:00+00',
      null,
      45,
      45,
      'Confirmar el alcance antes de asignar la orden.',
      'Sin riesgos especiales registrados para la demostración.',
      'Alcance revisado y listo para planificación.',
      '{"requiere_checklist":false,"requiere_fotos_iniciales":false,"requiere_fotos_finales":false,"requiere_mediciones":false,"requiere_materiales":false,"requiere_firma_tecnico":false,"requiere_firma_cliente":false,"requiere_prueba_funcional":false,"requiere_informe":false,"requiere_revision_admin":false}'::jsonb,
      'no_requerida',
      admin_user_id,
      '2026-07-21 07:00:00+00',
      '2026-07-21 07:00:00+00',
      null
    ),
    (
      assigned_order_id,
      demo_tenant_id,
      demo_client_id,
      'OT-2026-00002',
      demo_installation_id,
      null,
      null,
      'Comprobación eléctrica del cuadro principal',
      'Orden asignada para aceptar e iniciar durante la presentación.',
      'mantenimiento_preventivo',
      'mantenimiento_preventivo',
      'alta',
      'ASIGNADA',
      technician_user_id,
      admin_user_id,
      '2026-07-21 07:10:05+00',
      '2026-07-22 08:30:00+00',
      '2026-07-22 10:00:00+00',
      null,
      60,
      60,
      'Identificarse como personal de la demostración antes de intervenir.',
      'Aplicar las medidas eléctricas habituales. No existe una instalación real.',
      'Cuadro revisado y resultado documentado en la demostración.',
      '{"requiere_checklist":false,"requiere_fotos_iniciales":false,"requiere_fotos_finales":false,"requiere_mediciones":false,"requiere_materiales":false,"requiere_firma_tecnico":false,"requiere_firma_cliente":false,"requiere_prueba_funcional":false,"requiere_informe":false,"requiere_revision_admin":false}'::jsonb,
      'no_requerida',
      admin_user_id,
      '2026-07-21 07:10:00+00',
      '2026-07-21 07:10:05+00',
      null
    ),
    (
      active_order_id,
      demo_tenant_id,
      demo_client_id,
      'OT-2026-00003',
      demo_installation_id,
      null,
      null,
      'Inspección preventiva de climatización',
      'Orden en curso con el ciclo de auditoría completo y determinista.',
      'inspeccion',
      'inspeccion',
      'normal',
      'EN_CURSO',
      technician_user_id,
      admin_user_id,
      '2026-07-21 07:20:05+00',
      '2026-07-21 08:30:00+00',
      '2026-07-21 11:00:00+00',
      '2026-07-21 07:35:00+00',
      90,
      90,
      'Revisar funcionamiento general sin ejecutar una finalización real.',
      'Equipo ficticio: no realizar ninguna actuación física.',
      'Intervención visible como EN_CURSO con trazabilidad completa.',
      '{"requiere_checklist":false,"requiere_fotos_iniciales":false,"requiere_fotos_finales":false,"requiere_mediciones":false,"requiere_materiales":false,"requiere_firma_tecnico":false,"requiere_firma_cliente":false,"requiere_prueba_funcional":false,"requiere_informe":false,"requiere_revision_admin":false}'::jsonb,
      'no_requerida',
      admin_user_id,
      '2026-07-21 07:20:00+00',
      '2026-07-21 07:35:00+00',
      null
    )
  on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      cliente_id = excluded.cliente_id,
      codigo_ot = excluded.codigo_ot,
      instalacion_id = excluded.instalacion_id,
      ubicacion_id = excluded.ubicacion_id,
      activo_id = excluded.activo_id,
      titulo = excluded.titulo,
      descripcion = excluded.descripcion,
      tipo = excluded.tipo,
      tipo_ot = excluded.tipo_ot,
      prioridad = excluded.prioridad,
      estado = excluded.estado,
      assigned_to = excluded.assigned_to,
      assigned_by = excluded.assigned_by,
      assigned_at = excluded.assigned_at,
      fecha_prevista = excluded.fecha_prevista,
      fecha_limite = excluded.fecha_limite,
      fecha_inicio = excluded.fecha_inicio,
      tiempo_estimado_min = excluded.tiempo_estimado_min,
      duracion_estimada_minutos = excluded.duracion_estimada_minutos,
      instrucciones_tecnico = excluded.instrucciones_tecnico,
      riesgos_precauciones = excluded.riesgos_precauciones,
      resultado_esperado = excluded.resultado_esperado,
      configuracion = excluded.configuracion,
      revision_admin_estado = excluded.revision_admin_estado,
      created_by = excluded.created_by,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = null;

  insert into public.ot_visitas (
    id, tenant_id, ot_id, tecnico_id, estado, fecha_inicio, created_by,
    created_at, updated_at
  ) values (
    active_visit_id,
    demo_tenant_id,
    active_order_id,
    technician_user_id,
    'EN_CURSO',
    '2026-07-21 07:35:00+00',
    technician_user_id,
    '2026-07-21 07:35:00+00',
    '2026-07-21 07:35:00+00'
  )
  on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      ot_id = excluded.ot_id,
      tecnico_id = excluded.tecnico_id,
      estado = excluded.estado,
      fecha_inicio = excluded.fecha_inicio,
      fecha_fin = null,
      created_by = excluded.created_by,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;

  -- Auditoría directa justificada: las RPC generan IDs, códigos y tiempos
  -- dinámicos y no pueden reproducir de forma exacta una OT ya EN_CURSO.
  -- Estos eventos equivalen al contrato de las RPC y usan IDs/timestamps fijos.
  insert into public.audit_logs (
    id, tenant_id, user_id, action, entity_type, entity_id, metadata, created_at
  ) values
    (
      draft_created_audit_id,
      demo_tenant_id,
      admin_user_id,
      'create_work_order',
      'ordenes_trabajo',
      draft_order_id,
      jsonb_build_object(
        'codigo_ot', 'OT-2026-00001',
        'estado_anterior', null,
        'estado_nuevo', 'BORRADOR',
        'instalacion_id', demo_installation_id
      ),
      '2026-07-21 07:00:00+00'
    ),
    (
      assigned_created_audit_id,
      demo_tenant_id,
      admin_user_id,
      'create_work_order',
      'ordenes_trabajo',
      assigned_order_id,
      jsonb_build_object(
        'codigo_ot', 'OT-2026-00002',
        'estado_anterior', null,
        'estado_nuevo', 'ASIGNADA',
        'instalacion_id', demo_installation_id
      ),
      '2026-07-21 07:10:00+00'
    ),
    (
      assigned_assignment_audit_id,
      demo_tenant_id,
      admin_user_id,
      'assign_work_order',
      'ordenes_trabajo',
      assigned_order_id,
      jsonb_build_object(
        'previous_assigned_to', null,
        'assigned_to', technician_user_id,
        'assigned_to_name', 'Técnico Demo HomeServe',
        'assigned_by', admin_user_id,
        'assigned_at', '2026-07-21 07:10:05+00'::timestamptz,
        'estado_anterior', 'BORRADOR',
        'estado_nuevo', 'ASIGNADA',
        'fecha_prevista', '2026-07-22 08:30:00+00'::timestamptz
      ),
      '2026-07-21 07:10:05+00'
    ),
    (
      active_created_audit_id,
      demo_tenant_id,
      admin_user_id,
      'create_work_order',
      'ordenes_trabajo',
      active_order_id,
      jsonb_build_object(
        'codigo_ot', 'OT-2026-00003',
        'estado_anterior', null,
        'estado_nuevo', 'ASIGNADA',
        'instalacion_id', demo_installation_id
      ),
      '2026-07-21 07:20:00+00'
    ),
    (
      active_assignment_audit_id,
      demo_tenant_id,
      admin_user_id,
      'assign_work_order',
      'ordenes_trabajo',
      active_order_id,
      jsonb_build_object(
        'previous_assigned_to', null,
        'assigned_to', technician_user_id,
        'assigned_to_name', 'Técnico Demo HomeServe',
        'assigned_by', admin_user_id,
        'assigned_at', '2026-07-21 07:20:05+00'::timestamptz,
        'estado_anterior', 'BORRADOR',
        'estado_nuevo', 'ASIGNADA',
        'fecha_prevista', '2026-07-21 08:30:00+00'::timestamptz
      ),
      '2026-07-21 07:20:05+00'
    ),
    (
      active_acceptance_audit_id,
      demo_tenant_id,
      technician_user_id,
      'accept_work_order',
      'ordenes_trabajo',
      active_order_id,
      jsonb_build_object(
        'estado_anterior', 'ASIGNADA',
        'estado_nuevo', 'ACEPTADA'
      ),
      '2026-07-21 07:30:00+00'
    ),
    (
      active_start_audit_id,
      demo_tenant_id,
      technician_user_id,
      'start_work_order_visit',
      'ordenes_trabajo',
      active_order_id,
      jsonb_build_object(
        'estado_anterior', 'ACEPTADA',
        'estado_nuevo', 'EN_CURSO',
        'visita_id', active_visit_id
      ),
      '2026-07-21 07:35:00+00'
    )
  on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      user_id = excluded.user_id,
      action = excluded.action,
      entity_type = excluded.entity_type,
      entity_id = excluded.entity_id,
      metadata = excluded.metadata,
      created_at = excluded.created_at;

  if (select count(*) from public.tenants where id = demo_tenant_id) <> 1
    or (select count(*) from public.tenant_members where tenant_id = demo_tenant_id) <> 2
    or (select count(*) from public.clientes where tenant_id = demo_tenant_id) <> 1
    or (select count(*) from public.instalaciones where tenant_id = demo_tenant_id) <> 1
    or (select count(*) from public.ordenes_trabajo where tenant_id = demo_tenant_id) <> 3
    or (select count(*) from public.ot_visitas where tenant_id = demo_tenant_id) <> 1
    or (select count(*) from public.audit_logs where tenant_id = demo_tenant_id) <> 7
  then
    raise exception 'Invariante incumplida: los conteos finales del tenant demo no son exactos';
  end if;

  if not exists (
    select 1 from public.ordenes_trabajo
    where id = draft_order_id
      and estado = 'BORRADOR'
      and assigned_to is null
      and assigned_by is null
      and assigned_at is null
  ) or not exists (
    select 1 from public.ordenes_trabajo
    where id = assigned_order_id
      and estado = 'ASIGNADA'
      and assigned_to = technician_user_id
      and assigned_by = admin_user_id
  ) or not exists (
    select 1 from public.ordenes_trabajo
    where id = active_order_id
      and estado = 'EN_CURSO'
      and assigned_to = technician_user_id
      and fecha_inicio = '2026-07-21 07:35:00+00'
  ) then
    raise exception 'Invariante incumplida: estados o asignaciones de OT no coinciden';
  end if;

  if (
    select array_agg(action order by created_at, id)
    from public.audit_logs
    where entity_id = active_order_id
  ) is distinct from array[
    'create_work_order',
    'assign_work_order',
    'accept_work_order',
    'start_work_order_visit'
  ]::text[] then
    raise exception 'Invariante incumplida: la auditoría de la OT EN_CURSO no es cronológica';
  end if;
end;
$seed$;
