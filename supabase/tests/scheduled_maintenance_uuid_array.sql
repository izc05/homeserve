-- Pruebas del contrato UUID para los mantenimientos generados.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(3);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'planning-manager@example.test', 'not-used', now(), '{}', '{}', now(), now()),
  ('12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'planning-technician@example.test', 'not-used', now(), '{}', '{}', now(), now());

insert into tenants (id, nombre)
values
  ('22000000-0000-0000-0000-000000000001', 'Tenant sin planificación'),
  ('22000000-0000-0000-0000-000000000002', 'Tenant con planificación');

insert into clientes (id, tenant_id, nombre)
values ('32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'Cliente de planificación');

insert into instalaciones (id, tenant_id, cliente_id, nombre)
values ('42000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000001', 'Instalación de planificación');

insert into activos (id, tenant_id, instalacion_id, nombre)
values ('52000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', 'Activo de planificación');

insert into tenant_members (tenant_id, user_id, role)
values
  ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'admin_cliente'),
  ('22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', 'admin_cliente'),
  ('22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'tecnico');

insert into planes_mantenimiento (
  id, tenant_id, instalacion_id, activo_id, titulo, nombre, tipo,
  fecha_inicio, fecha_proxima_realizacion, created_by
)
values (
  '62000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000002',
  '42000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  'Plan inmediato',
  'Plan inmediato',
  'mantenimiento_preventivo',
  current_date,
  current_date,
  '12000000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);

select is(
  public.generate_due_scheduled_maintenances('22000000-0000-0000-0000-000000000001', 0)->'generated_ids',
  '[]'::jsonb,
  '1. devuelve un array vacío cuando no hay mantenimientos que generar'
);

create temporary table generated_maintenance_result (
  payload jsonb not null
) on commit drop;

insert into generated_maintenance_result (payload)
select public.generate_due_scheduled_maintenances(
  '22000000-0000-0000-0000-000000000002',
  0
);

select ok(
  (
    select jsonb_array_length(payload->'generated_ids') = 1
    from generated_maintenance_result
  )
  and exists (
    select 1
    from generated_maintenance_result result
    join public.mantenimientos_programados maintenance
      on maintenance.id = (result.payload->'generated_ids'->>0)::uuid
    where maintenance.plan_id = '62000000-0000-0000-0000-000000000001'
  ),
  '2. el UUID generado coincide con el mantenimiento del plan de prueba'
);

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);
select throws_matching(
  $$ select public.generate_due_scheduled_maintenances('22000000-0000-0000-0000-000000000002', 0) $$,
  '.*No tienes permisos para generar planificación preventiva.*',
  '3. un usuario sin permiso no puede generar planificación'
);

select * from finish();
rollback;
