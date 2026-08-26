-- OT-06A: participantes normalizados por orden de trabajo.
-- Mantiene ordenes_trabajo.assigned_to como responsable legacy/compatibilidad.
-- No amplía todavía can_execute_work_order ni modifica el ciclo de visitas.

create schema if not exists private;

create table if not exists public.ot_participantes (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ot_id uuid not null,
  tecnico_id uuid not null references public.profiles(id),
  rol text not null check (rol in ('responsable', 'colaborador')),
  estado text not null default 'activo' check (estado in ('activo', 'retirado')),
  added_by uuid references public.profiles(id),
  added_at timestamptz not null default clock_timestamp(),
  removed_by uuid references public.profiles(id),
  removed_at timestamptz,
  motivo text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  constraint ot_participantes_ot_fk
    foreign key (tenant_id, ot_id)
    references public.ordenes_trabajo(tenant_id, id),
  constraint ot_participantes_retiro_check
    check (
      (estado = 'activo' and removed_at is null)
      or (estado = 'retirado' and removed_at is not null)
    )
);

create index if not exists idx_ot_participantes_tenant_ot
  on public.ot_participantes(tenant_id, ot_id);

create index if not exists idx_ot_participantes_tecnico_estado
  on public.ot_participantes(tenant_id, tecnico_id, estado);

create unique index if not exists ot_participantes_tecnico_activo_uq
  on public.ot_participantes(tenant_id, ot_id, tecnico_id)
  where estado = 'activo';

create unique index if not exists ot_participantes_responsable_activo_uq
  on public.ot_participantes(tenant_id, ot_id)
  where estado = 'activo' and rol = 'responsable';

-- Bootstrap histórico: assigned_to continúa siendo la referencia responsable
-- y se refleja en la nueva tabla sin modificar ninguna OT existente.
insert into public.ot_participantes (
  tenant_id,
  ot_id,
  tecnico_id,
  rol,
  estado,
  added_by,
  added_at,
  motivo,
  created_at,
  updated_at
)
select
  work_order.tenant_id,
  work_order.id,
  work_order.assigned_to,
  'responsable',
  'activo',
  coalesce(work_order.assigned_by, work_order.created_by),
  coalesce(work_order.assigned_at, work_order.created_at, clock_timestamp()),
  'bootstrap_assigned_to',
  coalesce(work_order.assigned_at, work_order.created_at, clock_timestamp()),
  clock_timestamp()
from public.ordenes_trabajo work_order
where work_order.assigned_to is not null
  and not exists (
    select 1
    from public.ot_participantes participant
    where participant.tenant_id = work_order.tenant_id
      and participant.ot_id = work_order.id
      and participant.tecnico_id = work_order.assigned_to
      and participant.estado = 'activo'
  );

create or replace function private.is_active_work_order_participant(
  tenant_uuid uuid,
  work_order_uuid uuid,
  user_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.ot_participantes participant
    where participant.tenant_id = tenant_uuid
      and participant.ot_id = work_order_uuid
      and participant.tecnico_id = user_uuid
      and participant.estado = 'activo'
  );
$function$;

create or replace function private.sync_work_order_responsible_participant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  actor_uuid uuid := auth.uid();
  changed_rows integer;
begin
  if tg_op = 'UPDATE' and old.assigned_to is not distinct from new.assigned_to then
    return new;
  end if;

  if new.assigned_to is not null and not exists (
    select 1
    from public.tenant_members member
    where member.tenant_id = new.tenant_id
      and member.user_id = new.assigned_to
      and member.estado = 'activo'
      and member.role in ('tecnico', 'tecnico_externo')
  ) then
    raise exception 'El responsable debe ser un técnico activo del tenant';
  end if;

  if tg_op = 'UPDATE' and old.assigned_to is not null then
    update public.ot_participantes
    set
      estado = 'retirado',
      removed_by = actor_uuid,
      removed_at = clock_timestamp(),
      motivo = coalesce(nullif(motivo, ''), 'responsable_sustituido'),
      updated_at = clock_timestamp()
    where tenant_id = old.tenant_id
      and ot_id = old.id
      and tecnico_id = old.assigned_to
      and rol = 'responsable'
      and estado = 'activo';
  end if;

  if new.assigned_to is null then
    return new;
  end if;

  update public.ot_participantes
  set
    rol = 'responsable',
    updated_at = clock_timestamp(),
    motivo = coalesce(nullif(motivo, ''), 'promocionado_a_responsable')
  where tenant_id = new.tenant_id
    and ot_id = new.id
    and tecnico_id = new.assigned_to
    and estado = 'activo';

  get diagnostics changed_rows = row_count;

  if changed_rows = 0 then
    insert into public.ot_participantes (
      tenant_id,
      ot_id,
      tecnico_id,
      rol,
      estado,
      added_by,
      added_at,
      motivo
    ) values (
      new.tenant_id,
      new.id,
      new.assigned_to,
      'responsable',
      'activo',
      coalesce(actor_uuid, new.assigned_by, new.created_by),
      coalesce(new.assigned_at, clock_timestamp()),
      'responsable_desde_assigned_to'
    );
  end if;

  return new;
end;
$function$;

revoke all on function private.is_active_work_order_participant(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.sync_work_order_responsible_participant()
  from public, anon, authenticated, service_role;

-- A partir de esta migración, cualquier INSERT/UPDATE futuro de assigned_to
-- mantiene la relación responsable de forma automática.
drop trigger if exists sync_work_order_responsible_participant
  on public.ordenes_trabajo;
create trigger sync_work_order_responsible_participant
after insert or update of assigned_to
on public.ordenes_trabajo
for each row
execute function private.sync_work_order_responsible_participant();

drop trigger if exists set_ot_participantes_updated_at
  on public.ot_participantes;
create trigger set_ot_participantes_updated_at
before update on public.ot_participantes
for each row
execute function public.set_updated_at();

alter table public.ot_participantes enable row level security;

create policy ot_participantes_read
on public.ot_participantes
for select
to authenticated
using (
  public.can_manage_work_orders(tenant_id)
  or tecnico_id = auth.uid()
  or public.can_access_work_order(ot_id)
);

-- Las mutaciones se introducirán mediante RPC en los siguientes movimientos.
-- En OT-06A authenticated solo recibe SELECT directo.
revoke all on table public.ot_participantes
  from public, anon, authenticated, service_role;
grant select on table public.ot_participantes to authenticated;
