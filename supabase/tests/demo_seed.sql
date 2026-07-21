-- Contrato del seed demostrativo. Los usuarios Auth se crean directamente
-- solo dentro de esta transacción de pgTAP y se eliminan con ROLLBACK.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    'd3e00000-0000-4000-8000-00000000a001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin.demo@example.test',
    'not-used',
    '2026-07-21 06:00:00+00',
    '{}'::jsonb,
    '{}'::jsonb,
    '2026-07-21 06:00:00+00',
    '2026-07-21 06:00:00+00'
  ),
  (
    'd3e00000-0000-4000-8000-00000000a002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tecnico.demo@example.test',
    'not-used',
    '2026-07-21 06:00:00+00',
    '{}'::jsonb,
    '{}'::jsonb,
    '2026-07-21 06:00:00+00',
    '2026-07-21 06:00:00+00'
  );

\ir ../demo/seed_demo.sql

create temporary table demo_seed_first_counts (
  entity text primary key,
  row_count integer not null
) on commit drop;

insert into demo_seed_first_counts (entity, row_count)
values
  ('tenants', (select count(*)::integer from public.tenants)),
  ('tenant_members', (select count(*)::integer from public.tenant_members)),
  ('clientes', (select count(*)::integer from public.clientes)),
  ('instalaciones', (select count(*)::integer from public.instalaciones)),
  ('ordenes_trabajo', (select count(*)::integer from public.ordenes_trabajo)),
  ('ot_visitas', (select count(*)::integer from public.ot_visitas)),
  ('audit_logs', (select count(*)::integer from public.audit_logs));

\ir ../demo/seed_demo.sql

select plan(40);

select is(
  (select row_count from demo_seed_first_counts where entity = 'tenants'),
  1,
  '1. la primera ejecución crea un tenant'
);

select is(
  (select row_count from demo_seed_first_counts where entity = 'tenant_members'),
  2,
  '2. la primera ejecución crea dos membresías'
);

select is(
  (select row_count from demo_seed_first_counts where entity = 'clientes'),
  1,
  '3. la primera ejecución crea un cliente'
);

select is(
  (select row_count from demo_seed_first_counts where entity = 'instalaciones'),
  1,
  '4. la primera ejecución crea una instalación'
);

select is(
  (select row_count from demo_seed_first_counts where entity = 'ordenes_trabajo'),
  3,
  '5. la primera ejecución crea tres OT'
);

select is(
  (select row_count from demo_seed_first_counts where entity = 'ot_visitas'),
  1,
  '6. la primera ejecución crea una visita activa'
);

select is(
  (select row_count from demo_seed_first_counts where entity = 'audit_logs'),
  7,
  '7. la primera ejecución crea siete eventos de auditoría'
);

select is(
  (select count(*)::integer from public.activos),
  0,
  '8. no se inventa un equipo cuando la interfaz admite estado vacío'
);

select is(
  (select count(*)::integer from public.tenants),
  (select row_count from demo_seed_first_counts where entity = 'tenants'),
  '9. la segunda ejecución no duplica tenants'
);

select is(
  (select count(*)::integer from public.tenant_members),
  (select row_count from demo_seed_first_counts where entity = 'tenant_members'),
  '10. la segunda ejecución no duplica membresías'
);

select is(
  (select count(*)::integer from public.clientes),
  (select row_count from demo_seed_first_counts where entity = 'clientes'),
  '11. la segunda ejecución no duplica clientes'
);

select is(
  (select count(*)::integer from public.instalaciones),
  (select row_count from demo_seed_first_counts where entity = 'instalaciones'),
  '12. la segunda ejecución no duplica instalaciones'
);

select is(
  (select count(*)::integer from public.ordenes_trabajo),
  (select row_count from demo_seed_first_counts where entity = 'ordenes_trabajo'),
  '13. la segunda ejecución no duplica OT'
);

select is(
  (select count(*)::integer from public.ot_visitas),
  (select row_count from demo_seed_first_counts where entity = 'ot_visitas'),
  '14. la segunda ejecución no duplica visitas'
);

select is(
  (select count(*)::integer from public.audit_logs),
  (select row_count from demo_seed_first_counts where entity = 'audit_logs'),
  '15. la segunda ejecución no duplica auditoría'
);

select ok(
  exists (
    select 1
    from public.tenants
    where id = 'd3e00000-0000-4000-8000-000000000001'
      and nombre = 'HomeServe Demo Madrid'
      and slug = 'homeserve-demo-madrid'
      and estado = 'activo'
  ),
  '16. el tenant conserva UUID e identidad reservados'
);

