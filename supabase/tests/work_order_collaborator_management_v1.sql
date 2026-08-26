-- OT-06B: contrato de gestión segura de colaboradores.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('13000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','collab-admin-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('13000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','collab-resp-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('13000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','collab-tech-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('13000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','collab-reader-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('13000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','collab-admin-b@example.test','not-used',now(),'{}','{}',now(),now()),
  ('13000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','collab-tech-b@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre) values
  ('23000000-0000-0000-0000-000000000001','Tenant Colaboradores A'),
  ('23000000-0000-0000-0000-000000000002','Tenant Colaboradores B');
insert into clientes(id,tenant_id,nombre) values
  ('33000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','Cliente Colaboradores A'),
  ('33000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','Cliente Colaboradores B');
insert into instalaciones(id,tenant_id,cliente_id,nombre) values
  ('43000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','Instalación Colaboradores A'),
  ('43000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','Instalación Colaboradores B');
insert into tenant_members(tenant_id,user_id,role) values
  ('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','admin_cliente'),
  ('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000002','tecnico'),
  ('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003','tecnico_externo'),
  ('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000004','cliente_lectura'),
  ('23000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000005','admin_cliente'),
  ('23000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000006','tecnico');

insert into ordenes_trabajo(id,tenant_id,cliente_id,codigo_ot,instalacion_id,titulo,tipo,prioridad,estado,assigned_to,assigned_by,assigned_at,created_by)
values
  ('53000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','OT-COLLAB-A-1','43000000-0000-0000-0000-000000000001','OT colaboradores A','averia','normal','ASIGNADA','13000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000001',now(),'13000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','OT-COLLAB-B-1','43000000-0000-0000-0000-000000000002','OT colaboradores B','averia','normal','ASIGNADA','13000000-0000-0000-0000-000000000006','13000000-0000-0000-0000-000000000005',now(),'13000000-0000-0000-0000-000000000005');

select ok(
  to_regprocedure('public.set_work_order_collaborator(uuid,uuid,boolean,text)') is not null,
  '1. existe RPC set_work_order_collaborator'
);
select ok(
  has_function_privilege('authenticated','public.set_work_order_collaborator(uuid,uuid,boolean,text)','EXECUTE'),
  '2. authenticated puede invocar la RPC controlada'
);
select ok(
  not has_function_privilege('anon','public.set_work_order_collaborator(uuid,uuid,boolean,text)','EXECUTE'),
  '3. anon no puede invocar la RPC'
);
select ok(
  not has_function_privilege('service_role','public.set_work_order_collaborator(uuid,uuid,boolean,text)','EXECUTE'),
  '4. service_role no recibe EXECUTE sin consumidor demostrado'
);
select ok(
  (select prosecdef from pg_proc where oid=to_regprocedure('public.set_work_order_collaborator(uuid,uuid,boolean,text)')),
  '5. RPC usa SECURITY DEFINER porque la tabla no admite DML directo'
);
select is(
  (select proconfig from pg_proc where oid=to_regprocedure('public.set_work_order_collaborator(uuid,uuid,boolean,text)')),
  array['search_path=pg_catalog']::text[],
  '6. RPC fija search_path seguro'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);

select lives_ok(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003',true,'Apoyo técnico') $$,
  '7. manager añade técnico activo como colaborador'
);
select is(
  (select count(*)::integer from ot_participantes where ot_id='53000000-0000-0000-0000-000000000001' and tecnico_id='13000000-0000-0000-0000-000000000003' and rol='colaborador' and estado='activo'),
  1,
  '8. queda un colaborador activo'
);
select lives_ok(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003',true,'Llamada idempotente') $$,
  '9. añadir de nuevo el colaborador activo es idempotente'
);
select is(
  (select count(*)::integer from ot_participantes where ot_id='53000000-0000-0000-0000-000000000001' and tecnico_id='13000000-0000-0000-0000-000000000003' and estado='activo'),
  1,
  '10. idempotencia no duplica participante activo'
);
select throws_matching(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000002',true,'No válido') $$,
  '.*responsable no se gestiona como colaborador.*',
  '11. responsable no puede añadirse como colaborador'
);
select throws_matching(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000004',true,'No válido') $$,
  '.*colaborador debe ser un técnico activo del tenant.*',
  '12. usuario no técnico es rechazado'
);
select throws_matching(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000006',true,'Cruce tenant') $$,
  '.*colaborador debe ser un técnico activo del tenant.*',
  '13. técnico de otro tenant es rechazado'
);

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
select throws_matching(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003',false,'Me retiro') $$,
  '.*No tienes permiso para gestionar participantes.*',
  '14. colaborador no puede gestionarse a sí mismo mediante RPC manager'
);

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);
select throws_matching(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003',false,'') $$,
  '.*motivo de retirada.*',
  '15. retirar colaborador exige motivo'
);
select lives_ok(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003',false,'Fin del apoyo') $$,
  '16. manager retira colaborador con motivo'
);
select is(
  (select count(*)::integer from ot_participantes where ot_id='53000000-0000-0000-0000-000000000001' and tecnico_id='13000000-0000-0000-0000-000000000003' and estado='retirado' and removed_at is not null and removed_by='13000000-0000-0000-0000-000000000001'),
  1,
  '17. retirada conserva historial, actor y fecha'
);
select lives_ok(
  $$ select set_work_order_collaborator('53000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003',true,'Segundo apoyo') $$,
  '18. un técnico retirado puede volver a colaborar mediante una nueva participación'
);
select is(
  (select count(*)::integer from ot_participantes where ot_id='53000000-0000-0000-0000-000000000001' and tecnico_id='13000000-0000-0000-0000-000000000003'),
  2,
  '19. reingreso conserva participación histórica y crea una nueva'
);
select is(
  (select count(*)::integer from audit_logs where entity_id='53000000-0000-0000-0000-000000000001' and action in ('add_work_order_collaborator','remove_work_order_collaborator')),
  3,
  '20. altas/retiro reales quedan auditados; llamada idempotente no genera evento extra'
);

select * from finish();
rollback;
