-- Superficie de funciones, helper privado y regresión de numeración global.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(51);

create temporary table acl_expected (
  signature text primary key,
  authenticated_execute boolean not null
) on commit drop;

insert into acl_expected (signature, authenticated_execute)
values
  ('public.accept_tenant_invitation(uuid)', true),
  ('public.accept_work_order(uuid)', true),
  ('public.add_plan_interval(date,integer,text)', false),
  ('public.assign_work_order(uuid,uuid,timestamp with time zone,text)', true),
  ('public.audit_work_order_evidence_insert()', false),
  ('public.block_work_order(uuid,text,text)', true),
  ('public.can_access_work_order_storage(text,text,boolean)', true),
  ('public.can_access_work_order(uuid,text)', true),
  ('public.can_execute_work_order(uuid,uuid)', true),
  ('public.can_manage_work_orders(uuid)', true),
  ('public.cancel_scheduled_maintenance(uuid,text)', true),
  ('public.complete_scheduled_maintenance_from_work_order(uuid)', false),
  ('public.create_tenant_invitation_with_details(uuid,text,text,boolean,text,text,text)', true),
  ('public.create_tenant_invitation(uuid,text,text,boolean,text)', true),
  ('public.create_work_order_from_scheduled_maintenance(uuid,uuid)', true),
  ('public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)', true),
  ('public.enforce_work_order_management_transition()', false),
  ('public.ensure_scheduled_maintenance_management_permission(uuid)', false),
  ('public.ensure_work_order_default_checklist(uuid)', true),
  ('public.ensure_work_order_lifecycle_permission(uuid)', false),
  ('public.finalize_active_work_order_visit(uuid,jsonb)', true),
  ('public.finalize_work_order_visit(uuid,jsonb)', true),
  ('public.generate_due_scheduled_maintenances(uuid,integer)', true),
  ('public.guard_official_work_order_update()', false),
  ('public.guard_work_order_update()', false),
  ('public.handle_new_user()', false),
  ('public.has_tenant_access(uuid)', true),
  ('public.has_tenant_role(uuid,text)', true),
  ('public.is_super_admin()', false),
  ('public.is_work_order_mutable(uuid)', true),
  ('public.log_audit(uuid,text,text,uuid,jsonb)', true),
  ('public.next_work_order_code()', false),
  ('public.normalize_scheduled_maintenance_ot_type(text)', false),
  ('public.normalize_scheduled_maintenance_priority(text)', false),
  ('public.register_work_order_report(uuid,text)', true),
  ('public.require_work_order_actor(uuid,boolean)', false),
  ('public.reschedule_scheduled_maintenance(uuid,date,date,text)', true),
  ('public.resume_work_order(uuid)', true),
  ('public.review_work_order(uuid,text,text)', true),
  ('public.save_work_order_checklist_response(uuid,text,text)', true),
  ('public.scheduled_maintenance_status_for_date(date,integer)', false),
  ('public.set_updated_at()', false),
  ('public.skip_scheduled_maintenance(uuid,text)', true),
  ('public.soft_delete_work_order(uuid,text)', true),
  ('public.start_work_order_visit(uuid)', true);

select is(
  (select count(*)::integer from acl_expected),
  45,
  '1. la matriz ACL enumera las 45 funciones públicas de aplicación'
);

select is(
  (
    select count(*)::integer
    from acl_expected
    where to_regprocedure(signature) is null
  ),
  0,
  '2. todas las firmas públicas de la matriz existen'
);

select is(
  (
    select count(*)::integer
    from acl_expected expected
    join pg_proc function_row
      on function_row.oid = to_regprocedure(expected.signature)
    where exists (
      select 1
      from aclexplode(
        coalesce(
          function_row.proacl,
          acldefault('f', function_row.proowner)
        )
      ) privilege_row
      where privilege_row.grantee = 0
        and privilege_row.privilege_type = 'EXECUTE'
    )
  ),
  0,
  '3. PUBLIC no conserva EXECUTE en funciones públicas revisadas'
);

select is(
  (
    select count(*)::integer
    from acl_expected
    where has_function_privilege(
      'anon',
      to_regprocedure(signature),
      'EXECUTE'
    )
  ),
  0,
  '4. anon no puede ejecutar funciones operativas ni helpers públicos'
);

select is(
  (
    select count(*)::integer
    from acl_expected
    where has_function_privilege(
      'authenticated',
      to_regprocedure(signature),
      'EXECUTE'
    ) is distinct from authenticated_execute
  ),
  0,
  '5. authenticated coincide exactamente con la matriz explícita'
);

