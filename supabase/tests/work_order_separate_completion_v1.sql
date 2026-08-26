-- OT-06D: cerrar mi visita y finalizar la OT como acciones independientes.
-- Incluye el contrato de resolución: una visita cerrada como pendiente debe
-- resolverse con una visita posterior antes del cierre técnico global.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(18);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('15000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','complete-admin@example.test','not-used',now(),'{}','{}',now(),now()),
  ('15000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','complete-resp@example.test','not-used',now(),'{}','{}',now(),now()),
  ('15000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','complete-collab@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre)
values ('25000000-0000-0000-0000-000000000001','Tenant Completion');
insert into clientes(id,tenant_id,nombre)
values ('35000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','Cliente Completion');
insert into instalaciones(id,tenant_id,cliente_id,nombre)
values ('45000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','Instalación Completion');
insert into tenant_members(tenant_id,user_id,role) values
  ('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','admin_cliente'),
  ('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000002','tecnico'),
  ('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000003','tecnico_externo');

insert into ordenes_trabajo(
  id,tenant_id,cliente_id,codigo_ot,instalacion_id,titulo,tipo,prioridad,estado,
  assigned_to,assigned_by,assigned_at,created_by,configuracion
) values (
  '55000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001',
  '35000000-0000-0000-0000-000000000001','OT-COMP-1','45000000-0000-0000-0000-000000000001',
  'OT completion multi','averia','normal','ASIGNADA','15000000-0000-0000-0000-000000000002',
  '15000000-0000-0000-0000-000000000001',now(),'15000000-0000-0000-0000-000000000001','{}'::jsonb
);

select ok(to_regprocedure('public.close_my_work_order_visit(uuid,jsonb)') is not null,'1. existe close_my_work_order_visit');
select ok(to_regprocedure('public.finalize_work_order_technical(uuid,text)') is not null,'2. existe finalize_work_order_technical');
select ok(has_function_privilege('authenticated','public.close_my_work_order_visit(uuid,jsonb)','EXECUTE'),'3. authenticated invoca cierre de visita con validación servidor');
select ok(not has_function_privilege('anon','public.close_my_work_order_visit(uuid,jsonb)','EXECUTE'),'4. anon no ejecuta cierre de visita');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000001',true);
select lives_ok(
  $$ select set_work_order_collaborator('55000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000003',true,'Apoyo cierre separado') $$,
  '5. manager añade colaborador'
);

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000002',true);
select lives_ok($$ select accept_work_order('55000000-0000-0000-0000-000000000001') $$,'6. responsable acepta la OT');
select lives_ok($$ select start_work_order_visit('55000000-0000-0000-0000-000000000001') $$,'7. responsable inicia visita');

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000003',true);
select lives_ok($$ select start_work_order_visit('55000000-0000-0000-0000-000000000001') $$,'8. colaborador inicia visita');
select lives_ok(
  $$ select close_my_work_order_visit('55000000-0000-0000-0000-000000000001',jsonb_build_object('trabajo_realizado','Diagnóstico inicial','trabajo_pendiente','Segunda intervención','resultado_cierre','necesita_otra_visita')) $$,
  '9. colaborador puede cerrar su visita indicando otra visita necesaria'
);

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000002',true);
select lives_ok(
  $$ select close_my_work_order_visit('55000000-0000-0000-0000-000000000001',jsonb_build_object('trabajo_realizado','Trabajo principal','resultado_cierre','trabajo_completado')) $$,
  '10. responsable cierra su visita como completada'
);
select is((select count(*)::integer from ot_visitas where ot_id='55000000-0000-0000-0000-000000000001' and estado='EN_CURSO'),0,'11. no quedan visitas activas');
select throws_matching(
  $$ select finalize_work_order_technical('55000000-0000-0000-0000-000000000001','Intento prematuro') $$,
  '.*trabajo pendiente.*',
  '12. no se puede finalizar globalmente si la última visita de un técnico quedó pendiente'
);
select is((select estado from ordenes_trabajo where id='55000000-0000-0000-0000-000000000001'),'EN_CURSO','13. el rechazo mantiene la OT operativa');

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000003',true);
select lives_ok($$ select start_work_order_visit('55000000-0000-0000-0000-000000000001') $$,'14. colaborador abre la visita de resolución');
select lives_ok(
  $$ select close_my_work_order_visit('55000000-0000-0000-0000-000000000001',jsonb_build_object('trabajo_realizado','Segunda intervención resuelta','resultado_cierre','trabajo_completado')) $$,
  '15. visita posterior resuelve el pendiente sin borrar histórico'
);
select is(
  (select count(*)::integer from ot_visitas where ot_id='55000000-0000-0000-0000-000000000001' and tecnico_id='15000000-0000-0000-0000-000000000003'),
  2,
  '16. se conservan ambas visitas del colaborador'
);

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000002',true);
select lives_ok(
  $$ select finalize_work_order_technical('55000000-0000-0000-0000-000000000001','Trabajo completado por el equipo') $$,
  '17. el responsable finaliza cuando las últimas visitas de todos están resueltas'
);
select is(
  (select estado from ordenes_trabajo where id='55000000-0000-0000-0000-000000000001'),
  'FINALIZADA_TECNICO',
  '18. OT queda pendiente de validación administrativa'
);

select * from finish();
rollback;
