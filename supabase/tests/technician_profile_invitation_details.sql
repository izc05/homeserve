-- Contrato de datos adicionales para técnicos e invitaciones.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);

select ok(exists (select 1 from pg_attribute where attrelid = 'public.profiles'::regclass and attname = 'telefono' and not attisdropped), '1. profiles contiene telefono');
select ok(exists (select 1 from pg_attribute where attrelid = 'public.tenant_members'::regclass and attname = 'especialidad' and not attisdropped), '2. tenant_members contiene especialidad');
select ok(exists (select 1 from pg_attribute where attrelid = 'public.tenant_invitations'::regclass and attname = 'telefono' and not attisdropped), '3. tenant_invitations contiene telefono');
select ok(exists (select 1 from pg_attribute where attrelid = 'public.tenant_invitations'::regclass and attname = 'especialidad' and not attisdropped), '4. tenant_invitations contiene especialidad');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('14000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'details-admin@example.test', 'not-used', now(), '{}', '{}', now(), now()),
  ('14000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'details-tech@example.test', 'not-used', now(), '{}', '{}', now(), now()),
  ('14000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'details-invitee@example.test', 'not-used', now(), '{}', '{}', now(), now()),
  ('14000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'details-other@example.test', 'not-used', now(), '{}', '{}', now(), now()),
  ('14000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'details-admin-b@example.test', 'not-used', now(), '{}', '{}', now(), now());

insert into tenants (id, nombre)
values
  ('24000000-0000-0000-0000-000000000001', 'Tenant técnicos A'),
  ('24000000-0000-0000-0000-000000000002', 'Tenant técnicos B');

insert into tenant_members (tenant_id, user_id, role, especialidad)
values
  ('24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'admin_cliente', null),
  ('24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', 'tecnico', 'Especialidad anterior'),
  ('24000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000005', 'admin_cliente', null);

update profiles
set telefono = '+34 600 000 002'
where id = '14000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000001', true);

create temporary table detailed_invitation_token (token uuid not null) on commit drop;
insert into detailed_invitation_token (token)
select invitation_token
from public.create_tenant_invitation_with_details(
  '24000000-0000-0000-0000-000000000001',
  '  DETAILS-INVITEE@example.test ',
  'tecnico',
  false,
  '  Técnica invitada ',
  ' +34 600 000 003 ',
  '  Fotovoltaica '
);

select ok((select token is not null from detailed_invitation_token), '5. admin puede crear invitación con detalles');

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000002', true);
select throws_matching(
  $$ select public.create_tenant_invitation_with_details('24000000-0000-0000-0000-000000000001', 'forbidden@example.test', 'tecnico', false, null, null, null) $$,
  '.*No tienes permiso para invitar usuarios.*',
  '6. un técnico no puede crear invitaciones'
);

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000001', true);
select is(
  (
    select jsonb_build_object('email', email, 'telefono', telefono, 'especialidad', especialidad)
    from tenant_invitations
    where invitation_token = (select token from detailed_invitation_token)
  ),
  jsonb_build_object('email', 'details-invitee@example.test', 'telefono', '+34 600 000 003', 'especialidad', 'Fotovoltaica'),
  '7. la invitación guarda teléfono y especialidad normalizados'
);

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000003', true);
select public.accept_tenant_invitation((select token from detailed_invitation_token));
select is((select telefono from profiles where id = '14000000-0000-0000-0000-000000000003'), '+34 600 000 003', '8. al aceptar, teléfono pasa a profiles');
select is((select especialidad from tenant_members where tenant_id = '24000000-0000-0000-0000-000000000001' and user_id = '14000000-0000-0000-0000-000000000003'), 'Fotovoltaica', '9. al aceptar, especialidad pasa a tenant_members');

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000001', true);
create temporary table detail_free_invitation_token (token uuid not null) on commit drop;
insert into detail_free_invitation_token (token)
select invitation_token
from public.create_tenant_invitation_with_details(
  '24000000-0000-0000-0000-000000000001',
  'details-tech@example.test',
  'tecnico',
  false,
  null,
  null,
  null
);

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000002', true);
select public.accept_tenant_invitation((select token from detail_free_invitation_token));
select is(
  (
    select jsonb_build_object(
      'telefono', (select telefono from profiles where id = '14000000-0000-0000-0000-000000000002'),
      'especialidad', (select especialidad from tenant_members where tenant_id = '24000000-0000-0000-0000-000000000001' and user_id = '14000000-0000-0000-0000-000000000002')
    )
  ),
  jsonb_build_object('telefono', '+34 600 000 002', 'especialidad', 'Especialidad anterior'),
  '10. una invitación sin detalles conserva teléfono y especialidad existentes'
);

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000001', true);
create temporary table other_email_invitation_token (token uuid not null) on commit drop;
insert into other_email_invitation_token (token)
select invitation_token
from public.create_tenant_invitation_with_details(
  '24000000-0000-0000-0000-000000000001',
  'details-invitee@example.test',
  'tecnico',
  false,
  null,
  null,
  null
);

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000004', true);
select throws_matching(
  $$ select public.accept_tenant_invitation((select token from other_email_invitation_token)) $$,
  '.*otro correo.*',
  '11. otro correo no puede aceptar la invitación'
);

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::integer from tenant_invitations where tenant_id = '24000000-0000-0000-0000-000000000001'),
  0,
  '12. otro tenant no puede leer los detalles de invitaciones'
);

select * from finish();
rollback;
