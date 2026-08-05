-- Permisos de medios privados, coordenadas y normalización de marca.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

insert into auth.users (id, email)
values
  ('b1100000-0000-4000-8000-000000000001', 'admin-media-a@example.test'),
  ('b1100000-0000-4000-8000-000000000002', 'coord-media-a@example.test'),
  ('b1100000-0000-4000-8000-000000000003', 'tech-media-a@example.test'),
  ('b1100000-0000-4000-8000-000000000004', 'admin-media-b@example.test');

insert into public.tenants (id, nombre)
values
  ('b1200000-0000-4000-8000-000000000001', 'Tenant Media A'),
  ('b1200000-0000-4000-8000-000000000002', 'Tenant Media B');

insert into public.clientes (id, tenant_id, nombre)
values
  ('b1300000-0000-4000-8000-000000000001', 'b1200000-0000-4000-8000-000000000001', 'Cliente Media A'),
  ('b1300000-0000-4000-8000-000000000002', 'b1200000-0000-4000-8000-000000000002', 'Cliente Media B');

insert into public.instalaciones (
  id, tenant_id, cliente_id, nombre, direccion, latitud, longitud
)
values
  (
    'b1400000-0000-4000-8000-000000000001',
    'b1200000-0000-4000-8000-000000000001',
    'b1300000-0000-4000-8000-000000000001',
    'Instalación Media A',
    'Calle Media 1',
    37.177336,
    -3.598557
  ),
  (
    'b1400000-0000-4000-8000-000000000002',
    'b1200000-0000-4000-8000-000000000002',
    'b1300000-0000-4000-8000-000000000002',
    'Instalación Media B',
    'Calle Media 2',
    null,
    null
  );

insert into public.tenant_members (tenant_id, user_id, role)
values
  ('b1200000-0000-4000-8000-000000000001', 'b1100000-0000-4000-8000-000000000001', 'admin_cliente'),
  ('b1200000-0000-4000-8000-000000000001', 'b1100000-0000-4000-8000-000000000002', 'coordinador'),
  ('b1200000-0000-4000-8000-000000000001', 'b1100000-0000-4000-8000-000000000003', 'tecnico'),
  ('b1200000-0000-4000-8000-000000000002', 'b1100000-0000-4000-8000-000000000004', 'admin_cliente');

select has_column('public', 'clientes', 'logo_path', '1. clientes admite una imagen principal privada');
select has_column('public', 'instalaciones', 'latitud', '2. instalaciones dispone de latitud');
select has_column('public', 'instalaciones', 'longitud', '3. instalaciones dispone de longitud');
select is((select public from storage.buckets where id = 'installation-photos'), false, '4. el bucket de instalaciones continúa privado');
select is((select public from storage.buckets where id = 'client-media'), false, '5. el bucket de clientes es privado');
select ok((select relrowsecurity from pg_class where oid = 'public.instalacion_fotos'::regclass), '6. la galería mantiene RLS');
select ok(not has_table_privilege('authenticated', 'public.instalacion_fotos', 'INSERT'), '7. authenticated no inserta metadatos directamente');
select ok(not has_function_privilege('anon', 'public.set_client_logo(uuid,text,text,bigint)', 'EXECUTE'), '8. anon no registra imágenes de cliente');
select ok(has_function_privilege('authenticated', 'public.set_client_logo(uuid,text,text,bigint)', 'EXECUTE'), '9. authenticated utiliza la RPC estrecha de cliente');
select ok(has_function_privilege('authenticated', 'public.update_installation_photo_metadata(uuid,text,text,text)', 'EXECUTE'), '10. authenticated utiliza la RPC estrecha de metadatos');
select is((select latitud::text from public.instalaciones where id = 'b1400000-0000-4000-8000-000000000001'), '37.177336', '11. la latitud se conserva con precisión');
select is((select longitud::text from public.instalaciones where id = 'b1400000-0000-4000-8000-000000000001'), '-3.598557', '12. la longitud se conserva con precisión');

