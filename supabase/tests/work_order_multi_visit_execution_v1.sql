-- OT-06C: ejecución por participante activo y múltiples visitas por OT.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(27);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('14000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','multi-admin-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('14000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','multi-resp-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('14000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','multi-collab-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('14000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','multi-other-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('14000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','multi-reader-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('14000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','multi-admin-b@example.test','not-used',now(),'{}','{}',now(),now()),
  ('14000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','multi-tech-b@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre) values
  ('24000000-0000-0000-0000-000000000001','Tenant Multi A'),
  ('24000000-0000-0000-0000-000000000002','Tenant Multi B');
insert into clientes(id,tenant_id,nombre) values
  ('34000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','Cliente Multi A'),
  ('34000000-0000-0000-0000-000000000002','24000000-0000-0000-0000-000000000002','Cliente Multi B');
insert into instalaciones(id,tenant_id,cliente_id,nombre) values
  ('44000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001','Instalación Multi A'),
  ('44000000-0000-0000-0000-000000000002','24000000-0000-0000-0000-000000000002','34000000-0000-0000-0000-000000000002','Instalación Multi B');
insert into tenant_members(tenant_id,user_id,role,cliente_id) values
  ('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','admin_cliente',null),
  ('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000002','tecnico',null),
  ('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000003','tecnico_externo',null),
  ('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000004','tecnico',null),
  ('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000005','cliente_lectura','34000000-0000-0000-0000-000000000001'),
  ('24000000-0000-0000-0000-000000000002','14000000-0000-0000-0000-000000000006','admin_cliente',null),
  ('24000000-0000-0000-0000-000000000002','14000000-0000-0000-0000-000000000007','tecnico',null);

insert into ordenes_trabajo(
  id,tenant_id,cliente_id,codigo_ot,instalacion_id,titulo,tipo,prioridad,estado,
  assigned_to,assigned_by,assigned_at,created_by,configuracion
) values (
  '54000000-0000-0000-0000-000000000001',
  '24000000-0000-0000-0000-000000000001',
  '34000000-0000-0000-0000-000000000001',
  'OT-MULTI-A-1',
  '44000000-0000-0000-0000-000000000001',
  'OT multi visita A',
  'averia','normal','ASIGNADA',
  '14000000-0000-0000-0000-000000000002',
  '14000000-0000-0000-0000-000000000001',now(),
  '14000000-0000-0000-0000-000000000001',
  '{}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000001',true);

select lives_ok(
  $$ select set_work_order_collaborator('54000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000003',true,'Apoyo multi visita') $$,
  '1. manager añade colaborador antes de ejecutar'
);

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000002',true);
select ok(can_execute_work_order('24000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001'),'2. responsable puede ejecutar la OT');
select ok(can_access_work_order('54000000-0000-0000-0000-000000000001'),'3. responsable puede leer la OT');

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000003',true);
select ok(can_execute_work_order('24000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001'),'4. colaborador activo puede ejecutar la OT');
select ok(can_access_work_order('54000000-0000-0000-0000-000000000001'),'5. colaborador activo puede leer la OT');
select is((select count(*)::integer from ordenes_trabajo where id='54000000-0000-0000-0000-000000000001'),1,'6. RLS muestra la OT al colaborador');

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000004',true);
select ok(not can_execute_work_order('24000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001'),'7. técnico no participante no puede ejecutar');
select ok(not can_access_work_order('54000000-0000-0000-0000-000000000001'),'8. técnico no participante no puede acceder');
select is((select count(*)::integer from ordenes_trabajo where id='54000000-0000-0000-0000-000000000001'),0,'9. RLS oculta la OT al técnico no participante');
select throws_matching(
  $$ select start_work_order_visit('54000000-0000-0000-0000-000000000001') $$,
  '.*No tienes permiso sobre esta OT.*',
  '10. técnico no participante no puede iniciar visita'
);

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000003',true);
select throws_matching(
  $$ select accept_work_order('54000000-0000-0000-0000-000000000001') $$,
  '.*Solo el técnico asignado puede aceptar.*',
  '11. colaborador no puede aceptar la OT global'
);

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000002',true);
select lives_ok(
  $$ select accept_work_order('54000000-0000-0000-0000-000000000001') $$,
  '12. responsable acepta la OT'
);

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000003',true);
select lives_ok(
  $$ select start_work_order_visit('54000000-0000-0000-0000-000000000001') $$,
  '13. colaborador abre su visita desde ACEPTADA'
);
select is((select estado from ordenes_trabajo where id='54000000-0000-0000-0000-000000000001'),'EN_CURSO','14. primera visita deja la OT EN_CURSO');

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000002',true);
select lives_ok(
  $$ select start_work_order_visit('54000000-0000-0000-0000-000000000001') $$,
  '15. responsable abre su visita mientras la OT ya está EN_CURSO'
);
select is(
  (select count(*)::integer from ot_visitas where ot_id='54000000-0000-0000-0000-000000000001' and estado='EN_CURSO'),
  2,
  '16. dos técnicos distintos pueden tener visitas simultáneas'
);
select is(
  (select count(distinct tecnico_id)::integer from ot_visitas where ot_id='54000000-0000-0000-0000-000000000001' and estado='EN_CURSO'),
  2,
  '17. las visitas activas pertenecen a técnicos distintos'
);
select throws_matching(
  $$ select start_work_order_visit('54000000-0000-0000-0000-000000000001') $$,
  '.*Ya tienes una visita en curso.*',
  '18. un técnico no puede abrir una segunda visita activa en la misma OT'
);

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000003',true);
select throws_matching(
  $$ select block_work_order('54000000-0000-0000-0000-000000000001','BLOQUEADA','Necesito material') $$,
  '.*Solo el técnico asignado puede bloquear.*',
  '19. colaborador no controla el bloqueo global'
);

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000002',true);
select lives_ok(
  $$ select block_work_order('54000000-0000-0000-0000-000000000001','BLOQUEADA','Necesito material') $$,
  '20. responsable puede bloquear la OT global'
);

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000003',true);
select throws_matching(
  $$ select resume_work_order('54000000-0000-0000-0000-000000000001') $$,
  '.*Solo el técnico asignado puede reanudar.*',
  '21. colaborador no controla la reanudación global'
);

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000002',true);
select lives_ok(
  $$ select resume_work_order('54000000-0000-0000-0000-000000000001') $$,
  '22. responsable puede reanudar la OT global'
);
select throws_matching(
  $$ select finalize_active_work_order_visit('54000000-0000-0000-0000-000000000001',jsonb_build_object('trabajo_realizado','Intento de cierre global')) $$,
  '.*No se puede finalizar la OT mientras existan visitas en curso.*',
  '23. responsable no puede cerrar toda la OT mientras otra visita siga activa'
);
select is(
  (select count(*)::integer from ot_visitas where ot_id='54000000-0000-0000-0000-000000000001' and estado='EN_CURSO'),
  2,
  '24. el cierre global fallido revierte y conserva ambas visitas activas'
);

select throws_ok(
  $$ select finalize_work_order_visit((select id from ot_visitas where ot_id='54000000-0000-0000-0000-000000000001' limit 1),'{}'::jsonb) $$,
  '42501'::character(5),
  'permission denied for function finalize_work_order_visit',
  '25. la RPC legacy por visit_id ya no está expuesta a authenticated'
);
select is(
  (
    has_table_privilege('authenticated','public.ot_visitas','INSERT')
    or has_table_privilege('authenticated','public.ot_visitas','UPDATE')
    or has_table_privilege('authenticated','public.ot_visitas','DELETE')
  ),
  false,
  '26. authenticated no dispone de DML directo sobre ot_visitas'
);
select is(
  (select count(*)::integer from pg_indexes where schemaname='public' and tablename='ot_visitas' and indexname='ot_visitas_tecnico_activa_uq'),
  1,
  '27. existe el índice único de una visita activa por OT+técnico'
);

select * from finish();
rollback;
