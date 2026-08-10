-- OT-06E: contrato de relevo de responsable.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(25);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('16000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','handover-admin-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('16000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','handover-outgoing@example.test','not-used',now(),'{}','{}',now(),now()),
  ('16000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','handover-incoming@example.test','not-used',now(),'{}','{}',now(),now()),
  ('16000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','handover-other-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('16000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','handover-admin-b@example.test','not-used',now(),'{}','{}',now(),now()),
  ('16000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','handover-tech-b@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre) values
  ('26000000-0000-0000-0000-000000000001','Tenant Handover A'),
  ('26000000-0000-0000-0000-000000000002','Tenant Handover B');
insert into clientes(id,tenant_id,nombre) values
  ('36000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','Cliente Handover A'),
  ('36000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000002','Cliente Handover B');
insert into instalaciones(id,tenant_id,cliente_id,nombre) values
  ('46000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','Instalación Handover A'),
  ('46000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000002','36000000-0000-0000-0000-000000000002','Instalación Handover B');
insert into tenant_members(tenant_id,user_id,role) values
  ('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','admin_cliente'),
  ('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000002','tecnico'),
  ('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000003','tecnico_externo'),
  ('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000004','tecnico'),
  ('26000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000005','admin_cliente'),
  ('26000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000006','tecnico');

insert into ordenes_trabajo(
  id,tenant_id,cliente_id,codigo_ot,instalacion_id,titulo,tipo,prioridad,estado,
  assigned_to,assigned_by,assigned_at,created_by,configuracion
) values
  ('56000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','OT-HAND-1','46000000-0000-0000-0000-000000000001','OT relevo con visita','averia','normal','ASIGNADA','16000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000001',now(),'16000000-0000-0000-0000-000000000001','{}'::jsonb),
  ('56000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','OT-HAND-2','46000000-0000-0000-0000-000000000001','OT relevo sin conservar saliente','revision','normal','ASIGNADA','16000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000001',now(),'16000000-0000-0000-0000-000000000001','{}'::jsonb);

select ok(to_regprocedure('public.handover_work_order_responsibility(uuid,uuid,text,boolean)') is not null,'1. existe RPC de relevo');
select ok(has_function_privilege('authenticated','public.handover_work_order_responsibility(uuid,uuid,text,boolean)','EXECUTE'),'2. authenticated puede invocar RPC controlada');
select ok(not has_function_privilege('anon','public.handover_work_order_responsibility(uuid,uuid,text,boolean)','EXECUTE'),'3. anon no puede invocar relevo');
select ok(not has_function_privilege('service_role','public.handover_work_order_responsibility(uuid,uuid,text,boolean)','EXECUTE'),'4. service_role no recibe relevo sin consumidor demostrado');
select ok((select prosecdef from pg_proc where oid=to_regprocedure('public.handover_work_order_responsibility(uuid,uuid,text,boolean)')),'5. relevo usa SECURITY DEFINER con validación interna');
select is((select proconfig from pg_proc where oid=to_regprocedure('public.handover_work_order_responsibility(uuid,uuid,text,boolean)')),array['search_path=pg_catalog']::text[],'6. relevo fija search_path seguro');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','16000000-0000-0000-0000-000000000001',true);
select lives_ok($$ select set_work_order_collaborator('56000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000003',true,'Preparar relevo') $$,'7. manager prepara al entrante como colaborador');

select set_config('request.jwt.claim.sub','16000000-0000-0000-0000-000000000002',true);
select lives_ok($$ select accept_work_order('56000000-0000-0000-0000-000000000001') $$,'8. responsable saliente acepta la OT');
select lives_ok($$ select start_work_order_visit('56000000-0000-0000-0000-000000000001') $$,'9. saliente inicia su visita');

select set_config('request.jwt.claim.sub','16000000-0000-0000-0000-000000000003',true);
select lives_ok($$ select start_work_order_visit('56000000-0000-0000-0000-000000000001') $$,'10. entrante colaborador inicia su visita');

select set_config('request.jwt.claim.sub','16000000-0000-0000-0000-000000000001',true);
select throws_matching(
  $$ select handover_work_order_responsibility('56000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000003','Relevo de turno',true) $$,
  '.*saliente debe cerrar su visita.*',
  '11. no se releva mientras el responsable saliente tenga visita activa'
);

select set_config('request.jwt.claim.sub','16000000-0000-0000-0000-000000000002',true);
select lives_ok(
  $$ select close_my_work_order_visit('56000000-0000-0000-0000-000000000001',jsonb_build_object('trabajo_realizado','Dejo diagnóstico y relevo','resultado_cierre','necesita_otra_visita')) $$,
  '12. saliente cierra su visita antes del relevo'
);

select set_config('request.jwt.claim.sub','16000000-0000-0000-0000-000000000003',true);
select throws_matching(
  $$ select handover_work_order_responsibility('56000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000004','Intento técnico',false) $$,
  '.*No tienes permiso para realizar el relevo.*',
  '13. un técnico no manager no ejecuta el relevo'
);

select set_config('request.jwt.claim.sub','16000000-0000-0000-0000-000000000001',true);
select throws_matching(
  $$ select handover_work_order_responsibility('56000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000003','abc',true) $$,
  '.*nota de relevo.*',
  '14. relevo exige nota suficiente'
);
select throws_matching(
  $$ select handover_work_order_responsibility('56000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000006','Técnico de otro tenant',false) $$,
  '.*entrante no está activo en este tenant.*',
  '15. relevo rechaza técnico de otro tenant'
);
select lives_ok(
  $$ select handover_work_order_responsibility('56000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000003','Cambio de turno documentado',true) $$,
  '16. manager realiza relevo al colaborador activo'
);
select is((select assigned_to from ordenes_trabajo where id='56000000-0000-0000-0000-000000000001'),'16000000-0000-0000-0000-000000000003'::uuid,'17. assigned_to pasa al técnico entrante');
select is((select count(*)::integer from ot_participantes where ot_id='56000000-0000-0000-0000-000000000001' and tecnico_id='16000000-0000-0000-0000-000000000003' and rol='responsable' and estado='activo'),1,'18. colaborador entrante es promovido a responsable sin duplicarse');
select is((select count(*)::integer from ot_participantes where ot_id='56000000-0000-0000-0000-000000000001' and tecnico_id='16000000-0000-0000-0000-000000000002' and rol='responsable' and estado='retirado'),1,'19. responsabilidad saliente queda preservada en histórico');
select is((select count(*)::integer from ot_participantes where ot_id='56000000-0000-0000-0000-000000000001' and tecnico_id='16000000-0000-0000-0000-000000000002' and rol='colaborador' and estado='activo'),1,'20. saliente queda como colaborador cuando se solicita');
select is((select count(*)::integer from ot_visitas where ot_id='56000000-0000-0000-0000-000000000001' and tecnico_id='16000000-0000-0000-0000-000000000003' and estado='EN_CURSO'),1,'21. visita activa del entrante se conserva durante el relevo');
select ok(can_execute_work_order('26000000-0000-0000-0000-000000000001','56000000-0000-0000-0000-000000000001'),'22. nuevo responsable continúa pudiendo ejecutar la OT');
select throws_matching(
  $$ select handover_work_order_responsibility('56000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000003','Mismo responsable',false) $$,
  '.*ya es el responsable.*',
  '23. no se permite relevo al mismo responsable'
);
select is((select count(*)::integer from audit_logs where entity_id='56000000-0000-0000-0000-000000000001' and action='handover_work_order_responsibility'),1,'24. relevo queda auditado una sola vez');

select lives_ok(
  $$ select handover_work_order_responsibility('56000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000004','Relevo sin conservar saliente',false) $$,
  '25. se puede relevar sin mantener al responsable anterior como colaborador'
);

select * from finish();
rollback;
