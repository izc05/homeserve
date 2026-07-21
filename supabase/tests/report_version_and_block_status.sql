-- Pruebas de la serialización de versiones de informes y del estado de bloqueo.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'report-tech-a@example.test', 'not-used', now(), '{}', '{}', now(), now()),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'report-tech-b@example.test', 'not-used', now(), '{}', '{}', now(), now());

insert into tenants (id, nombre)
values ('21000000-0000-0000-0000-000000000001', 'Tenant de informes');

insert into clientes (id, tenant_id, nombre)
values ('31000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Cliente de informes');

insert into instalaciones (id, tenant_id, cliente_id, nombre)
values ('41000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Instalación de informes');

insert into tenant_members (tenant_id, user_id, role)
values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'tecnico'),
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'tecnico');

insert into ordenes_trabajo (
  id, tenant_id, cliente_id, codigo_ot, instalacion_id, titulo, tipo,
  prioridad, estado, assigned_to, created_by
)
values
  ('51000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'OT-REPORT-1', '41000000-0000-0000-0000-000000000001', 'Informe finalizado', 'revision', 'normal', 'FINALIZADA_TECNICO', '11000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'OT-BLOCK-1', '41000000-0000-0000-0000-000000000001', 'Bloqueo válido', 'revision', 'normal', 'EN_CURSO', '11000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'OT-BLOCK-2', '41000000-0000-0000-0000-000000000001', 'Bloqueo inválido', 'revision', 'normal', 'EN_CURSO', '11000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

select is(
  array[
    (select (public.register_work_order_report('51000000-0000-0000-0000-000000000001', 'primer-informe.pdf')).version),
    (select (public.register_work_order_report('51000000-0000-0000-0000-000000000001', 'segundo-informe.pdf')).version)
  ],
  array[1, 2]::integer[],
  '1. dos informes consecutivos obtienen las versiones 1 y 2'
);

select throws_matching(
  $$ insert into public.ot_informes (tenant_id, ot_id, version, filename, bucket, path, created_by)
     values ('21000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1, 'duplicado.pdf', 'ot-reports', null, '11000000-0000-0000-0000-000000000001') $$,
  '.*duplicate key value violates unique constraint.*',
  '2. la combinación ot_id y version no puede duplicarse'
);

select is(
  (public.block_work_order('51000000-0000-0000-0000-000000000002', 'BLOQUEADA', 'Acceso no disponible')).estado,
  'BLOQUEADA',
  '3. block_status BLOQUEADA bloquea la OT'
);

select throws_matching(
  $$ select public.block_work_order('51000000-0000-0000-0000-000000000003', 'EN_CURSO', 'Estado no permitido') $$,
  '.*Estado de bloqueo no válido.*',
  '4. un estado de bloqueo distinto es rechazado'
);

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);
select throws_matching(
  $$ select public.block_work_order('51000000-0000-0000-0000-000000000003', 'BLOQUEADA', 'Intento ajeno') $$,
  '.*No tienes permiso sobre esta OT.*',
  '5. el técnico ajeno no puede ejecutar el bloqueo'
);

select * from finish();
rollback;
