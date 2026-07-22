-- Persistencia segura de respuestas de checklist por el técnico asignado.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

insert into auth.users (id, email)
values
  ('d1000000-0000-4000-8000-000000000001', 'admin-checklist@example.test'),
  ('d1000000-0000-4000-8000-000000000002', 'tech-checklist@example.test'),
  ('d1000000-0000-4000-8000-000000000003', 'other-checklist@example.test');

insert into public.tenants (id, nombre)
values
  ('d2000000-0000-4000-8000-000000000001', 'Tenant Checklist A'),
  ('d2000000-0000-4000-8000-000000000002', 'Tenant Checklist B');

insert into public.clientes (id, tenant_id, nombre)
values
  ('d3000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Cliente Checklist A'),
  ('d3000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'Cliente Checklist B');

insert into public.instalaciones (id, tenant_id, cliente_id, nombre)
values
  ('d4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'Instalación Checklist A'),
  ('d4000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000002', 'Instalación Checklist B');

insert into public.tenant_members (tenant_id, user_id, role)
values
  ('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'admin_cliente'),
  ('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'tecnico'),
  ('d2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003', 'tecnico');

insert into public.ordenes_trabajo (
  id, tenant_id, cliente_id, codigo_ot, instalacion_id, titulo, tipo,
  prioridad, estado, assigned_to, created_by
)
values
  (
    'd5000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'OT-2098-90001',
    'd4000000-0000-4000-8000-000000000001',
    'Checklist técnico A',
    'revision',
    'normal',
    'EN_CURSO',
    'd1000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd5000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002',
    'd3000000-0000-4000-8000-000000000002',
    'OT-2098-90002',
    'd4000000-0000-4000-8000-000000000002',
    'Checklist técnico B',
    'revision',
    'normal',
    'EN_CURSO',
    'd1000000-0000-4000-8000-000000000003',
    'd1000000-0000-4000-8000-000000000003'
  );

insert into public.ot_checklist_respuestas (
  id, tenant_id, ot_id, orden, punto, obligatorio, resultado,
  tipo_respuesta, plantilla_item_id, created_by
)
values
  (
    'd6000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000001',
    10,
    'Seguridad',
    true,
    null,
    'ok_ko_na',
    'seguridad',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd6000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002',
    'd5000000-0000-4000-8000-000000000002',
    10,
    'Seguridad',
    true,
    null,
    'ok_ko_na',
    'seguridad',
    'd1000000-0000-4000-8000-000000000003'
  );

select has_function(
  'public',
  'save_work_order_checklist_response',
  array['uuid', 'text', 'text'],
  '1. existe la RPC estrecha de respuesta de checklist'
);

select ok(
  (select prosecdef from pg_proc where oid = 'public.save_work_order_checklist_response(uuid,text,text)'::regprocedure),
  '2. la RPC usa SECURITY DEFINER para no exponer UPDATE directo'
);

select is(
  (select proconfig from pg_proc where oid = 'public.save_work_order_checklist_response(uuid,text,text)'::regprocedure),
  array['search_path=pg_catalog']::text[],
  '3. la RPC fija un search_path seguro'
);

select ok(
  has_function_privilege('authenticated', 'public.save_work_order_checklist_response(uuid,text,text)', 'EXECUTE'),
  '4. authenticated puede ejecutar la RPC'
);

select ok(
  not has_function_privilege('anon', 'public.save_work_order_checklist_response(uuid,text,text)', 'EXECUTE'),
  '5. anon no puede ejecutar la RPC'
);

select ok(
  not has_table_privilege('authenticated', 'public.ot_checklist_respuestas', 'UPDATE'),
  '6. authenticated no puede actualizar directamente la tabla de checklist'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ select public.save_work_order_checklist_response(
    'd6000000-0000-4000-8000-000000000001',
    'OK',
    '  Condiciones comprobadas  '
  ) $$,
  '7. el técnico asignado guarda su respuesta'
);

select is(
  (select resultado from public.ot_checklist_respuestas where id = 'd6000000-0000-4000-8000-000000000001'),
  'ok',
  '8. la respuesta OK queda normalizada'
);

select is(
  (select observaciones from public.ot_checklist_respuestas where id = 'd6000000-0000-4000-8000-000000000001'),
  'Condiciones comprobadas',
  '9. las observaciones se conservan sin espacios exteriores'
);

select is(
  (select completed_by from public.ot_checklist_respuestas where id = 'd6000000-0000-4000-8000-000000000001'),
  'd1000000-0000-4000-8000-000000000002'::uuid,
  '10. se registra el técnico que completó el punto'
);

select throws_matching(
  $$ select public.save_work_order_checklist_response(
    'd6000000-0000-4000-8000-000000000001',
    'tal vez',
    null
  ) $$,
  '.*respuesta admitida.*',
  '11. se rechaza una respuesta fuera del esquema real'
);

select throws_matching(
  $$ select public.save_work_order_checklist_response(
    'd6000000-0000-4000-8000-000000000002',
    'ok',
    null
  ) $$,
  '.*Solo el técnico asignado.*',
  '12. el técnico no modifica el checklist de otro tenant'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);

select throws_matching(
  $$ select public.save_work_order_checklist_response(
    'd6000000-0000-4000-8000-000000000001',
    'ko',
    null
  ) $$,
  '.*Solo el técnico asignado.*',
  '13. el gestor no ejecuta respuestas técnicas'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ select public.save_work_order_checklist_response(
    'd6000000-0000-4000-8000-000000000001',
    null,
    null
  ) $$,
  '14. el técnico puede devolver el punto a pendiente'
);

select ok(
  (select resultado is null and completed_by is null and completed_at is null
   from public.ot_checklist_respuestas
   where id = 'd6000000-0000-4000-8000-000000000001'),
  '15. al limpiar la respuesta también se limpian las marcas de completado'
);

select * from finish();
rollback;
