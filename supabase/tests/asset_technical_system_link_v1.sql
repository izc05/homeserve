-- OT-05D: contrato SQL del vínculo opcional activo -> sistema técnico.
-- Ejecutar con `npx supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('12000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','asset-system-admin@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre) values
  ('22000000-0000-0000-0000-000000000001','Tenant Activos A'),
  ('22000000-0000-0000-0000-000000000002','Tenant Activos B');

insert into clientes(id,tenant_id,nombre) values
  ('32000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','Cliente Activos A'),
  ('32000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','Cliente Activos B');

insert into instalaciones(id,tenant_id,cliente_id,nombre) values
  ('42000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','Instalación A1'),
  ('42000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','Instalación A2'),
  ('42000000-0000-0000-0000-000000000003','22000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000002','Instalación B1');

insert into tenant_members(tenant_id,user_id,role) values
  ('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','admin_cliente');

insert into sistemas_instalacion(id,tenant_id,instalacion_id,nombre,codigo,especialidad) values
  ('52000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','Electricidad A1','ELEC-A1','electricidad_bt'),
  ('52000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000002','Electricidad A2','ELEC-A2','electricidad_bt'),
  ('52000000-0000-0000-0000-000000000003','22000000-0000-0000-0000-000000000002','42000000-0000-0000-0000-000000000003','Electricidad B1','ELEC-B1','electricidad_bt');

select has_column('public', 'activos', 'sistema_id', '1. activos dispone de sistema_id');

select lives_ok(
  $$ insert into activos(tenant_id,instalacion_id,nombre,tipo) values ('22000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','Activo sin sistema','equipo') $$,
  '2. activo sin sistema sigue siendo válido'
);

select lives_ok(
  $$ insert into activos(tenant_id,instalacion_id,sistema_id,nombre,tipo) values ('22000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Activo con sistema','equipo') $$,
  '3. activo puede usar sistema de su instalación'
);

select throws_matching(
  $$ insert into activos(tenant_id,instalacion_id,sistema_id,nombre,tipo) values ('22000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000003','Activo cruce tenant','equipo') $$,
  '.*activos_tenant_instalacion_sistema_id_fkey.*',
  '4. activo no puede usar sistema de otro tenant'
);

select throws_matching(
  $$ insert into activos(tenant_id,instalacion_id,sistema_id,nombre,tipo) values ('22000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000002','Activo cruce instalación','equipo') $$,
  '.*activos_tenant_instalacion_sistema_id_fkey.*',
  '5. activo no puede usar sistema de otra instalación del mismo tenant'
);

insert into activos(id,tenant_id,instalacion_id,sistema_id,nombre,tipo) values
  ('62000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Activo mutable','equipo');

select throws_matching(
  $$ update activos set instalacion_id='42000000-0000-0000-0000-000000000002' where id='62000000-0000-0000-0000-000000000001' $$,
  '.*activos_tenant_instalacion_sistema_id_fkey.*',
  '6. cambiar instalación manteniendo sistema incompatible falla'
);

select lives_ok(
  $$ update activos set sistema_id=null, instalacion_id='42000000-0000-0000-0000-000000000002' where id='62000000-0000-0000-0000-000000000001' $$,
  '7. quitar sistema permite reclasificar el activo'
);

select is(
  (select count(*)::integer from activos where sistema_id is not null and id <> '62000000-0000-0000-0000-000000000001'),
  1,
  '8. no existe backfill automático de activos previos'
);

select * from finish();
rollback;
