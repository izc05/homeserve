-- OT-05B: Sistema técnico v1.
-- Alcance deliberadamente mínimo: entidad por instalación, sin backfill y sin tocar activos/OT.

create table public.sistemas_instalacion (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  instalacion_id uuid not null,
  nombre text not null,
  codigo text,
  especialidad text not null default 'general',
  descripcion text,
  criticidad text not null default 'media',
  estado text not null default 'activo',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint sistemas_instalacion_tenant_id_id_key unique (tenant_id, id),
  constraint sistemas_instalacion_tenant_id_instalacion_id_fkey
    foreign key (tenant_id, instalacion_id)
    references public.instalaciones(tenant_id, id),
  constraint sistemas_instalacion_nombre_check
    check (char_length(trim(nombre)) between 2 and 180),
  constraint sistemas_instalacion_especialidad_check
    check (char_length(trim(especialidad)) between 2 and 80),
  constraint sistemas_instalacion_criticidad_check
    check (criticidad in ('baja', 'media', 'alta', 'critica')),
  constraint sistemas_instalacion_estado_check
    check (estado in ('activo', 'fuera_servicio', 'inactivo'))
);

create unique index sistemas_instalacion_codigo_activo_uq
on public.sistemas_instalacion (tenant_id, instalacion_id, lower(codigo))
where codigo is not null and deleted_at is null;

create index sistemas_instalacion_instalacion_estado_idx
on public.sistemas_instalacion (tenant_id, instalacion_id, estado)
where deleted_at is null;

alter table public.sistemas_instalacion enable row level security;

grant select, insert, update on public.sistemas_instalacion to authenticated;

create policy sistemas_instalacion_read
on public.sistemas_instalacion
for select
to authenticated
using (public.has_tenant_access(tenant_id));

create policy sistemas_instalacion_insert
on public.sistemas_instalacion
for insert
to authenticated
with check (public.can_manage_work_orders(tenant_id));

create policy sistemas_instalacion_update
on public.sistemas_instalacion
for update
to authenticated
using (public.can_manage_work_orders(tenant_id))
with check (public.can_manage_work_orders(tenant_id));

create trigger sistemas_instalacion_set_updated_at
before update on public.sistemas_instalacion
for each row execute function public.set_updated_at();