insert into storage.objects (id, bucket_id, name, owner, metadata)
values
  (
    'b1500000-0000-4000-8000-000000000001',
    'installation-photos',
    'b1200000-0000-4000-8000-000000000001/b1400000-0000-4000-8000-000000000001/b1600000-0000-4000-8000-000000000001-main.jpg',
    'b1100000-0000-4000-8000-000000000002',
    '{"mimetype":"image/jpeg","size":4096}'::jsonb
  ),
  (
    'b1500000-0000-4000-8000-000000000002',
    'client-media',
    'b1200000-0000-4000-8000-000000000001/b1300000-0000-4000-8000-000000000001/b1600000-0000-4000-8000-000000000002.webp',
    'b1100000-0000-4000-8000-000000000002',
    '{"mimetype":"image/webp","size":2048}'::jsonb
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000001', true);

select ok(
  private.can_access_installation_photo(
    'b1200000-0000-4000-8000-000000000001',
    'b1400000-0000-4000-8000-000000000001',
    true
  ),
  '13. el administrador activo puede escribir fotografías del tenant'
);

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000002', true);
select ok(
  private.can_access_installation_photo_storage(
    'b1200000-0000-4000-8000-000000000001/b1400000-0000-4000-8000-000000000001/b1600000-0000-4000-8000-000000000001-main.jpg',
    true
  ),
  '14. el coordinador activo puede escribir en la ruta tenant/instalación'
);
select lives_ok(
  $$ select public.register_installation_photo(
    'b1400000-0000-4000-8000-000000000001',
    'b1200000-0000-4000-8000-000000000001/b1400000-0000-4000-8000-000000000001/b1600000-0000-4000-8000-000000000001-main.jpg',
    'principal.jpg',
    'image/jpeg',
    4096,
    'Acceso principal',
    'Vista exterior',
    'acceso',
    true
  ) $$,
  '15. el coordinador registra la fotografía con tenant_id derivado de la instalación'
);
select lives_ok(
  $$ select public.set_client_logo(
    'b1300000-0000-4000-8000-000000000001',
    'b1200000-0000-4000-8000-000000000001/b1300000-0000-4000-8000-000000000001/b1600000-0000-4000-8000-000000000002.webp',
    'image/webp',
    2048
  ) $$,
  '16. el coordinador registra la imagen privada del cliente'
);
select is((select count(*)::integer from public.instalacion_fotos where instalacion_id = 'b1400000-0000-4000-8000-000000000001'), 1, '17. el coordinador ve el registro creado');
select is((select logo_path from public.clientes where id = 'b1300000-0000-4000-8000-000000000001'), 'b1200000-0000-4000-8000-000000000001/b1300000-0000-4000-8000-000000000001/b1600000-0000-4000-8000-000000000002.webp', '18. el cliente conserva una única ruta principal');

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000003', true);
select ok(
  private.can_access_installation_photo(
    'b1200000-0000-4000-8000-000000000001',
    'b1400000-0000-4000-8000-000000000001',
    false
  ),
  '19. el técnico activo puede consultar fotografías de su tenant'
);
select ok(
  not private.can_access_installation_photo(
    'b1200000-0000-4000-8000-000000000001',
    'b1400000-0000-4000-8000-000000000001',
    true
  ),
  '20. el técnico no puede escribir fotografías'
);
select is((select count(*)::integer from public.instalacion_fotos where instalacion_id = 'b1400000-0000-4000-8000-000000000001'), 1, '21. el técnico ve los metadatos de su tenant');
select throws_ok(
  $$ select public.update_installation_photo_metadata(
    (select id from public.instalacion_fotos where instalacion_id = 'b1400000-0000-4000-8000-000000000001' limit 1),
    'Título técnico',
    null,
    'general'
  ) $$,
  'La fotografía no está disponible',
  '22. el técnico no edita metadatos'
);

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000004', true);
select is((select count(*)::integer from public.instalacion_fotos where instalacion_id = 'b1400000-0000-4000-8000-000000000001'), 0, '23. otro tenant no accede a fotografías ajenas');
select ok(
  not private.can_access_client_media_storage(
    'b1200000-0000-4000-8000-000000000001/b1300000-0000-4000-8000-000000000001/b1600000-0000-4000-8000-000000000002.webp',
    false
  ),
  '24. otro tenant no accede a la imagen privada del cliente'
);

reset role;
select * from finish();
rollback;
