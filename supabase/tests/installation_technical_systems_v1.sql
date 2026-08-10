-- OT-05B: contrato SQL de sistemas técnicos por instalación.
-- Ejecutar con `npx supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sys-admin-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('11000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sys-coord-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('11000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sys-tech-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('11000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sys-reader-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('11000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sys-admin-b@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre) values
  ('21000000-0000-0000-0000-000000000001','Tenant Sistemas A'),
  ('21000000-0000-0000-0000-000000000002','Tenant Sistemas B');

insert into clientes(id,tenant_id,nombre) values
  ('31000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','Cliente Sistemas A'),
  ('31000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000002','Cliente Sistemas B');

insert into instalaciones(id,tenant_id,cliente_id,nombre) values
  ('41000000-0000-0000-0000-000000000001','21000000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','Instalación Sistemas A1'),
  ('41000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','Instalación Sistemas A2'),
  ('41000000-0000-0000-0000-000000000003','21000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','Instalación Sistemas B1');

insert into tenant_members(tenant_id,user_id,role) values
  ('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','admin_cliente'),
  ('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','coordinador'),
  ('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000003','tecnico'),
  ('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000004','cliente_lectura'),
  ('21000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000005','admin_cliente');

select has_table('public', 'sistemas_instalacion', '1. existe la tabla sistemas_instalacion');
select is(
  (select relrowsecurity from pg_class where oid = 'public.sistemas_instalacion'::regclass),
  true,
  '2. RLS está habilitado'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
select lives_ok(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,codigo,especialidad,criticidad,created_by)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Electricidad BT','ELEC','electricidad_bt','alta','11000000-0000-0000-0000-000000000001') $$,
  '3. administrador crea sistema en su tenant'
);

select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000002',true);
select lives_ok(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,codigo,especialidad,criticidad,created_by)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Climatización','HVAC','climatizacion','media','11000000-0000-0000-0000-000000000002') $$,
  '4. coordinador crea sistema en su tenant'
);

select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000005',true);
select lives_ok(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,codigo,especialidad,created_by)
     values ('21000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000003','PCI tenant B','PCI','pci','11000000-0000-0000-0000-000000000005') $$,
  '5. administrador B crea sistema en tenant B'
);

select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from sistemas_instalacion), 2, '6. administrador A ve solo sus dos sistemas');
select is((select count(*)::integer from sistemas_instalacion where tenant_id='21000000-0000-0000-0000-000000000002'), 0, '7. administrador A no ve sistemas del tenant B');

select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000003',true);
select throws_matching(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,especialidad)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Sistema técnico','general') $$,
  '.*row-level security.*',
  '8. técnico no puede crear sistemas'
);
select is(
  (
    with changed as (
      update sistemas_instalacion
      set descripcion='Cambio técnico prohibido'
      where codigo='ELEC'
      returning 1
    )
    select count(*)::integer from changed
  ),
  0,
  '9. técnico no puede editar sistemas: RLS filtra la fila y actualiza 0 registros'
);

select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000004',true);
select throws_matching(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,especialidad)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Sistema lectura','general') $$,
  '.*row-level security.*',
  '10. cliente lectura no puede crear sistemas'
);

select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
select throws_matching(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,especialidad)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000003','Cruce tenant','general') $$,
  '.*foreign key.*',
  '11. FK impide usar instalación de otro tenant'
);
select throws_matching(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,especialidad,criticidad)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Criticidad inválida','general','extrema') $$,
  '.*sistemas_instalacion_criticidad_check.*',
  '12. criticidad inválida es rechazada'
);
select throws_matching(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,especialidad,estado)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Estado inválido','general','averiado') $$,
  '.*sistemas_instalacion_estado_check.*',
  '13. estado inválido es rechazado'
);
select throws_matching(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,codigo,especialidad)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Duplicado','elec','general') $$,
  '.*sistemas_instalacion_codigo_activo_uq.*',
  '14. código duplicado en misma instalación es rechazado sin distinguir mayúsculas'
);
select lives_ok(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,codigo,especialidad)
     values ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000002','Electricidad A2','ELEC','electricidad_bt') $$,
  '15. mismo código es válido en otra instalación del mismo tenant'
);
select lives_ok(
  $$ insert into sistemas_instalacion(tenant_id,instalacion_id,nombre,codigo,especialidad)
     values
       ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Sistema sin código 1',null,'general'),
       ('21000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','Sistema sin código 2',null,'general') $$,
  '16. se permiten múltiples sistemas sin código'
);
select throws_matching(
  $$ delete from sistemas_instalacion where codigo='ELEC' and instalacion_id='41000000-0000-0000-0000-000000000001' $$,
  '.*permission denied.*',
  '17. authenticated no dispone de borrado físico'
);

select * from finish();
rollback;
