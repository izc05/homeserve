-- Contrato aditivo de contactos para clientes e instalaciones.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

select ok(
  exists (
    select 1 from pg_attribute
    where attrelid = 'public.clientes'::regclass
      and attname = 'cif_nif'
      and not attisdropped
  ),
  '1. clientes contiene cif_nif'
);

select ok(
  exists (
    select 1 from pg_attribute
    where attrelid = 'public.clientes'::regclass
      and attname = 'contacto_nombre'
      and not attisdropped
  ),
  '2. clientes contiene contacto_nombre'
);

select ok(
  exists (
    select 1 from pg_attribute
    where attrelid = 'public.instalaciones'::regclass
      and attname = 'contacto_nombre'
      and not attisdropped
  ),
  '3. instalaciones contiene contacto_nombre'
);

select ok(
  exists (
    select 1 from pg_attribute
    where attrelid = 'public.instalaciones'::regclass
      and attname = 'contacto_telefono'
      and not attisdropped
  ),
  '4. instalaciones contiene contacto_telefono'
);

select ok(
  exists (
    select 1 from pg_attribute
    where attrelid = 'public.instalaciones'::regclass
      and attname = 'contacto_email'
      and not attisdropped
  ),
  '5. instalaciones contiene contacto_email'
);

select ok(
  not exists (
    select 1
    from pg_attribute
    where attrelid in ('public.clientes'::regclass, 'public.instalaciones'::regclass)
      and attname in ('cif_nif', 'contacto_nombre', 'contacto_telefono', 'contacto_email')
      and attnotnull
  ),
  '6. los campos de contacto admiten null para registros existentes'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('13000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'contacts-admin-a@example.test', 'not-used', now(), '{}', '{}', now(), now()),
  ('13000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'contacts-admin-b@example.test', 'not-used', now(), '{}', '{}', now(), now());

insert into tenants (id, nombre)
values
  ('23000000-0000-0000-0000-000000000001', 'Tenant contactos A'),
  ('23000000-0000-0000-0000-000000000002', 'Tenant contactos B');

insert into clientes (id, tenant_id, nombre)
values
  ('33000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Cliente contactos A'),
  ('33000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'Cliente contactos B');

insert into instalaciones (id, tenant_id, cliente_id, nombre)
values
  ('43000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 'Instalación contactos A'),
  ('43000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000002', 'Instalación contactos B');

insert into tenant_members (tenant_id, user_id, role)
values
  ('23000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'admin_cliente'),
  ('23000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'admin_cliente');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000001', true);

update public.clientes
set cif_nif = 'B-12345678',
    contacto_nombre = 'Contacto cliente A'
where id = '33000000-0000-0000-0000-000000000001';

update public.instalaciones
set contacto_nombre = 'Contacto instalación A',
    contacto_telefono = '+34 600 000 001',
    contacto_email = 'instalacion-a@example.test'
where id = '43000000-0000-0000-0000-000000000001';

select is(
  (
    select jsonb_build_object(
      'cif_nif', customer.cif_nif,
      'customer_contact', customer.contacto_nombre,
      'installation_contact', installation.contacto_nombre,
      'installation_phone', installation.contacto_telefono,
      'installation_email', installation.contacto_email
    )
    from public.clientes customer
    join public.instalaciones installation on installation.cliente_id = customer.id
    where customer.id = '33000000-0000-0000-0000-000000000001'
  ),
  jsonb_build_object(
    'cif_nif', 'B-12345678',
    'customer_contact', 'Contacto cliente A',
    'installation_contact', 'Contacto instalación A',
    'installation_phone', '+34 600 000 001',
    'installation_email', 'instalacion-a@example.test'
  ),
  '7. un administrador guarda y recupera los valores de contacto'
);

select set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::integer from public.clientes where id = '33000000-0000-0000-0000-000000000001'),
  0,
  '8. otro tenant no puede leer los contactos mediante RLS'
);

select set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ update public.clientes set estado = 'activo' where id = '33000000-0000-0000-0000-000000000001' $$,
  '9. el estado activo continúa siendo válido'
);

select throws_matching(
  $$ update public.clientes set estado = 'activa' where id = '33000000-0000-0000-0000-000000000001' $$,
  '.*violates check constraint.*',
  '10. el estado activa continúa siendo rechazado'
);

select * from finish();
rollback;
