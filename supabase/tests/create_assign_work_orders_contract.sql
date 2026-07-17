-- Contrato de las RPC de creación y asignación.
-- Se ejecuta únicamente contra Supabase local mediante `npx supabase test db`.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

select ok(
  to_regprocedure(
    'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
  ) is not null,
  'existe public.create_work_order'
);

select ok(
  to_regprocedure(
    'public.assign_work_order(uuid,uuid,timestamp with time zone,text)'
  ) is not null,
  'existe public.assign_work_order'
);

select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = to_regprocedure(
      'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
    )
  ),
  'create_work_order usa SECURITY INVOKER'
);

select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = to_regprocedure(
      'public.assign_work_order(uuid,uuid,timestamp with time zone,text)'
    )
  ),
  'assign_work_order usa SECURITY INVOKER'
);

select ok(
  not has_function_privilege(
    'anon',
    to_regprocedure(
      'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
    ),
    'EXECUTE'
  ),
  'anon no puede ejecutar create_work_order'
);

select ok(
  not has_function_privilege(
    'anon',
    to_regprocedure(
      'public.assign_work_order(uuid,uuid,timestamp with time zone,text)'
    ),
    'EXECUTE'
  ),
  'anon no puede ejecutar assign_work_order'
);

select ok(
  has_function_privilege(
    'authenticated',
    to_regprocedure(
      'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
    ),
    'EXECUTE'
  ),
  'authenticated puede ejecutar create_work_order'
);

select ok(
  has_function_privilege(
    'authenticated',
    to_regprocedure(
      'public.assign_work_order(uuid,uuid,timestamp with time zone,text)'
    ),
    'EXECUTE'
  ),
  'authenticated puede ejecutar assign_work_order'
);

select ok(
  not has_sequence_privilege('anon', 'public.work_order_code_seq', 'USAGE'),
  'anon no puede usar la secuencia de códigos'
);

select ok(
  has_sequence_privilege('authenticated', 'public.work_order_code_seq', 'USAGE'),
  'authenticated puede usar la secuencia de códigos'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.ordenes_trabajo'::regclass
  ),
  'ordenes_trabajo mantiene RLS activado'
);

select ok(
  position(
    'can_manage_work_orders'
    in pg_get_functiondef(
      to_regprocedure(
        'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
      )
    )
  ) > 0,
  'create_work_order valida permisos de gestión'
);

select ok(
  position(
    'can_manage_work_orders'
    in pg_get_functiondef(
      to_regprocedure(
        'public.assign_work_order(uuid,uuid,timestamp with time zone,text)'
      )
    )
  ) > 0,
  'assign_work_order valida permisos de gestión'
);

select * from finish();
rollback;
