-- Requisitos de cierre técnico y revisión administrativa segura.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(31);

insert into auth.users (id, email)
values
  ('f1000000-0000-4000-8000-000000000001', 'admin-completion-a@example.test'),
  ('f1000000-0000-4000-8000-000000000002', 'tech-completion-a@example.test'),
  ('f1000000-0000-4000-8000-000000000003', 'admin-completion-b@example.test'),
  ('f1000000-0000-4000-8000-000000000004', 'tech-completion-b@example.test');

insert into public.tenants (id, nombre)
values
  ('f2000000-0000-4000-8000-000000000001', 'Tenant Completion A'),
  ('f2000000-0000-4000-8000-000000000002', 'Tenant Completion B');

insert into public.clientes (id, tenant_id, nombre)
values
  ('f3000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'Cliente Completion A'),
  ('f3000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002', 'Cliente Completion B');

insert into public.instalaciones (id, tenant_id, cliente_id, nombre)
values
  ('f4000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001', 'Instalación Completion A'),
  ('f4000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000002', 'Instalación Completion B');

insert into public.tenant_members (tenant_id, user_id, role)
values
  ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'admin_cliente'),
  ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 'tecnico'),
  ('f2000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000003', 'admin_cliente'),
  ('f2000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004', 'tecnico');

insert into public.ordenes_trabajo (
  id, tenant_id, cliente_id, codigo_ot, instalacion_id, titulo, tipo,
  prioridad, estado, assigned_to, configuracion, created_by
)
values
  (
    'f5000000-0000-4000-8000-000000000001',
    'f2000000-0000-4000-8000-000000000001',
    'f3000000-0000-4000-8000-000000000001',
    'OT-2098-92001',
    'f4000000-0000-4000-8000-000000000001',
    'Cierre técnico guiado A',
    'revision',
    'normal',
    'EN_CURSO',
    'f1000000-0000-4000-8000-000000000002',
    '{
      "requiere_checklist": true,
      "requiere_fotos_iniciales": true,
      "requiere_fotos_finales": true,
      "requiere_mediciones": true,
      "requiere_materiales": true,
      "requiere_firma_tecnico": true,
      "requiere_firma_cliente": true,
      "requiere_prueba_funcional": true,
      "requiere_informe": true,
      "requiere_revision_admin": true
    }'::jsonb,
    'f1000000-0000-4000-8000-000000000001'
  ),
  (
    'f5000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000002',
    'f3000000-0000-4000-8000-000000000002',
    'OT-2098-92002',
    'f4000000-0000-4000-8000-000000000002',
    'Cierre técnico guiado B',
    'revision',
    'normal',
    'EN_CURSO',
    'f1000000-0000-4000-8000-000000000004',
    '{}'::jsonb,
    'f1000000-0000-4000-8000-000000000003'
  );