select ok(
  (select count(*) = 2
   from public.profiles
   where id in (
     'd3e00000-0000-4000-8000-00000000a001',
     'd3e00000-0000-4000-8000-00000000a002'
   )
     and nombre in ('Admin Demo HomeServe', 'Técnico Demo HomeServe')
     and telefono in ('600000901', '600000902')
     and not is_super_admin),
  '17. el seed completa los perfiles sin conceder superadministración'
);

select ok(
  exists (
    select 1 from public.tenant_members
    where id = 'd3e00000-0000-4000-8000-000000000101'
      and role = 'admin_cliente'
      and estado = 'activo'
  ) and exists (
    select 1 from public.tenant_members
    where id = 'd3e00000-0000-4000-8000-000000000102'
      and role = 'tecnico'
      and estado = 'activo'
      and especialidad = 'Mantenimiento integral de vivienda'
  ),
  '18. roles, disponibilidad activa y especialidad son canónicos'
);

select ok(
  exists (
    select 1
    from public.instalaciones installation
    join public.clientes client
      on client.tenant_id = installation.tenant_id
     and client.id = installation.cliente_id
    where client.id = 'd3e00000-0000-4000-8000-000000000201'
      and installation.id = 'd3e00000-0000-4000-8000-000000000301'
      and client.email = 'contacto.demo@example.test'
      and installation.contacto_email = 'instalacion.demo@example.test'
  ),
  '19. cliente, instalación y contactos ficticios quedan relacionados'
);

select is(
  (
    select array_agg(codigo_ot order by codigo_ot)
    from public.ordenes_trabajo
  ),
  array['OT-2026-00001', 'OT-2026-00002', 'OT-2026-00003']::text[],
  '20. los códigos deterministas conservan formato y secuencia'
);

select ok(
  exists (
    select 1 from public.ordenes_trabajo
    where id = 'd3e00000-0000-4000-8000-000000000401'
      and estado = 'BORRADOR'
      and assigned_to is null
      and assigned_by is null
      and assigned_at is null
  ),
  '21. la OT A permanece BORRADOR sin técnico'
);

select ok(
  exists (
    select 1 from public.ordenes_trabajo
    where id = 'd3e00000-0000-4000-8000-000000000402'
      and estado = 'ASIGNADA'
      and assigned_to = 'd3e00000-0000-4000-8000-00000000a002'
      and assigned_by = 'd3e00000-0000-4000-8000-00000000a001'
  ),
  '22. la OT B queda ASIGNADA y lista para la demostración en vivo'
);

select ok(
  exists (
    select 1 from public.ordenes_trabajo
    where id = 'd3e00000-0000-4000-8000-000000000403'
      and estado = 'EN_CURSO'
      and assigned_to = 'd3e00000-0000-4000-8000-00000000a002'
      and fecha_inicio = '2026-07-21 07:35:00+00'
  ),
  '23. la OT C queda EN_CURSO con técnico y fecha de inicio'
);

select ok(
  exists (
    select 1 from public.ot_visitas
    where id = 'd3e00000-0000-4000-8000-000000000501'
      and ot_id = 'd3e00000-0000-4000-8000-000000000403'
      and tecnico_id = 'd3e00000-0000-4000-8000-00000000a002'
      and estado = 'EN_CURSO'
  ),
  '24. la OT C tiene una única visita activa coherente'
);

select is(
  (
    select array_agg(action order by created_at, id)
    from public.audit_logs
    where entity_id = 'd3e00000-0000-4000-8000-000000000403'
  ),
  array[
    'create_work_order',
    'assign_work_order',
    'accept_work_order',
    'start_work_order_visit'
  ]::text[],
  '25. la OT C muestra creación, asignación, aceptación e inicio en orden'
);

select is(
  (
    select array_agg(user_id order by created_at, id)
    from public.audit_logs
    where entity_id = 'd3e00000-0000-4000-8000-000000000403'
  ),
  array[
    'd3e00000-0000-4000-8000-00000000a001'::uuid,
    'd3e00000-0000-4000-8000-00000000a001'::uuid,
    'd3e00000-0000-4000-8000-00000000a002'::uuid,
    'd3e00000-0000-4000-8000-00000000a002'::uuid
  ],
  '26. los actores de la OT C son administrador, administrador, técnico y técnico'
);

