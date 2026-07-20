-- Trazabilidad de creación, asignación y reasignación de OT.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

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
    '91000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'audit-admin@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{"nombre":"Administrador Auditoría"}'::jsonb,
    now(),
    now()
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'audit-tech-a@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{"nombre":"Técnico Auditoría A"}'::jsonb,
    now(),
    now()
  ),
  (
    '91000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'audit-tech-b@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{"nombre":"Técnico Auditoría B"}'::jsonb,
    now(),
    now()
  );

insert into public.tenants (id, nombre)
values ('92000000-0000-4000-8000-000000000001', 'Tenant Auditoría');

insert into public.clientes (id, tenant_id, nombre)
values (
  '93000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  'Cliente Auditoría'
);

insert into public.instalaciones (id, tenant_id, cliente_id, nombre)
values (
  '94000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001',
  'Instalación Auditoría'
);

insert into public.tenant_members (tenant_id, user_id, role)
values
  (
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'admin_cliente'
  ),
  (
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000002',
    'tecnico'
  ),
  (
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000003',
    'tecnico'
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    select public.create_work_order(
      '92000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000001',
      'OT creada y asignada para auditoría',
      null,
      'mantenimiento_preventivo',
      'normal',
      null,
      null,
      '91000000-0000-4000-8000-000000000002',
      null,
      null,
      null,
      null,
      null,
      null,
      '{}'::jsonb
    )
  $$,
  '1. una OT puede crearse ya asignada'
);

select is(
  (
    select estado
    from public.ordenes_trabajo
    where titulo = 'OT creada y asignada para auditoría'
  ),
  'ASIGNADA',
  '2. la OT creada con técnico queda ASIGNADA'
);

select is(
  (
    select array_agg(action order by created_at)
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT creada y asignada para auditoría'
    )
  ),
  array['create_work_order', 'assign_work_order']::text[],
  '3. creación y asignación son eventos separados y ordenados'
);

select ok(
  not exists (
    select 1
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT creada y asignada para auditoría'
    )
      and (
        tenant_id <> '92000000-0000-4000-8000-000000000001'
        or user_id <> '91000000-0000-4000-8000-000000000001'
      )
  ),
  '4. ambos eventos conservan tenant y actor administrador'
);

select is(
  (
    select metadata->>'assigned_to_name'
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT creada y asignada para auditoría'
    )
      and action = 'assign_work_order'
  ),
  'Técnico Auditoría A',
  '5. la asignación indica el nombre del técnico'
);

select ok(
  exists (
    select 1
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT creada y asignada para auditoría'
    )
      and action = 'assign_work_order'
      and metadata->>'assigned_to' = '91000000-0000-4000-8000-000000000002'
      and metadata->>'estado_anterior' = 'BORRADOR'
      and metadata->>'estado_nuevo' = 'ASIGNADA'
      and metadata->>'assigned_at' is not null
  ),
  '6. la asignación guarda técnico, estados y fecha'
);

select ok(
  (
    select min(created_at) < max(created_at)
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT creada y asignada para auditoría'
    )
  ),
  '7. creación y asignación conservan su orden temporal real'
);

select lives_ok(
  $$
    select public.create_work_order(
      '92000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000001',
      'OT borrador para asignación posterior',
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
  '8. una OT puede crearse sin técnico'
);

select ok(
  exists (
    select 1
    from public.ordenes_trabajo
    where titulo = 'OT borrador para asignación posterior'
      and estado = 'BORRADOR'
      and assigned_to is null
      and assigned_at is null
  ),
  '9. la OT sin técnico permanece en BORRADOR sin asignación'
);

select is(
  (
    select array_agg(action order by created_at)
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT borrador para asignación posterior'
    )
  ),
  array['create_work_order']::text[],
  '10. el borrador solo registra creación'
);

select is(
  (
    select count(*)::integer
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT borrador para asignación posterior'
    )
      and action in ('assign_work_order', 'reassign_work_order')
  ),
  0,
  '11. no se genera una asignación ficticia para el borrador'
);