insert into public.ot_visitas (
  id, tenant_id, ot_id, tecnico_id, estado, fecha_inicio, created_by
)
values
  ('f6000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 'EN_CURSO', now(), 'f1000000-0000-4000-8000-000000000002'),
  ('f6000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002', 'f5000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004', 'EN_CURSO', now(), 'f1000000-0000-4000-8000-000000000004');

insert into public.ot_checklist_respuestas (
  id, tenant_id, ot_id, orden, punto, obligatorio, requiere_foto,
  resultado, tipo_respuesta, plantilla_item_id, created_by
)
values
  ('f7000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 10, 'Identificación', true, false, null, 'ok_ko_na', 'identificacion', 'f1000000-0000-4000-8000-000000000002'),
  ('f7000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 20, 'Estado inicial', true, true, null, 'texto', 'estado_inicial', 'f1000000-0000-4000-8000-000000000002'),
  ('f7000000-0000-4000-8000-000000000003', 'f2000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 30, 'Mediciones', true, false, null, 'medicion', 'mediciones', 'f1000000-0000-4000-8000-000000000002'),
  ('f7000000-0000-4000-8000-000000000004', 'f2000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 40, 'Materiales', true, false, null, 'texto', 'materiales', 'f1000000-0000-4000-8000-000000000002'),
  ('f7000000-0000-4000-8000-000000000005', 'f2000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 50, 'Prueba funcional', true, false, null, 'ok_ko_na', 'prueba_funcional', 'f1000000-0000-4000-8000-000000000002');

select has_function(
  'public',
  'finalize_active_work_order_visit',
  array['uuid', 'jsonb'],
  '1. existe la RPC de finalización activa'
);

select ok(
  (select prosecdef from pg_proc where oid = 'public.finalize_active_work_order_visit(uuid,jsonb)'::regprocedure),
  '2. la finalización conserva SECURITY DEFINER'
);

select is(
  (select proconfig from pg_proc where oid = 'public.finalize_active_work_order_visit(uuid,jsonb)'::regprocedure),
  array['search_path=pg_catalog']::text[],
  '3. la finalización fija un search_path seguro'
);

select ok(
  (select prosecdef from pg_proc where oid = 'public.review_work_order(uuid,text,text)'::regprocedure),
  '4. la revisión conserva SECURITY DEFINER'
);

select is(
  (select proconfig from pg_proc where oid = 'public.review_work_order(uuid,text,text)'::regprocedure),
  array['search_path=pg_catalog']::text[],
  '5. la revisión fija un search_path seguro'
);

select ok(
  has_function_privilege('authenticated', 'public.finalize_active_work_order_visit(uuid,jsonb)', 'EXECUTE'),
  '6. authenticated puede finalizar mediante la RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.review_work_order(uuid,text,text)', 'EXECUTE'),
  '7. authenticated puede revisar mediante la RPC'
);

select ok(
  not has_function_privilege('anon', 'public.finalize_active_work_order_visit(uuid,jsonb)', 'EXECUTE'),
  '8. anon no puede finalizar una intervención'
);

select ok(
  not has_function_privilege('anon', 'public.review_work_order(uuid,text,text)', 'EXECUTE'),
  '9. anon no puede revisar una OT'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*)::integer from public.ordenes_trabajo where id = 'f5000000-0000-4000-8000-000000000001'),
  0,
  '10. RLS impide al técnico B leer la OT del tenant A'
);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{"trabajo_realizado":"Intento cruzado"}'::jsonb
  ) $$,
  '.*permiso.*',
  '11. el técnico B no finaliza una OT de otro tenant'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{}'::jsonb
  ) $$,
  '.*resumen del trabajo.*',
  '12. el resumen del trabajo es obligatorio'
);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{"trabajo_realizado":"Trabajo completado"}'::jsonb
  ) $$,
  '.*checklist incompleto.*',
  '13. no se finaliza con checklist obligatorio incompleto'
);

select lives_ok(
  $test$
    do $body$
    begin
      perform public.save_work_order_checklist_response('f7000000-0000-4000-8000-000000000001', 'ok', null);
      perform public.save_work_order_checklist_response('f7000000-0000-4000-8000-000000000002', 'Situación registrada', null);
      perform public.save_work_order_checklist_response('f7000000-0000-4000-8000-000000000003', '230 V', null);
      perform public.save_work_order_checklist_response('f7000000-0000-4000-8000-000000000004', 'Sin material consumido', null);
      perform public.save_work_order_checklist_response('f7000000-0000-4000-8000-000000000005', 'ok', null);
    end;
    $body$
  $test$,
  '14. el técnico completa los requisitos de checklist configurados'
);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{"trabajo_realizado":"Trabajo completado"}'::jsonb
  ) $$,
  '.*fotografías vinculadas al checklist.*',
  '15. una foto requerida debe estar vinculada a su punto'
);

reset role;
insert into public.ot_fotos (
  id, tenant_id, ot_id, checklist_respuesta_id, tipo, path, filename,
  mime_type, size_bytes, created_by
)
values (
  'f8000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  'f7000000-0000-4000-8000-000000000002',
  'inicial',
  'f2000000-0000-4000-8000-000000000001/f5000000-0000-4000-8000-000000000001/foto/initial.jpg',
  'initial.jpg',
  'image/jpeg',
  1024,
  'f1000000-0000-4000-8000-000000000002'
);
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{"trabajo_realizado":"Trabajo completado"}'::jsonb
  ) $$,
  '.*fotografía final.*',
  '16. se exige la fotografía final configurada'
);

reset role;
insert into public.ot_fotos (
  id, tenant_id, ot_id, tipo, path, filename, mime_type, size_bytes, created_by
)
values (
  'f8000000-0000-4000-8000-000000000002',
  'f2000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  'final',
  'f2000000-0000-4000-8000-000000000001/f5000000-0000-4000-8000-000000000001/foto/final.jpg',
  'final.jpg',
  'image/jpeg',
  1024,
  'f1000000-0000-4000-8000-000000000002'
);
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{"trabajo_realizado":"Trabajo completado"}'::jsonb
  ) $$,
  '.*firma del técnico.*',
  '17. se exige la firma del técnico configurada'
);