select is(
  (
    select count(*)::integer
    from acl_expected
    where has_function_privilege(
      'service_role',
      to_regprocedure(signature),
      'EXECUTE'
    )
  ),
  0,
  '6. service_role no conserva RPC sin consumidor demostrado'
);

select ok(
  to_regnamespace('private') is not null,
  '7. existe el esquema private'
);

select is(
  (
    select pg_get_userbyid(nspowner)
    from pg_namespace
    where nspname = 'private'
  ),
  'postgres',
  '8. el propietario de private es postgres'
);

select is(
  (
    select count(*)::integer
    from pg_proc function_row
    where function_row.pronamespace = 'private'::regnamespace
  ),
  1,
  '9. private contiene únicamente la función interna esperada'
);

select is(
  (
    select count(*)::integer
    from pg_class relation_row
    where relation_row.relnamespace = 'private'::regnamespace
  ),
  0,
  '10. private no contiene tablas, vistas, secuencias ni wrappers'
);

select is(
  (
    select pg_get_userbyid(proowner)
    from pg_proc
    where oid = to_regprocedure(
      'private.next_work_order_code_internal()'
    )
  ),
  'postgres',
  '11. el helper privado pertenece al propietario confiable postgres'
);

select ok(
  (
    select prosecdef
    from pg_proc
    where oid = to_regprocedure(
      'private.next_work_order_code_internal()'
    )
  ),
  '12. el helper privado usa SECURITY DEFINER'
);

select is(
  (
    select proconfig
    from pg_proc
    where oid = to_regprocedure(
      'private.next_work_order_code_internal()'
    )
  ),
  array['search_path=pg_catalog']::text[],
  '13. el helper privado fija search_path a pg_catalog'
);

select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = to_regprocedure(
      'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
    )
  ),
  '14. create_work_order continúa como SECURITY INVOKER'
);

select is(
  (
    select language_row.lanname
    from pg_proc function_row
    join pg_language language_row on language_row.oid = function_row.prolang
    where function_row.oid = to_regprocedure(
      'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
    )
  ),
  'plpgsql',
  '15. create_work_order conserva el lenguaje plpgsql'
);

select is(
  (
    select provolatile::text
    from pg_proc
    where oid = to_regprocedure(
      'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
    )
  ),
  'v',
  '16. create_work_order conserva la volatilidad VOLATILE'
);

select is(
  (
    select proconfig
    from pg_proc
    where oid = to_regprocedure(
      'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
    )
  ),
  array['search_path=public']::text[],
  '17. create_work_order conserva search_path public'
);

select ok(
  position(
    'private.next_work_order_code_internal()'
    in pg_get_functiondef(
      to_regprocedure(
        'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
      )
    )
  ) > 0
  and position(
    'public.next_work_order_code()'
    in pg_get_functiondef(
      to_regprocedure(
        'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
      )
    )
  ) = 0,
  '18. create_work_order solo sustituye la llamada por el helper privado'
);

select ok(
  position(
    'pg_advisory_xact_lock'
    in pg_get_functiondef(
      to_regprocedure('private.next_work_order_code_internal()')
    )
  ) > 0
  and position(
    'public.next_work_order_code.'
    in pg_get_functiondef(
      to_regprocedure('private.next_work_order_code_internal()')
    )
  ) > 0
  and position(
    'public.ordenes_trabajo'
    in pg_get_functiondef(
      to_regprocedure('private.next_work_order_code_internal()')
    )
  ) > 0,
  '19. el helper conserva bloqueo anual y tabla totalmente cualificada'
);

select ok(
  to_regprocedure('public.next_work_order_code()') is not null,
  '20. el helper público anterior permanece por compatibilidad'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.next_work_order_code()',
    'EXECUTE'
  ),
  '21. authenticated no ejecuta el helper público anterior'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.next_work_order_code()',
    'EXECUTE'
  ),
  '22. anon no ejecuta el helper público anterior'
);

select ok(
  not exists (
    select 1
    from pg_proc function_row
    cross join lateral aclexplode(
      coalesce(
        function_row.proacl,
        acldefault('f', function_row.proowner)
      )
    ) privilege_row
    where function_row.oid = to_regprocedure(
      'private.next_work_order_code_internal()'
    )
      and privilege_row.grantee = 0
      and privilege_row.privilege_type = 'EXECUTE'
  ),
  '23. PUBLIC no ejecuta el helper privado'
);

