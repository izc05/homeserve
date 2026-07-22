-- Plantillas versionadas, checklist avanzado y galería privada de instalaciones.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(54);

insert into auth.users (id, email)
values
  ('a1100000-0000-4000-8000-000000000001', 'admin-advanced-a@example.test'),
  ('a1100000-0000-4000-8000-000000000002', 'tech-advanced-a@example.test'),
  ('a1100000-0000-4000-8000-000000000003', 'admin-advanced-b@example.test'),
  ('a1100000-0000-4000-8000-000000000004', 'tech-advanced-b@example.test');

insert into public.tenants (id, nombre)
values
  ('a1200000-0000-4000-8000-000000000001', 'Tenant Advanced A'),
  ('a1200000-0000-4000-8000-000000000002', 'Tenant Advanced B');

insert into public.clientes (id, tenant_id, nombre)
values
  ('a1300000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'Cliente Advanced A'),
  ('a1300000-0000-4000-8000-000000000002', 'a1200000-0000-4000-8000-000000000002', 'Cliente Advanced B');

insert into public.instalaciones (id, tenant_id, cliente_id, nombre, direccion)
values
  ('a1400000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', 'Instalación Advanced A', 'Calle Prueba 1'),
  ('a1400000-0000-4000-8000-000000000002', 'a1200000-0000-4000-8000-000000000002', 'a1300000-0000-4000-8000-000000000002', 'Instalación Advanced B', 'Calle Prueba 2');

insert into public.tenant_members (tenant_id, user_id, role)
values
  ('a1200000-0000-4000-8000-000000000001', 'a1100000-0000-4000-8000-000000000001', 'admin_cliente'),
  ('a1200000-0000-4000-8000-000000000001', 'a1100000-0000-4000-8000-000000000002', 'tecnico'),
  ('a1200000-0000-4000-8000-000000000002', 'a1100000-0000-4000-8000-000000000003', 'admin_cliente'),
  ('a1200000-0000-4000-8000-000000000002', 'a1100000-0000-4000-8000-000000000004', 'tecnico');

insert into public.ordenes_trabajo (
  id, tenant_id, cliente_id, codigo_ot, instalacion_id, titulo, tipo,
  prioridad, estado, assigned_to, configuracion, created_by
)
values
  (
    'a1500000-0000-4000-8000-000000000001',
    'a1200000-0000-4000-8000-000000000001',
    'a1300000-0000-4000-8000-000000000001',
    'OT-2098-93001',
    'a1400000-0000-4000-8000-000000000001',
    'Checklist avanzado A',
    'revision',
    'normal',
    'ASIGNADA',
    'a1100000-0000-4000-8000-000000000002',
    '{"requiere_checklist":true}'::jsonb,
    'a1100000-0000-4000-8000-000000000001'
  ),
  (
    'a1500000-0000-4000-8000-000000000002',
    'a1200000-0000-4000-8000-000000000002',
    'a1300000-0000-4000-8000-000000000002',
    'OT-2098-93002',
    'a1400000-0000-4000-8000-000000000002',
    'Checklist avanzado B',
    'revision',
    'normal',
    'ASIGNADA',
    'a1100000-0000-4000-8000-000000000004',
    '{}'::jsonb,
    'a1100000-0000-4000-8000-000000000003'
  );

select has_table('public', 'checklist_plantillas', '1. existe el catálogo de plantillas');
select has_table('public', 'checklist_plantilla_secciones', '2. existen las secciones de plantilla');
select has_table('public', 'checklist_plantilla_puntos', '3. existen los puntos de plantilla');
select has_table('public', 'instalacion_fotos', '4. existe la galería de instalación');
select is((select public from storage.buckets where id = 'installation-photos'), false, '5. el bucket de instalaciones es privado');
select ok((select relrowsecurity from pg_class where oid = 'public.checklist_plantillas'::regclass), '6. las plantillas tienen RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.instalacion_fotos'::regclass), '7. la galería tiene RLS');
select ok(not has_table_privilege('authenticated', 'public.instalacion_fotos', 'INSERT'), '8. authenticated no inserta metadatos de galería directamente');
select ok(not has_function_privilege('anon', 'public.save_checklist_template(jsonb,uuid)', 'EXECUTE'), '9. anon no administra plantillas');
select ok(has_function_privilege('authenticated', 'public.save_checklist_template(jsonb,uuid)', 'EXECUTE'), '10. authenticated usa la RPC estrecha de plantillas');
select ok(not (select prosecdef from pg_proc where oid = 'public.prepare_work_order_checklist(uuid,uuid)'::regprocedure), '11. la RPC pública de preparación es SECURITY INVOKER');
select ok((select prosecdef from pg_proc where oid = 'private.prepare_work_order_checklist_internal(uuid,uuid)'::regprocedure), '12. la mutación interna de preparación es SECURITY DEFINER');
select is((select proconfig from pg_proc where oid = 'public.prepare_work_order_checklist(uuid,uuid)'::regprocedure), array['search_path=pg_catalog']::text[], '13. el wrapper público fija search_path');
select is((select proconfig from pg_proc where oid = 'private.prepare_work_order_checklist_internal(uuid,uuid)'::regprocedure), array['search_path=pg_catalog']::text[], '14. la función privada fija search_path');
select ok(not (select prosecdef from pg_proc where oid = 'public.register_installation_photo(uuid,text,text,text,bigint,text,text,text,boolean)'::regprocedure), '15. el registro público de galería es SECURITY INVOKER');
select ok((select prosecdef from pg_proc where oid = 'private.register_installation_photo_internal(uuid,text,text,text,bigint,text,text,text,boolean)'::regprocedure), '16. el registro interno de galería es SECURITY DEFINER');
select ok(not has_schema_privilege('anon', 'private', 'USAGE'), '17. anon no usa el esquema private');
select ok(not has_schema_privilege('authenticated', 'private', 'CREATE'), '18. authenticated no crea objetos privados');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.save_checklist_template(
    '{
      "tenantId":"a1200000-0000-4000-8000-000000000001",
      "name":"Revisión fotovoltaica",
      "description":"Controles versionados",
      "specialty":"Fotovoltaica",
      "active":true,
      "sections":[{
        "title":"Inspección",
        "description":"Comprobaciones principales",
        "points":[
          {"title":"Acceso seguro","instructions":"Confirma el acceso","responseType":"si_no_na","options":[],"required":true,"negativeObservationRequired":true,"photoRequired":true,"critical":false},
          {"title":"Tensión medida","instructions":"Registra la tensión","responseType":"numero","unit":"V","options":[],"required":true,"negativeObservationRequired":false,"photoRequired":false,"critical":false},
          {"title":"Método de revisión","instructions":"Selecciona el método","responseType":"seleccion","options":["Inspección visual","Medición"],"required":true,"negativeObservationRequired":false,"photoRequired":false,"critical":false},
          {"title":"Protecciones correctas","instructions":"Comprueba protecciones","responseType":"correcto_incorrecto","options":[],"required":true,"negativeObservationRequired":false,"photoRequired":false,"critical":true}
        ]
      }]
    }'::jsonb,
    null
  ) $$,
  '19. el administrador crea una plantilla completa'
);

