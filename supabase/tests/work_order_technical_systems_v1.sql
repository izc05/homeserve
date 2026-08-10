-- OT-05E: contrato de sistema técnico opcional en órdenes de trabajo.
-- Ejecutar con `npx supabase test db` sobre una base local reseteada.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(17);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ot-system-admin-a@example.test','not-used',now(),'{}','{}',now(),now()),
  ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ot-system-admin-b@example.test','not-used',now(),'{}','{}',now(),now());

insert into public.tenants (id, nombre)
values
  ('b2000000-0000-4000-8000-000000000001','Tenant OT System A'),
  ('b2000000-0000-4000-8000-000000000002','Tenant OT System B');

insert into public.clientes (id, tenant_id, nombre)
values
  ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Cliente OT System A'),
  ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Cliente OT System B');

insert into public.instalaciones (id, tenant_id, cliente_id, nombre)
values
  ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','Instalación OT System A'),
  ('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000002','Instalación OT System B');

insert into public.tenant_members (tenant_id, user_id, role)
values
  ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','admin_cliente'),
  ('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','admin_cliente');

insert into public.sistemas_instalacion (
  id, tenant_id, instalacion_id, nombre, codigo, especialidad, criticidad, estado
)
values
  ('b5000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','Electricidad A','ELEC-A','electricidad','alta','activo'),
  ('b5000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','Climatización A','HVAC-A','climatizacion','media','activo'),
  ('b5000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000002','Electricidad B','ELEC-B','electricidad','alta','activo');

insert into public.activos (
  id, tenant_id, instalacion_id, nombre, tipo, criticidad, estado, sistema_id
)
values
  ('b6000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','Cuadro general','cuadro','alta','correcto','b5000000-0000-4000-8000-000000000001'),
  ('b6000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','Equipo sin clasificar','equipo','media','correcto',null);

select has_column(
  'public',
  'ordenes_trabajo',
  'sistema_id',
  '1. ordenes_trabajo expone sistema_id opcional'
);

select ok(
  to_regprocedure(
    'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
  ) is not null,
  '2. create_work_order conserva exactamente la firma hardened'
);

select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = to_regprocedure(
      'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
    )
  ),
  '3. create_work_order sigue siendo SECURITY INVOKER'
);

select ok(
  position(
    'private.next_work_order_code_internal()'
    in pg_get_functiondef(
      to_regprocedure(
        'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
      )
    )
  ) > 0,
  '4. create_work_order mantiene el helper privado de numeración'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)',
    'EXECUTE'
  ),
  '5. anon continúa sin ejecutar create_work_order'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)',
    'EXECUTE'
  ),
  '6. authenticated conserva ejecución de create_work_order'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);

select lives_ok(
  $$
    select public.create_work_order(
      'b2000000-0000-4000-8000-000000000001',
      'b4000000-0000-4000-8000-000000000001',
      'OT sin sistema',
      null,
      'averia',
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
  '7. una OT sin sistema sigue siendo válida'
);

select is(
  (
    select sistema_id
    from public.ordenes_trabajo
    where titulo = 'OT sin sistema'
  ),
  null::uuid,
  '8. OT sin sistema guarda NULL'
);

select lives_ok(
  $$
    select public.create_work_order(
      'b2000000-0000-4000-8000-000000000001',
      'b4000000-0000-4000-8000-000000000001',
      'OT con sistema explícito',
      null,
      'averia',
      'alta',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      jsonb_build_object(
        'sistema_id','b5000000-0000-4000-8000-000000000001',
        'requiere_fotos_finales',true
      )
    )
  $$,
  '9. una OT puede seleccionar sistema sin activo'
);

select is(
  (
    select sistema_id
    from public.ordenes_trabajo
    where titulo = 'OT con sistema explícito'
  ),
  'b5000000-0000-4000-8000-000000000001'::uuid,
  '10. el sistema explícito queda en columna dedicada'
);

select ok(
  not (
    select configuracion ? 'sistema_id'
    from public.ordenes_trabajo
    where titulo = 'OT con sistema explícito'
  ),
  '11. sistema_id no se duplica dentro de configuracion'
);

select lives_ok(
  $$
    select public.create_work_order(
      'b2000000-0000-4000-8000-000000000001',
      'b4000000-0000-4000-8000-000000000001',
      'OT hereda sistema activo',
      null,
      'revision',
      'normal',
      null,
      'b6000000-0000-4000-8000-000000000001',
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
  '12. OT con activo clasificado puede omitir sistema explícito'
);

select is(
  (
    select sistema_id
    from public.ordenes_trabajo
    where titulo = 'OT hereda sistema activo'
  ),
  'b5000000-0000-4000-8000-000000000001'::uuid,
  '13. OT hereda el sistema registrado en el activo'
);

select throws_matching(
  $$
    select public.create_work_order(
      'b2000000-0000-4000-8000-000000000001',
      'b4000000-0000-4000-8000-000000000001',
      'OT sistema de otro tenant',
      null,'averia','normal',null,null,null,null,null,null,null,null,null,
      '{"sistema_id":"b5000000-0000-4000-8000-000000000003"}'::jsonb
    )
  $$,
  '.*sistema técnico no pertenece a la instalación.*',
  '14. se rechaza sistema de otro tenant/instalación'
);

select throws_matching(
  $$
    select public.create_work_order(
      'b2000000-0000-4000-8000-000000000001',
      'b4000000-0000-4000-8000-000000000001',
      'OT activo sistema incoherente',
      null,'averia','normal',null,
      'b6000000-0000-4000-8000-000000000001',
      null,null,null,null,null,null,null,
      '{"sistema_id":"b5000000-0000-4000-8000-000000000002"}'::jsonb
    )
  $$,
  '.*activo pertenece a un sistema técnico diferente.*',
  '15. activo ya clasificado no admite otro sistema'
);

select lives_ok(
  $$
    select public.create_work_order(
      'b2000000-0000-4000-8000-000000000001',
      'b4000000-0000-4000-8000-000000000001',
      'OT activo sin clasificar con sistema',
      null,'averia','normal',null,
      'b6000000-0000-4000-8000-000000000002',
      null,null,null,null,null,null,null,
      '{"sistema_id":"b5000000-0000-4000-8000-000000000002"}'::jsonb
    )
  $$,
  '16. activo sin sistema puede participar en OT con sistema explícito'
);

select throws_matching(
  $$
    select public.create_work_order(
      'b2000000-0000-4000-8000-000000000001',
      'b4000000-0000-4000-8000-000000000001',
      'OT UUID sistema inválido',
      null,'averia','normal',null,null,null,null,null,null,null,null,null,
      '{"sistema_id":"no-es-uuid"}'::jsonb
    )
  $$,
  '.*sistema técnico indicado no es válido.*',
  '17. UUID de sistema inválido devuelve error controlado'
);

select * from finish();
rollback;