select ok(
  not has_schema_privilege('anon', 'private', 'USAGE'),
  '24. anon no tiene USAGE sobre private'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.next_work_order_code_internal()',
    'EXECUTE'
  ),
  '25. anon no ejecuta el helper privado'
);

select ok(
  has_schema_privilege('authenticated', 'private', 'USAGE'),
  '26. authenticated conserva el USAGE mínimo sobre private'
);

select ok(
  not has_schema_privilege('authenticated', 'private', 'CREATE'),
  '27. authenticated no puede crear objetos en private'
);

select ok(
  has_function_privilege(
    'authenticated',
    'private.next_work_order_code_internal()',
    'EXECUTE'
  ),
  '28. authenticated puede ejecutar el helper interno requerido'
);

select ok(
  not has_schema_privilege('service_role', 'private', 'USAGE')
  and not has_function_privilege(
    'service_role',
    'private.next_work_order_code_internal()',
    'EXECUTE'
  ),
  '29. service_role no recibe acceso privado sin necesidad demostrada'
);

select ok(
  to_regprocedure('public.next_work_order_code_internal()') is null,
  '30. no existe un wrapper público hacia el helper privado'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)',
    'EXECUTE'
  ),
  '31. authenticated conserva create_work_order'
);

select is(
  (
    select count(*)::integer
    from (
      values
        ('public.audit_work_order_evidence_insert()'),
        ('public.enforce_work_order_management_transition()'),
        ('public.guard_official_work_order_update()'),
        ('public.guard_work_order_update()'),
        ('public.handle_new_user()'),
        ('public.set_updated_at()')
    ) trigger_function(signature)
    where has_function_privilege(
      'authenticated',
      to_regprocedure(signature),
      'EXECUTE'
    )
  ),
  0,
  '32. las funciones de trigger no quedan como RPC autenticadas'
);

select is(
  (
    select count(*)::integer
    from (
      values
        ('public.can_access_work_order_storage(text,text,boolean)'),
        ('public.can_access_work_order(uuid,text)'),
        ('public.can_execute_work_order(uuid,uuid)'),
        ('public.can_manage_work_orders(uuid)'),
        ('public.has_tenant_access(uuid)'),
        ('public.has_tenant_role(uuid,text)'),
        ('public.is_work_order_mutable(uuid)')
    ) rls_helper(signature)
    where not has_function_privilege(
      'authenticated',
      to_regprocedure(signature),
      'EXECUTE'
    )
  ),
  0,
  '33. los helpers usados directamente por RLS conservan EXECUTE'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'private-admin-a@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{"nombre":"Administrador Private A"}'::jsonb,
    now(),
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'private-tech@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{"nombre":"Técnico Private"}'::jsonb,
    now(),
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'private-admin-b@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{"nombre":"Administrador Private B"}'::jsonb,
    now(),
    now()
  );

insert into public.tenants (id, nombre)
values
  ('a2000000-0000-4000-8000-000000000001', 'Tenant Private A'),
  ('a2000000-0000-4000-8000-000000000002', 'Tenant Private B');

insert into public.clientes (id, tenant_id, nombre)
values
  (
    'a3000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'Cliente Private A'
  ),
  (
    'a3000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000002',
    'Cliente Private B'
  );

insert into public.instalaciones (id, tenant_id, cliente_id, nombre)
values
  (
    'a4000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    'Instalación Private A'
  ),
  (
    'a4000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000002',
    'a3000000-0000-4000-8000-000000000002',
    'Instalación Private B'
  );

insert into public.tenant_members (tenant_id, user_id, role)
values
  (
    'a2000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'admin_cliente'
  ),
  (
    'a2000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'tecnico'
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000003',
    'admin_cliente'
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$ select public.next_work_order_code() $$,
  '42501'::character(5),
  'permission denied for function next_work_order_code',
  '34. authenticated no puede invocar directamente el helper público'
);

