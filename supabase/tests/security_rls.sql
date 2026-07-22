-- Pruebas de aislamiento y ejecución. Ejecutar con `npx supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

-- Usuarios y contexto de prueba aislados dentro de la transacción.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tech-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tech-b@example.test','not-used',now(),'{}','{}',now(),now()),
  ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-b@example.test','not-used',now(),'{}','{}',now(),now()),
  ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-email@example.test','not-used',now(),'{}','{}',now(),now());

insert into tenants(id,nombre) values
  ('20000000-0000-0000-0000-000000000001','Tenant A'),
  ('20000000-0000-0000-0000-000000000002','Tenant B');
insert into clientes(id,tenant_id,nombre) values
  ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Cliente A'),
  ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Cliente B');
insert into instalaciones(id,tenant_id,cliente_id,nombre) values
  ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Instalación A'),
  ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','Instalación B');
insert into tenant_members(tenant_id,user_id,role) values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','admin_cliente'),
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','tecnico'),
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','tecnico'),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004','admin_cliente');
insert into ordenes_trabajo(id,tenant_id,cliente_id,codigo_ot,instalacion_id,titulo,tipo,prioridad,estado,assigned_to,created_by) values
  ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','OT-TEST-A1','40000000-0000-0000-0000-000000000001','OT técnico A','revision','normal','EN_CURSO','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','OT-TEST-A2','40000000-0000-0000-0000-000000000001','OT técnico B','revision','normal','EN_CURSO','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','OT-TEST-B1','40000000-0000-0000-0000-000000000002','OT tenant B','revision','normal','ASIGNADA','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000004'),
  ('50000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','OT-TEST-A3','40000000-0000-0000-0000-000000000001','OT validada','revision','normal','VALIDADA','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');
insert into storage.objects(id,bucket_id,name,owner) values
  ('60000000-0000-0000-0000-000000000001','ot-photos','20000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001/foto/60000000-0000-0000-0000-000000000001-evidence.jpg','10000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000002','ot-photos','20000000-0000-0000-0000-000000000002/50000000-0000-0000-0000-000000000003/foto/60000000-0000-0000-0000-000000000002-evidence.jpg','10000000-0000-0000-0000-000000000004');
insert into tenant_invitations(id,tenant_id,nombre,email,role,invitation_token,created_by) values
  ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Invitado','invitee@example.test','tecnico','80000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from ordenes_trabajo), 3, '1. administrador ve las OT de su tenant');
select is((select count(*)::integer from ordenes_trabajo where tenant_id='20000000-0000-0000-0000-000000000002'), 0, '2. administrador no ve otro tenant');
select lives_ok(
  $$
    select create_work_order(
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      'Borrador creado con RLS',
      null,
      'mantenimiento_preventivo',
      'normal',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      '{}'::jsonb
    )
  $$,
  '3. administrador crea una OT y recibe la fila mediante RETURNING'
);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from ordenes_trabajo), 2, '4. técnico ve únicamente sus OT asignadas');
select is((select count(*)::integer from ordenes_trabajo where id='50000000-0000-0000-0000-000000000002'), 0, '5. técnico no ve OT de otro técnico');
select throws_matching($$ update ordenes_trabajo set assigned_to='10000000-0000-0000-0000-000000000003' where id='50000000-0000-0000-0000-000000000001' $$, '.*definición, prioridad ni asignación.*', '6. técnico no puede reasignar una OT');
select throws_matching($$ update ordenes_trabajo set prioridad='critica' where id='50000000-0000-0000-0000-000000000001' $$, '.*definición, prioridad ni asignación.*', '7. técnico no puede cambiar prioridad ni cliente');
select lives_ok($$ select register_work_order_photo('50000000-0000-0000-0000-000000000001','evidencia','20000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001/foto/60000000-0000-0000-0000-000000000001-evidence.jpg','evidence.jpg','image/jpeg',128,null) $$, '8. técnico puede añadir evidencia privada a su OT ejecutable');
select throws_matching($$ select register_work_order_photo('50000000-0000-0000-0000-000000000003','evidencia','20000000-0000-0000-0000-000000000002/50000000-0000-0000-0000-000000000003/foto/60000000-0000-0000-0000-000000000002-evidence.jpg','other.jpg','image/jpeg',128,null) $$, '.*Solo el técnico asignado.*', '9. técnico no añade evidencia a OT ajena');
select throws_matching($$ update ordenes_trabajo set titulo='Cambio prohibido' where id='50000000-0000-0000-0000-000000000004' $$, '.*inmutable.*', '10. una OT validada no puede modificarse');
select throws_matching($$ select accept_work_order('50000000-0000-0000-0000-000000000001') $$, '.*Solo el técnico asignado.*', '11. transición inválida es rechazada');
select is((select count(*)::integer from storage.objects where bucket_id='ot-photos' and name like '20000000-0000-0000-0000-000000000002/%'), 0, '12. Storage no permite acceso cruzado entre tenants');
select throws_matching($$ select accept_tenant_invitation('80000000-0000-0000-0000-000000000001') $$, '.*otro correo.*', '13. invitación no se acepta por email diferente');

select * from finish();
rollback;
