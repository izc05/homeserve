-- OT-06A: contrato SQL de participantes por OT.
-- Ejecutar con `npx supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(21);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('12000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','part-admin-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('12000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','part-tech-a1@example.test','not-used',now(),'{}','{}',now(),now()),
  ('12000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','part-tech-a2@example.test','not-used',now(),'{}','{}',now(),now()),
  ('12000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','part-reader-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('12000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','part-admin-b@example.test','not-used',now(),'{}','{}',now(),now()),
  ('12000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','part-tech-b@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre) values
  ('22000000-0000-0000-0000-000000000001','Tenant Participantes A'),
  ('22000000-0000-0000-0000-000000000002','Tenant Participantes B');

insert into clientes(id,tenant_id,nombre) values
  ('32000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','Cliente Participantes A'),
  ('32000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','Cliente Participantes B');

insert into instalaciones(id,tenant_id,cliente_id,nombre) values
  ('42000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','Instalación Participantes A'),
  ('42000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000002','Instalación Participantes B');

insert into tenant_members(tenant_id,user_id,role) values
  ('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','admin_cliente'),
  ('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','tecnico'),
  ('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000003','tecnico_externo'),
  ('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000004','cliente_lectura'),
  ('22000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000005','admin_cliente'),
  ('22000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000006','tecnico');

-- Estas inserciones se realizan como owner del test y disparan el trigger de
-- sincronización responsable igual que lo hará create_work_order/assign_work_order.
insert into ordenes_trabajo(
  id,tenant_id,cliente_id,codigo_ot,instalacion_id,titulo,tipo,prioridad,estado,
  assigned_to,assigned_by,assigned_at,created_by
) values
  ('52000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','OT-PART-A-1','42000000-0000-0000-0000-000000000001','OT participantes A1','averia','normal','ASIGNADA','12000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000001',now(),'12000000-0000-0000-0000-000000000001'),
  ('52000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','OT-PART-A-2','42000000-0000-0000-0000-000000000001','OT sin responsable','averia','normal','BORRADOR',null,null,null,'12000000-0000-0000-0000-000000000001'),
  ('52000000-0000-0000-0000-000000000003','22000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000002','OT-PART-B-1','42000000-0000-0000-0000-000000000002','OT participantes B1','averia','normal','ASIGNADA','12000000-0000-0000-0000-000000000006','12000000-0000-0000-0000-000000000005',now(),'12000000-0000-0000-0000-000000000005');

select has_table('public','ot_participantes','1. existe la tabla ot_participantes');
select is(
  (select relrowsecurity from pg_class where oid='public.ot_participantes'::regclass),
  true,
  '2. RLS está habilitado en ot_participantes'
);
select is(
  (select count(*)::integer from pg_trigger where tgrelid='public.ordenes_trabajo'::regclass and tgname='sync_work_order_responsible_participant' and not tgisinternal),
  1,
  '3. existe trigger de sincronización assigned_to → responsable'
);
select is(
  (select count(*)::integer from ot_participantes where ot_id='52000000-0000-0000-0000-000000000001' and tecnico_id='12000000-0000-0000-0000-000000000002' and rol='responsable' and estado='activo'),
  1,
  '4. assigned_to crea responsable activo automáticamente'
);
select is(
  (select tecnico_id from ot_participantes where ot_id='52000000-0000-0000-0000-000000000001' and rol='responsable' and estado='activo'),
  (select assigned_to from ordenes_trabajo where id='52000000-0000-0000-0000-000000000001'),
  '5. responsable activo coincide con assigned_to'
);
select is(
  (select count(*)::integer from ot_participantes where ot_id='52000000-0000-0000-0000-000000000002'),
  0,
  '6. OT sin assigned_to no inventa responsable'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000001',true);
select is(
  (select count(*)::integer from ot_participantes),
  1,
  '7. administrador A ve participantes de su tenant pero no tenant B'
);

select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000002',true);
select is(
  (select count(*)::integer from ot_participantes where ot_id='52000000-0000-0000-0000-000000000001'),
  1,
  '8. técnico responsable ve su participación'
);

select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000003',true);
select is(
  (select count(*)::integer from ot_participantes where ot_id='52000000-0000-0000-0000-000000000001'),
  0,
  '9. técnico no participante no ve la participación de otra OT'
);

select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000001',true);
select throws_matching(
  $$ insert into ot_participantes(tenant_id,ot_id,tecnico_id,rol,added_by)
     values ('22000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000003','colaborador','12000000-0000-0000-0000-000000000001') $$,
  '.*permission denied.*',
  '10. authenticated no puede insertar participantes directamente'
);
select throws_matching(
  $$ update ot_participantes set rol='colaborador' where ot_id='52000000-0000-0000-0000-000000000001' $$,
  '.*permission denied.*',
  '11. authenticated no puede editar participantes directamente'
);

select lives_ok(
  $$ update ordenes_trabajo
     set assigned_to='12000000-0000-0000-0000-000000000003', assigned_by='12000000-0000-0000-0000-000000000001', assigned_at=now()
     where id='52000000-0000-0000-0000-000000000001' $$,
  '12. cambiar assigned_to a otro técnico activo sincroniza responsable'
);
select is(
  (select count(*)::integer from ot_participantes where ot_id='52000000-0000-0000-0000-000000000001' and tecnico_id='12000000-0000-0000-0000-000000000002' and estado='retirado' and removed_at is not null),
  1,
  '13. responsable anterior queda retirado con fecha'
);
select is(
  (select count(*)::integer from ot_participantes where ot_id='52000000-0000-0000-0000-000000000001' and tecnico_id='12000000-0000-0000-0000-000000000003' and rol='responsable' and estado='activo'),
  1,
  '14. nuevo assigned_to queda como responsable activo'
);

select throws_matching(
  $$ update ordenes_trabajo
     set assigned_to='12000000-0000-0000-0000-000000000004'
     where id='52000000-0000-0000-0000-000000000001' $$,
  '.*responsable debe ser un técnico activo del tenant.*',
  '15. usuario no técnico no puede convertirse en responsable'
);
select throws_matching(
  $$ update ordenes_trabajo
     set assigned_to='12000000-0000-0000-0000-000000000006'
     where id='52000000-0000-0000-0000-000000000001' $$,
  '.*responsable debe ser un técnico activo del tenant.*',
  '16. técnico de otro tenant no puede convertirse en responsable'
);

reset role;

select throws_matching(
  $$ insert into ot_participantes(tenant_id,ot_id,tecnico_id,rol,estado,added_by)
     values ('22000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000003','colaborador','activo','12000000-0000-0000-0000-000000000001') $$,
  '.*ot_participantes_tecnico_activo_uq.*',
  '17. no puede duplicarse el mismo técnico activo en la OT'
);
select throws_matching(
  $$ insert into ot_participantes(tenant_id,ot_id,tecnico_id,rol,estado,added_by)
     values ('22000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','responsable','activo','12000000-0000-0000-0000-000000000001') $$,
  '.*ot_participantes_responsable_activo_uq.*',
  '18. solo puede existir un responsable activo por OT'
);
select throws_matching(
  $$ update ot_participantes
     set removed_at=null
     where ot_id='52000000-0000-0000-0000-000000000001'
       and tecnico_id='12000000-0000-0000-0000-000000000002'
       and estado='retirado' $$,
  '.*ot_participantes_retiro_check.*',
  '19. participante retirado debe conservar removed_at'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000001',true);
select throws_matching(
  $$ delete from ot_participantes where ot_id='52000000-0000-0000-0000-000000000001' $$,
  '.*permission denied.*',
  '20. authenticated no dispone de borrado físico'
);
select is(
  (
    has_table_privilege('authenticated','public.ot_participantes','INSERT')
    or has_table_privilege('authenticated','public.ot_participantes','UPDATE')
    or has_table_privilege('authenticated','public.ot_participantes','DELETE')
  ),
  false,
  '21. authenticated solo tiene lectura directa de participantes'
);

select * from finish();
rollback;