select ok(
  exists (
    select 1 from public.audit_logs
    where entity_id = 'd3e00000-0000-4000-8000-000000000403'
      and action = 'assign_work_order'
      and metadata->>'estado_anterior' = 'BORRADOR'
      and metadata->>'estado_nuevo' = 'ASIGNADA'
      and metadata->>'assigned_to_name' = 'Técnico Demo HomeServe'
  ) and exists (
    select 1 from public.audit_logs
    where entity_id = 'd3e00000-0000-4000-8000-000000000403'
      and action = 'accept_work_order'
      and metadata->>'estado_anterior' = 'ASIGNADA'
      and metadata->>'estado_nuevo' = 'ACEPTADA'
  ) and exists (
    select 1 from public.audit_logs
    where entity_id = 'd3e00000-0000-4000-8000-000000000403'
      and action = 'start_work_order_visit'
      and metadata->>'estado_anterior' = 'ACEPTADA'
      and metadata->>'estado_nuevo' = 'EN_CURSO'
  ),
  '27. la auditoría conserva técnico y transiciones anterior/nueva'
);

select is(
  (
    select array_agg(action order by created_at, id)
    from public.audit_logs
    where entity_id = 'd3e00000-0000-4000-8000-000000000402'
  ),
  array['create_work_order', 'assign_work_order']::text[],
  '28. la OT B registra creación y asignación separadas'
);

select is(
  (
    select array_agg(action order by created_at, id)
    from public.audit_logs
    where entity_id = 'd3e00000-0000-4000-8000-000000000401'
  ),
  array['create_work_order']::text[],
  '29. la OT A no genera una asignación ficticia'
);

select is(
  (select count(distinct id)::integer from public.audit_logs),
  7,
  '30. todos los eventos tienen UUID único y no se duplican'
);

select ok(
  not exists (
    select tenant_id from public.tenant_members
    where tenant_id <> 'd3e00000-0000-4000-8000-000000000001'
    union all
    select tenant_id from public.clientes
    where tenant_id <> 'd3e00000-0000-4000-8000-000000000001'
    union all
    select tenant_id from public.instalaciones
    where tenant_id <> 'd3e00000-0000-4000-8000-000000000001'
    union all
    select tenant_id from public.ordenes_trabajo
    where tenant_id <> 'd3e00000-0000-4000-8000-000000000001'
    union all
    select tenant_id from public.ot_visitas
    where tenant_id <> 'd3e00000-0000-4000-8000-000000000001'
    union all
    select tenant_id from public.audit_logs
    where tenant_id <> 'd3e00000-0000-4000-8000-000000000001'
  ),
  '31. no existe ningún dato de negocio de otro tenant'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claim.sub',
  'd3e00000-0000-4000-8000-00000000a001',
  true
);

select is(
  (select count(*)::integer from public.ordenes_trabajo),
  3,
  '32. RLS permite al administrador ver las tres OT de su tenant'
);

select ok(
  (select count(*) = 1 from public.clientes)
    and (select count(*) = 1 from public.instalaciones)
    and (select count(*) = 7 from public.audit_logs),
  '33. RLS permite al administrador ver cliente, instalación y auditoría'
);

select set_config(
  'request.jwt.claim.sub',
  'd3e00000-0000-4000-8000-00000000a002',
  true
);

select is(
  (select count(*)::integer from public.ordenes_trabajo),
  2,
  '34. RLS limita al técnico a sus dos OT asignadas'
);

select is(
  (
    select count(*)::integer
    from public.ordenes_trabajo
    where estado = 'BORRADOR'
  ),
  0,
  '35. el técnico no ve la OT BORRADOR sin asignar'
);

select is(
  (
    select array_agg(codigo_ot || ':' || estado order by codigo_ot)
    from public.ordenes_trabajo
  ),
  array['OT-2026-00002:ASIGNADA', 'OT-2026-00003:EN_CURSO']::text[],
  '36. el técnico ve exactamente la OT ASIGNADA y la OT EN_CURSO'
);

select ok(
  public.can_execute_work_order(
    'd3e00000-0000-4000-8000-000000000001',
    'd3e00000-0000-4000-8000-000000000402'
  ) and public.can_execute_work_order(
    'd3e00000-0000-4000-8000-000000000001',
    'd3e00000-0000-4000-8000-000000000403'
  ),
  '37. el técnico puede ejecutar sus OT ASIGNADA y EN_CURSO'
);

select ok(
  not public.can_execute_work_order(
    'd3e00000-0000-4000-8000-000000000001',
    'd3e00000-0000-4000-8000-000000000401'
  ),
  '38. el técnico no puede ejecutar el BORRADOR no asignado'
);

select ok(
  (select count(*) = 1 from public.clientes)
    and (select count(*) = 1 from public.instalaciones),
  '39. el técnico conserva acceso de lectura al contexto de su tenant'
);

select is(
  (select count(*)::integer from public.audit_logs),
  0,
  '40. la auditoría administrativa no se expone al técnico'
);

select * from finish();
rollback;
