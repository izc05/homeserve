-- Metadatos de fotografías privadas, límites y aislamiento.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

insert into auth.users (id, email)
values
  ('e1000000-0000-4000-8000-000000000001', 'admin-photo@example.test'),
  ('e1000000-0000-4000-8000-000000000002', 'tech-photo@example.test'),
  ('e1000000-0000-4000-8000-000000000003', 'other-photo@example.test');

insert into public.tenants (id, nombre)
values
  ('e2000000-0000-4000-8000-000000000001', 'Tenant Photo A'),
  ('e2000000-0000-4000-8000-000000000002', 'Tenant Photo B');

insert into public.clientes (id, tenant_id, nombre)
values
  ('e3000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'Cliente Photo A'),
  ('e3000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'Cliente Photo B');

insert into public.instalaciones (id, tenant_id, cliente_id, nombre)
values
  ('e4000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001', 'Instalación Photo A'),
  ('e4000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000002', 'Instalación Photo B');

insert into public.tenant_members (tenant_id, user_id, role)
values
  ('e2000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'admin_cliente'),
  ('e2000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', 'tecnico'),
  ('e2000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000003', 'tecnico');

insert into public.ordenes_trabajo (
  id, tenant_id, cliente_id, codigo_ot, instalacion_id, titulo, tipo,
  prioridad, estado, assigned_to, created_by
)
values
  ('e5000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001', 'OT-2098-91001', 'e4000000-0000-4000-8000-000000000001', 'Foto técnica A', 'revision', 'normal', 'EN_CURSO', 'e1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001'),
  ('e5000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000002', 'OT-2098-91002', 'e4000000-0000-4000-8000-000000000002', 'Foto técnica B', 'revision', 'normal', 'EN_CURSO', 'e1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000003');

insert into storage.objects (id, bucket_id, name, owner, metadata)
values
  ('e6000000-0000-4000-8000-000000000001', 'ot-photos', 'e2000000-0000-4000-8000-000000000001/e5000000-0000-4000-8000-000000000001/foto/initial.jpg', 'e1000000-0000-4000-8000-000000000002', '{"mimetype":"image/jpeg","size":2048}'::jsonb),
  ('e6000000-0000-4000-8000-000000000002', 'ot-photos', 'e2000000-0000-4000-8000-000000000001/e5000000-0000-4000-8000-000000000001/foto/too-large.jpg', 'e1000000-0000-4000-8000-000000000002', '{"mimetype":"image/jpeg","size":10485761}'::jsonb),
  ('e6000000-0000-4000-8000-000000000003', 'ot-photos', 'e2000000-0000-4000-8000-000000000002/e5000000-0000-4000-8000-000000000002/foto/other.jpg', 'e1000000-0000-4000-8000-000000000003', '{"mimetype":"image/jpeg","size":1024}'::jsonb);

select has_function('public', 'register_work_order_photo', array['uuid','text','text','text','text','bigint','uuid'], '1. existe la RPC de registro de foto');
select has_function('public', 'delete_work_order_photo_metadata', array['uuid'], '2. existe la RPC de eliminación de metadatos');
select ok(has_function_privilege('authenticated', 'public.register_work_order_photo(uuid,text,text,text,text,bigint,uuid)', 'EXECUTE'), '3. authenticated ejecuta el registro estrecho');
select ok(not has_function_privilege('anon', 'public.register_work_order_photo(uuid,text,text,text,text,bigint,uuid)', 'EXECUTE'), '4. anon no registra fotografías');
select ok(not has_table_privilege('authenticated', 'public.ot_fotos', 'INSERT'), '5. authenticated no inserta metadatos directamente');
select ok(not has_table_privilege('authenticated', 'public.ot_fotos', 'DELETE'), '6. authenticated no elimina metadatos directamente');
select is((select public from storage.buckets where id = 'ot-photos'), false, '7. el bucket de fotografías continúa privado');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ select public.register_work_order_photo(
    'e5000000-0000-4000-8000-000000000001', 'inicial',
    'e2000000-0000-4000-8000-000000000001/e5000000-0000-4000-8000-000000000001/foto/initial.jpg',
    'Inicial.jpg', 'image/jpeg', 2048, null
  ) $$,
  '8. el técnico registra una fotografía de su OT'
);

select is((select count(*)::integer from public.ot_fotos where ot_id = 'e5000000-0000-4000-8000-000000000001'), 1, '9. se registra un único metadato');
select is((select created_by from public.ot_fotos where ot_id = 'e5000000-0000-4000-8000-000000000001'), 'e1000000-0000-4000-8000-000000000002'::uuid, '10. el actor procede de auth.uid');
select is((select mime_type from public.ot_fotos where ot_id = 'e5000000-0000-4000-8000-000000000001'), 'image/jpeg', '11. MIME se contrasta con Storage');

select throws_matching(
  $$ select public.register_work_order_photo(
    'e5000000-0000-4000-8000-000000000001', 'inicial',
    'e2000000-0000-4000-8000-000000000001/e5000000-0000-4000-8000-000000000001/foto/too-large.jpg',
    'Grande.jpg', 'image/jpeg', 10485761, null
  ) $$,
  '.*10 MiB.*',
  '12. se rechaza una fotografía demasiado grande'
);

select throws_matching(
  $$ select public.register_work_order_photo(
    'e5000000-0000-4000-8000-000000000002', 'final',
    'e2000000-0000-4000-8000-000000000002/e5000000-0000-4000-8000-000000000002/foto/other.jpg',
    'Otro.jpg', 'image/jpeg', 1024, null
  ) $$,
  '.*Solo el técnico asignado.*',
  '13. el técnico no registra una foto de otro tenant'
);

select throws_matching(
  $$ select public.register_work_order_photo(
    'e5000000-0000-4000-8000-000000000001', 'desconocida',
    'e2000000-0000-4000-8000-000000000001/e5000000-0000-4000-8000-000000000001/foto/initial.jpg',
    'Inicial.jpg', 'image/jpeg', 2048, null
  ) $$,
  '.*categoría.*',
  '14. se rechaza una categoría desconocida'
);

select lives_ok(
  $$ select public.delete_work_order_photo_metadata(
    (select id from public.ot_fotos where ot_id = 'e5000000-0000-4000-8000-000000000001' limit 1)
  ) $$,
  '15. el técnico elimina metadatos de su foto mientras la OT es mutable'
);

select is((select count(*)::integer from public.ot_fotos where ot_id = 'e5000000-0000-4000-8000-000000000001'), 0, '16. el metadato queda eliminado');

select * from finish();
rollback;