select lives_ok(
  $$
    select public.assign_work_order(
      (
        select id
        from public.ordenes_trabajo
        where titulo = 'OT borrador para asignación posterior'
      ),
      '91000000-0000-4000-8000-000000000002',
      null,
      null
    )
  $$,
  '12. el borrador admite una asignación posterior'
);

select ok(
  exists (
    select 1
    from public.ordenes_trabajo
    where titulo = 'OT borrador para asignación posterior'
      and estado = 'ASIGNADA'
      and assigned_to = '91000000-0000-4000-8000-000000000002'
      and assigned_by = '91000000-0000-4000-8000-000000000001'
      and assigned_at is not null
  ),
  '13. la asignación posterior actualiza estado, técnico, actor y fecha'
);

select is(
  (
    select count(*)::integer
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT borrador para asignación posterior'
    )
      and action = 'assign_work_order'
  ),
  1,
  '14. la asignación posterior genera un solo evento'
);

select ok(
  exists (
    select 1
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT borrador para asignación posterior'
    )
      and action = 'assign_work_order'
      and metadata->>'assigned_to_name' = 'Técnico Auditoría A'
      and metadata->>'estado_anterior' = 'BORRADOR'
      and metadata->>'estado_nuevo' = 'ASIGNADA'
  ),
  '15. el evento posterior conserva técnico y transición de estado'
);

select lives_ok(
  $$
    select public.assign_work_order(
      (
        select id
        from public.ordenes_trabajo
        where titulo = 'OT borrador para asignación posterior'
      ),
      '91000000-0000-4000-8000-000000000003',
      null,
      'Cambio de turno'
    )
  $$,
  '16. una OT asignada admite un cambio de técnico'
);

select ok(
  exists (
    select 1
    from public.ordenes_trabajo
    where titulo = 'OT borrador para asignación posterior'
      and assigned_to = '91000000-0000-4000-8000-000000000003'
      and reassignment_reason = 'Cambio de turno'
  ),
  '17. la reasignación actualiza técnico y motivo'
);

select ok(
  exists (
    select 1
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT borrador para asignación posterior'
    )
      and action = 'reassign_work_order'
      and metadata->>'previous_assigned_to' = '91000000-0000-4000-8000-000000000002'
      and metadata->>'assigned_to' = '91000000-0000-4000-8000-000000000003'
      and metadata->>'assigned_to_name' = 'Técnico Auditoría B'
      and metadata->>'estado_anterior' = 'ASIGNADA'
      and metadata->>'estado_nuevo' = 'ASIGNADA'
  ),
  '18. el cambio de técnico registra anterior, nuevo y estados'
);

select lives_ok(
  $$
    select public.assign_work_order(
      (
        select id
        from public.ordenes_trabajo
        where titulo = 'OT borrador para asignación posterior'
      ),
      '91000000-0000-4000-8000-000000000003',
      null,
      'Cambio de turno'
    )
  $$,
  '19. repetir exactamente la misma asignación es idempotente'
);

select is(
  (
    select count(*)::integer
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT borrador para asignación posterior'
    )
      and action in (
        'assign_work_order',
        'reassign_work_order',
        'update_work_order_assignment'
      )
  ),
  2,
  '20. el reintento exacto no duplica eventos de asignación'
);

select ok(
  exists (
    select 1
    from public.audit_logs
    where entity_id = (
      select id
      from public.ordenes_trabajo
      where titulo = 'OT borrador para asignación posterior'
    )
      and action = 'assign_work_order'
      and tenant_id = '92000000-0000-4000-8000-000000000001'
      and user_id = '91000000-0000-4000-8000-000000000001'
      and metadata->>'assigned_by' = '91000000-0000-4000-8000-000000000001'
  ),
  '21. la asignación posterior conserva tenant y actor administrador'
);

select * from finish();
rollback;
