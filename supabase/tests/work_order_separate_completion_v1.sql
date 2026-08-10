-- OT-06D: cerrar mi visita y finalizar la OT como acciones independientes.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(28);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('15000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','complete-admin@example.test','not-used',now(),'{}','{}',now(),now()),
  ('15000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','complete-resp@example.test','not-used',now(),'{}','{}',now(),now()),
  ('15000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','complete-collab@example.test','not-used',now(),'{}','{}',now(),now()),
  ('15000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','complete-other@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre)
values ('25000000-0000-0000-0000-000000000001','Tenant Completion');
insert into clientes(id,tenant_id,nombre)
values ('35000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','Cliente Completion');
insert into instalaciones(id,tenant_id,cliente_id,nombre)
values ('45000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','Instalación Completion');
insert into tenant_members(tenant_id,user_id,role) values
  ('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','admin_cliente'),
  ('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000002','tecnico'),
  ('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000003','tecnico_externo'),
  ('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000004','tecnico');

insert into ordenes_trabajo(
  id,tenant_id,cliente_id,codigo_ot,instalacion_id,titulo,tipo,prioridad,estado,
  assigned_to,assigned_by,assigned_at,created_by,configuracion
) values
  ('55000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','OT-COMP-1','45000000-0000-0000-0000-000000000001','OT completion multi','averia','normal','ASIGNADA','15000000-0000-0000-0000-000000000002','15000000-0000-0000-0000-000000000001',now(),'15000000-0000-0000-0000-000000000001','{}'::jsonb),
  ('55000000-0000-0000-0000-000000000002','25000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','OT-COMP-2','45000000-0000-0000-0000-000000000001','OT compatibility wrapper','revision','normal','ASIGNADA','15000000-0000-0000-0000-000000000002','15000000-0000-0000-0000-000000000001',now(),'15000000-0000-0000-0000-000000000001','{}'::jsonb);

select ok(to_regprocedure('public.close_my_work_order_visit(uuid,jsonb)') is not null,'1. existe close_my_work_order_visit');
select ok(to_regprocedure('public.finalize_work_order_technical(uuid,text)') is not null,'2. existe finalize_work_order_technical');
select ok(has_function_privilege('authenticated','public.close_my_work_order_visit(uuid,jsonb)','EXECUTE'),'3. authenticated puede cerrar su visita mediante RPC');
select ok(has_function_privilege('authenticated','public.finalize_work_order_technical(uuid,text)','EXECUTE'),'4. authenticated puede invocar la RPC de cierre técnico, que valida actor');
select ok(not has_function_privilege('anon','public.close_my_work_order_visit(uuid,jsonb)','EXECUTE'),'5. anon no ejecuta cierre de visita');
select ok(not has_function_privilege('authenticated','private.assert_work_order_completion_requirements(uuid,uuid,jsonb)','EXECUTE'),'6. helper de requisitos no está expuesto a authenticated');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000001',true);
select lives_ok(
  $$ select set_work_order_collaborator('55000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000003',true,'Apoyo cierre separado') $$,
  '7. manager añade colaborador'
);

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000002',true);
select lives_ok($$ select accept_work_order('55000000-0000-0000-0000-000000000001') $$,'8. responsable acepta la OT');
select lives_ok($$ select start_work_order_visit('55000000-0000-0000-0000-000000000001') $$,'9. responsable inicia su visita');

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000003',true);
select lives_ok($$ select start_work_order_visit('55000000-0000-0000-0000-000000000001') $$,'10. colaborador inicia su visita');
select lives_ok(
  $$ select close_my_work_order_visit('55000000-0000-0000-0000-000000000001',jsonb_build_object('trabajo_realizado','Apoyo y comprobaciones','trabajo_pendiente','Esperar cierre responsable','resultado_cierre','necesita_otra_visita')) $$,
  '11. colaborador cierra únicamente su visita'
);
select is(
  (select estado from ordenes_trabajo where id='55000000-0000-0000-0000-000000000001'),
  'EN_CURSO',
  '12. cerrar visita colaborador no finaliza la OT'
);
select is(
  (select count(*)::integer from ot_visitas where ot_id='55000000-0000-0000-0000-000000000001' and tecnico_id='15000000-0000-0000-0000-000000000003' and estado='FINALIZADA' and trabajo_realizado='Apoyo y comprobaciones' and resultado_cierre='necesita_otra_visita'),
  1,
  '13. visita colaborador conserva resultado y trabajo realizado'
);
select is(
  (select count(*)::integer from ot_visitas where ot_id='55000000-0000-0000-0000-000000000001' and tecnico_id='15000000-0000-0000-0000-000000000002' and estado='EN_CURSO'),
  1,
  '14. visita del responsable sigue activa'
);
select throws_matching(
  $$ select close_my_work_order_visit('55000000-0000-0000-0000-000000000001',jsonb_build_object('trabajo_realizado','Segundo cierre')) $$,
  '.*No tienes una visita en curso.*',
  '15. colaborador no puede cerrar dos veces una visita inexistente'
);
select throws_matching(
  $$ select finalize_work_order_technical('55000000-0000-0000-0000-000000000001','Intento colaborador') $$,
  '.*Solo el técnico responsable.*',
  '16. colaborador no puede finalizar globalmente la OT'
);

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000002',true);
select throws_matching(
  $$ select finalize_work_order_technical('55000000-0000-0000-0000-000000000001','Intento con visita activa') $$,
  '.*visitas en curso.*',
  '17. responsable no finaliza la OT mientras su visita siga activa'
);
select lives_ok(
  $$ select close_my_work_order_visit('55000000-0000-0000-0000-000000000001',jsonb_build_object('trabajo_realizado','Reparación principal','resultado_cierre','trabajo_completado')) $$,
  '18. responsable cierra su propia visita'
);
select is((select count(*)::integer from ot_visitas where ot_id='55000000-0000-0000-0000-000000000001' and estado='EN_CURSO'),0,'19. no quedan visitas activas');
select is((select estado from ordenes_trabajo where id='55000000-0000-0000-0000-000000000001'),'EN_CURSO','20. cerrar todas las visitas no finaliza automáticamente la OT');
select lives_ok(
  $$ select finalize_work_order_technical('55000000-0000-0000-0000-000000000001','Trabajo completado por el equipo') $$,
  '21. responsable finaliza técnicamente la OT de forma explícita'
);
select is(
  (select estado from ordenes_trabajo where id='55000000-0000-0000-0000-000000000001'),
  'FINALIZADA_TECNICO',
  '22. OT queda pendiente de revisión administrativa'
);
select is(
  (select trabajo_realizado from ordenes_trabajo where id='55000000-0000-0000-0000-000000000001'),
  'Trabajo completado por el equipo',
  '23. OT guarda resumen técnico global'
);
select is(
  (select count(*)::integer from audit_logs where entity_id='55000000-0000-0000-0000-000000000001' and action='close_work_order_visit'),
  2,
  '24. ambas visitas cerradas quedan auditadas'
);

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000001',true);
select lives_ok(
  $$ select review_work_order('55000000-0000-0000-0000-000000000001','correccion_solicitada','Revisar un detalle adicional') $$,
  '25. administración solicita corrección y reabre la OT'
);
select is((select estado from ordenes_trabajo where id='55000000-0000-0000-0000-000000000001'),'EN_CURSO','26. corrección devuelve la OT a EN_CURSO');

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000003',true);
select lives_ok($$ select start_work_order_visit('55000000-0000-0000-0000-000000000001') $$,'27. colaborador puede abrir una nueva visita tras corrección');
select is(
  (select count(*)::integer from ot_visitas where ot_id='55000000-0000-0000-0000-000000000001' and tecnico_id='15000000-0000-0000-0000-000000000003'),
  2,
  '28. nueva visita conserva intacta la visita histórica anterior'
);

select * from finish();
rollback;
