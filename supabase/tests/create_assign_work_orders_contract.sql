-- Pruebas de contrato para ejecutar después de aplicar
-- 202607171430_create_assign_work_orders_rpc.sql en Supabase local o rama de desarrollo.

begin;

do $test$
declare
  create_oid oid := to_regprocedure(
    'public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,text,text,text,jsonb)'
  );
  assign_oid oid := to_regprocedure(
    'public.assign_work_order(uuid,uuid,timestamp with time zone,text)'
  );
begin
  if create_oid is null then
    raise exception 'Falta public.create_work_order';
  end if;

  if assign_oid is null then
    raise exception 'Falta public.assign_work_order';
  end if;

  if (select prosecdef from pg_proc where oid = create_oid) then
    raise exception 'create_work_order no debe usar SECURITY DEFINER';
  end if;

  if (select prosecdef from pg_proc where oid = assign_oid) then
    raise exception 'assign_work_order no debe usar SECURITY DEFINER';
  end if;

  if has_function_privilege('anon', create_oid, 'EXECUTE') then
    raise exception 'anon no debe ejecutar create_work_order';
  end if;

  if has_function_privilege('anon', assign_oid, 'EXECUTE') then
    raise exception 'anon no debe ejecutar assign_work_order';
  end if;

  if not has_function_privilege('authenticated', create_oid, 'EXECUTE') then
    raise exception 'authenticated debe ejecutar create_work_order';
  end if;

  if not has_function_privilege('authenticated', assign_oid, 'EXECUTE') then
    raise exception 'authenticated debe ejecutar assign_work_order';
  end if;

  if has_sequence_privilege('anon', 'public.work_order_code_seq', 'USAGE') then
    raise exception 'anon no debe usar work_order_code_seq';
  end if;

  if not has_sequence_privilege('authenticated', 'public.work_order_code_seq', 'USAGE') then
    raise exception 'authenticated necesita USAGE sobre work_order_code_seq';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.ordenes_trabajo'::regclass
  ) then
    raise exception 'ordenes_trabajo debe mantener RLS activado';
  end if;

  if position(
    'can_manage_work_orders'
    in pg_get_functiondef(create_oid)
  ) = 0 then
    raise exception 'create_work_order debe validar can_manage_work_orders';
  end if;

  if position(
    'can_manage_work_orders'
    in pg_get_functiondef(assign_oid)
  ) = 0 then
    raise exception 'assign_work_order debe validar can_manage_work_orders';
  end if;
end;
$test$;

rollback;