select is((select count(*)::integer from public.checklist_plantillas where tenant_id = 'a1200000-0000-4000-8000-000000000001'), 1, '20. se crea una plantilla en el tenant correcto');
select is((select count(*)::integer from public.checklist_plantilla_secciones where tenant_id = 'a1200000-0000-4000-8000-000000000001'), 1, '21. se crea una sección ordenada');
select is((select count(*)::integer from public.checklist_plantilla_puntos where tenant_id = 'a1200000-0000-4000-8000-000000000001'), 4, '22. se crean cuatro puntos');
select is((select count(distinct tipo_respuesta)::integer from public.checklist_plantilla_puntos where tenant_id = 'a1200000-0000-4000-8000-000000000001'), 4, '23. se conservan los tipos de respuesta reales');

select lives_ok(
  $$ select public.prepare_work_order_checklist(
    'a1500000-0000-4000-8000-000000000001',
    (select id from public.checklist_plantillas where tenant_id = 'a1200000-0000-4000-8000-000000000001')
  ) $$,
  '24. el administrador prepara el checklist desde una plantilla activa'
);
select is((select count(*)::integer from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001'), 4, '25. la OT recibe los cuatro puntos');
select is((select checklist_snapshot_version from public.ordenes_trabajo where id = 'a1500000-0000-4000-8000-000000000001'), 1, '26. la instantánea conserva la versión inicial');
select ok((select checklist_template_id is not null from public.ordenes_trabajo where id = 'a1500000-0000-4000-8000-000000000001'), '27. la OT referencia la plantilla utilizada');

select lives_ok(
  $$ select public.save_checklist_template(
    '{
      "tenantId":"a1200000-0000-4000-8000-000000000001",
      "name":"Revisión fotovoltaica actualizada",
      "description":"Nueva versión",
      "specialty":"Fotovoltaica",
      "active":true,
      "sections":[{"title":"Nueva sección","description":null,"points":[{"title":"Punto posterior","instructions":null,"responseType":"texto","options":[],"required":true,"negativeObservationRequired":false,"photoRequired":false,"critical":false}]}]
    }'::jsonb,
    (select id from public.checklist_plantillas where tenant_id = 'a1200000-0000-4000-8000-000000000001')
  ) $$,
  '28. editar la plantilla crea una nueva versión'
);
select is((select version from public.checklist_plantillas where tenant_id = 'a1200000-0000-4000-8000-000000000001'), 2, '29. la versión administrable avanza');
select is((select checklist_snapshot_version from public.ordenes_trabajo where id = 'a1500000-0000-4000-8000-000000000001'), 1, '30. la OT no cambia de versión histórica');
select is((select checklist_snapshot ->> 'name' from public.ordenes_trabajo where id = 'a1500000-0000-4000-8000-000000000001'), 'Revisión fotovoltaica', '31. el contenido histórico no cambia al editar la plantilla');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000002', true);
select public.accept_work_order('a1500000-0000-4000-8000-000000000001');
select public.start_work_order_visit('a1500000-0000-4000-8000-000000000001');
reset role;

insert into storage.objects (id, bucket_id, name, owner, metadata)
values
  ('a1700000-0000-4000-8000-000000000001', 'ot-photos', 'a1200000-0000-4000-8000-000000000001/a1500000-0000-4000-8000-000000000001/foto/checklist.jpg', 'a1100000-0000-4000-8000-000000000002', '{"mimetype":"image/jpeg","size":2048}'::jsonb),
  ('a1700000-0000-4000-8000-000000000002', 'installation-photos', 'a1200000-0000-4000-8000-000000000001/a1400000-0000-4000-8000-000000000001/foto/main.jpg', 'a1100000-0000-4000-8000-000000000001', '{"mimetype":"image/jpeg","size":4096}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000002', true);

select is((select count(*)::integer from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001'), 4, '32. el técnico asignado ve los cuatro puntos');

select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000004', true);
select is((select count(*)::integer from public.ordenes_trabajo where id = 'a1500000-0000-4000-8000-000000000001'), 0, '33. el técnico B no ve la OT del tenant A');
select is((select count(*)::integer from public.checklist_plantillas where tenant_id = 'a1200000-0000-4000-8000-000000000001'), 0, '34. un técnico no puede leer plantillas administrativas de otro tenant');

select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000002', true);
select throws_matching(
  $$ select public.save_work_order_checklist_response_v2(
    (select id from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001' and tipo_respuesta = 'si_no_na'),
    'no', null, null
  ) $$,
  '.*requiere una observación.*',
  '35. una respuesta negativa exige observación cuando está configurado'
);
select lives_ok(
  $$ select public.save_work_order_checklist_response_v2(
    (select id from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001' and tipo_respuesta = 'numero'),
    null, 230.5, 'Medición estable'
  ) $$,
  '36. se guarda una medición numérica'
);
select throws_matching(
  $$ select public.save_work_order_checklist_response_v2(
    (select id from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001' and tipo_respuesta = 'seleccion'),
    'Inventada', null, null
  ) $$,
  '.*no pertenece.*',
  '37. una selección ajena a las opciones se rechaza'
);
select lives_ok(
  $$ select public.save_work_order_checklist_response_v2(
    (select id from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001' and tipo_respuesta = 'seleccion'),
    'Inspección visual', null, null
  ) $$,
  '38. una opción válida se guarda'
);
select throws_matching(
  $$ select public.finalize_active_work_order_visit('a1500000-0000-4000-8000-000000000001', '{"trabajo_realizado":"Prueba"}'::jsonb) $$,
  '.*checklist incompleto.*',
  '39. un punto obligatorio pendiente bloquea la finalización'
);
select lives_ok(
  $$ select public.save_work_order_checklist_response_v2(
    (select id from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001' and tipo_respuesta = 'si_no_na'),
    'si', null, null
  ) $$,
  '40. se completa el punto que exige fotografía'
);
select lives_ok(
  $$ select public.register_work_order_photo_v2(
    'a1500000-0000-4000-8000-000000000001', 'evidencia',
    'a1200000-0000-4000-8000-000000000001/a1500000-0000-4000-8000-000000000001/foto/checklist.jpg',
    'checklist.jpg', 'image/jpeg', 2048,
    (select id from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001' and tipo_respuesta = 'si_no_na'),
    'checklist', 'Acceso verificado'
  ) $$,
  '41. la foto se vincula mediante la RPC segura'
);
select is(
  (select count(*)::integer from public.ot_fotos photo join public.ot_checklist_respuestas response on response.id = photo.checklist_respuesta_id where response.ot_id = 'a1500000-0000-4000-8000-000000000001' and response.tipo_respuesta = 'si_no_na'),
  1,
  '42. la fotografía queda unida al identificador exacto del punto'
);
select lives_ok(
  $$ select public.save_work_order_checklist_response_v2(
    (select id from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001' and tipo_respuesta = 'correcto_incorrecto'),
    'incorrecto', null, 'Protección pendiente'
  ) $$,
  '43. el resultado crítico incorrecto se registra sin ocultarlo'
);
select throws_matching(
  $$ select public.finalize_active_work_order_visit('a1500000-0000-4000-8000-000000000001', '{"trabajo_realizado":"Prueba"}'::jsonb) $$,
  '.*punto crítico.*',
  '44. un punto crítico incorrecto bloquea el cierre'
);
select lives_ok(
  $$ select public.save_work_order_checklist_response_v2(
    (select id from public.ot_checklist_respuestas where ot_id = 'a1500000-0000-4000-8000-000000000001' and tipo_respuesta = 'correcto_incorrecto'),
    'correcto', null, 'Protección resuelta'
  ) $$,
  '45. el técnico puede resolver el punto crítico'
);
select lives_ok(
  $$ select public.finalize_active_work_order_visit('a1500000-0000-4000-8000-000000000001', '{"trabajo_realizado":"Checklist avanzado completado"}'::jsonb) $$,
  '46. la finalización guiada funciona después de resolver los requisitos'
);
select is((select estado from public.ordenes_trabajo where id = 'a1500000-0000-4000-8000-000000000001'), 'FINALIZADA_TECNICO', '47. la OT temporal alcanza el estado canónico de finalización');

select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$ select public.register_installation_photo(
    'a1400000-0000-4000-8000-000000000001',
    'a1200000-0000-4000-8000-000000000001/a1400000-0000-4000-8000-000000000001/foto/main.jpg',
    'main.jpg', 'image/jpeg', 4096, 'Acceso principal', 'Vista real', 'acceso', true
  ) $$,
  '48. el administrador registra una fotografía privada de instalación'
);
select is((select count(*)::integer from public.instalacion_fotos where instalacion_id = 'a1400000-0000-4000-8000-000000000001'), 1, '49. se registra un único metadato de instalación');
select is((select es_principal from public.instalacion_fotos where instalacion_id = 'a1400000-0000-4000-8000-000000000001'), true, '50. la fotografía queda marcada como principal');

select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.instalacion_fotos where instalacion_id = 'a1400000-0000-4000-8000-000000000001'), 1, '51. el técnico asignado puede consultar la galería relacionada');
select throws_matching(
  $$ select public.set_installation_main_photo((select id from public.instalacion_fotos where instalacion_id = 'a1400000-0000-4000-8000-000000000001')) $$,
  '.*no está disponible.*',
  '52. el técnico no puede gestionar la galería'
);

select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000004', true);
select is((select count(*)::integer from public.instalacion_fotos where instalacion_id = 'a1400000-0000-4000-8000-000000000001'), 0, '53. el técnico B no ve fotografías del tenant A');
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'installation_photo_storage_update'
      and qual is not null
      and with_check is not null
  ),
  '54. la actualización de Storage tiene USING y WITH CHECK'
);

select * from finish();
rollback;