select lives_ok(
  $$
    select public.create_work_order(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000001',
      'Private borrador A',
      null,
      'revision',
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
  '35. el gestor A crea una OT sin técnico'
);

select ok(
  exists (
    select 1
    from public.ordenes_trabajo
    where titulo = 'Private borrador A'
      and codigo_ot = 'OT-' || to_char(now(), 'YYYY') || '-00001'
      and estado = 'BORRADOR'
      and assigned_to is null
      and cliente_id = 'a3000000-0000-4000-8000-000000000001'
  ),
  '36. Tenant A obtiene 00001 y estado BORRADOR con INSERT RETURNING'
);

select lives_ok(
  $$
    select public.create_work_order(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000001',
      'Private asignada A',
      null,
      'mantenimiento_preventivo',
      'normal',
      null,
      null,
      'a1000000-0000-4000-8000-000000000002',
      null,
      null,
      null,
      null,
      null,
      null,
      '{}'::jsonb
    )
  $$,
  '37. el gestor A crea una OT con técnico'
);

select ok(
  exists (
    select 1
    from public.ordenes_trabajo
    where titulo = 'Private asignada A'
      and codigo_ot = 'OT-' || to_char(now(), 'YYYY') || '-00002'
      and estado = 'ASIGNADA'
      and assigned_to = 'a1000000-0000-4000-8000-000000000002'
  ),
  '38. Tenant A obtiene 00002 y estado ASIGNADA'
);

select is(
  (
    select array_agg(action order by created_at, id)
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'Private asignada A'
    )
  ),
  array['create_work_order', 'assign_work_order']::text[],
  '39. creación y asignación se registran como eventos separados'
);

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000003',
  true
);

select throws_ok(
  $$
    select public.create_work_order(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000001',
      'Private cruce prohibido',
      null,
      'revision',
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
  'P0001'::character(5),
  'No tienes permiso para crear OT',
  '40. el gestor B no puede crear en Tenant A y conserva el error seguro'
);

select lives_ok(
  $$
    select public.create_work_order(
      'a2000000-0000-4000-8000-000000000002',
      'a4000000-0000-4000-8000-000000000002',
      'Private borrador B',
      null,
      'revision',
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
  '41. el gestor B crea en su propio tenant'
);

select ok(
  exists (
    select 1
    from public.ordenes_trabajo
    where titulo = 'Private borrador B'
      and codigo_ot = 'OT-' || to_char(now(), 'YYYY') || '-00003'
      and estado = 'BORRADOR'
  ),
  '42. Tenant B obtiene globalmente 00003 pese a RLS'
);

select is(
  (
    select count(*)::integer
    from public.ordenes_trabajo
    where titulo in ('Private borrador A', 'Private asignada A')
  ),
  0,
  '43. el gestor B no puede leer las OT del Tenant A'
);

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    select public.accept_work_order(
      (
        select id
        from public.ordenes_trabajo
        where titulo = 'Private asignada A'
      )
    )
  $$,
  '44. el técnico asignado puede aceptar su OT'
);

select lives_ok(
  $$
    select public.start_work_order_visit(
      (
        select id
        from public.ordenes_trabajo
        where titulo = 'Private asignada A'
      )
    )
  $$,
  '45. el técnico asignado puede iniciar la intervención'
);

select is(
  (
    select array_agg(titulo order by titulo)
    from public.ordenes_trabajo
  ),
  array['Private asignada A']::text[],
  '46. RLS permite al técnico ver únicamente su OT asignada'
);

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select estado
    from public.ordenes_trabajo
    where titulo = 'Private asignada A'
  ),
  'EN_CURSO',
  '47. aceptación e inicio dejan la OT EN_CURSO'
);

select is(
  (
    select array_agg(action order by created_at, id)
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'Private asignada A'
    )
  ),
  array[
    'create_work_order',
    'assign_work_order',
    'accept_work_order',
    'start_work_order_visit'
  ]::text[],
  '48. la auditoría conserva los cuatro eventos en orden'
);

select is(
  (
    select array_agg(user_id order by created_at, id)
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'Private asignada A'
    )
  ),
  array[
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000002'::uuid
  ],
  '49. la auditoría conserva los actores gestor y técnico'
);

select is(
  (
    select count(distinct codigo_ot)::integer
    from public.ordenes_trabajo
    where titulo in (
      'Private borrador A',
      'Private asignada A'
    )
  ),
  2,
  '50. los códigos visibles del Tenant A son únicos'
);

select ok(
  (
    select bool_and(
      codigo_ot ~ ('^OT-' || to_char(now(), 'YYYY') || '-[0-9]{5}$')
    )
    from public.ordenes_trabajo
    where titulo in (
      'Private borrador A',
      'Private asignada A'
    )
  ),
  '51. todos los códigos conservan el formato OT-AAAA-NNNNN'
);

select * from finish();
rollback;