reset role;
insert into public.ot_firmas (
  id, tenant_id, ot_id, visita_id, tipo, path, created_by
)
values (
  'f9000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  'f6000000-0000-4000-8000-000000000001',
  'tecnico',
  'f2000000-0000-4000-8000-000000000001/f5000000-0000-4000-8000-000000000001/tecnico/signature.png',
  'f1000000-0000-4000-8000-000000000002'
);
insert into public.ot_informes (
  id, tenant_id, ot_id, version, filename, bucket, path, created_by
)
values (
  'fa000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  1,
  'OT-2098-92001-informe.pdf',
  'ot-reports',
  null,
  'f1000000-0000-4000-8000-000000000002'
);
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{"trabajo_realizado":"Trabajo completado"}'::jsonb
  ) $$,
  '.*firma del responsable.*',
  '18. se exige la firma del responsable configurada'
);

reset role;
insert into public.ot_firmas (
  id, tenant_id, ot_id, visita_id, tipo, path, created_by
)
values (
  'f9000000-0000-4000-8000-000000000002',
  'f2000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  'f6000000-0000-4000-8000-000000000001',
  'responsable',
  'f2000000-0000-4000-8000-000000000001/f5000000-0000-4000-8000-000000000001/responsable/signature.png',
  'f1000000-0000-4000-8000-000000000002'
);
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{"trabajo_realizado":"Trabajo completado"}'::jsonb
  ) $$,
  '.*informe técnico.*',
  '19. metadatos sin archivo privado no satisfacen el informe configurado'
);

reset role;
update public.ot_informes
set path = 'f2000000-0000-4000-8000-000000000001/f5000000-0000-4000-8000-000000000001/report.pdf'
where id = 'fa000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{
      "trabajo_realizado":"  Revisión, ajuste y prueba completados  ",
      "diagnostico":"Conexión floja",
      "pruebas_realizadas":"Prueba funcional correcta",
      "recomendaciones":"Revisar en mantenimiento anual"
    }'::jsonb
  ) $$,
  '20. la intervención se finaliza cuando todos los requisitos están cumplidos'
);

select is(
  (select estado from public.ot_visitas where id = 'f6000000-0000-4000-8000-000000000001'),
  'FINALIZADA',
  '21. la visita queda finalizada'
);

select is(
  (select estado from public.ordenes_trabajo where id = 'f5000000-0000-4000-8000-000000000001'),
  'FINALIZADA_TECNICO',
  '22. la OT queda en FINALIZADA_TECNICO'
);

select is(
  (select trabajo_realizado from public.ot_visitas where id = 'f6000000-0000-4000-8000-000000000001'),
  'Revisión, ajuste y prueba completados',
  '23. el resumen queda normalizado y guardado en la visita'
);

select is(
  (select trabajo_realizado from public.ordenes_trabajo where id = 'f5000000-0000-4000-8000-000000000001'),
  'Revisión, ajuste y prueba completados',
  '24. la OT conserva el resumen técnico'
);

select throws_matching(
  $$ select public.finalize_active_work_order_visit(
    'f5000000-0000-4000-8000-000000000001',
    '{"trabajo_realizado":"Segundo envío"}'::jsonb
  ) $$,
  '.*finalizar una OT en curso.*',
  '25. un doble envío no repite la finalización'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000003', true);

select throws_matching(
  $$ select public.review_work_order(
    'f5000000-0000-4000-8000-000000000001',
    'validada',
    'Intento de otro tenant'
  ) $$,
  '.*permiso.*',
  '26. un administrador de otro tenant no revisa la OT'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.review_work_order(
    'f5000000-0000-4000-8000-000000000001',
    'validada',
    'Intervención y evidencias revisadas'
  ) $$,
  '27. el administrador del tenant valida la intervención'
);

select is(
  (select estado from public.ordenes_trabajo where id = 'f5000000-0000-4000-8000-000000000001'),
  'VALIDADA',
  '28. la OT mantiene la secuencia canónica hasta VALIDADA'
);

select ok(
  (select reviewer_id = 'f1000000-0000-4000-8000-000000000001'::uuid
     and reviewed_by = 'f1000000-0000-4000-8000-000000000001'::uuid
   from public.ot_revisiones_admin
   where ot_id = 'f5000000-0000-4000-8000-000000000001'),
  '29. reviewer_id y reviewed_by registran al actor real'
);

select is(
  (select count(*)::integer
   from public.audit_logs
   where entity_id = 'f5000000-0000-4000-8000-000000000001'
     and action = 'finalize_active_work_order_visit'),
  1,
  '30. la finalización genera un único evento de auditoría'
);

select is(
  (select count(*)::integer
   from public.audit_logs
   where entity_id = 'f5000000-0000-4000-8000-000000000001'
     and action = 'validate_work_order'),
  1,
  '31. la revisión genera un único evento de auditoría'
);

select * from finish();
rollback;
