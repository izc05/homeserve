-- OT-05D: vínculo opcional activo -> sistema técnico.
-- Sin backfill: todos los activos existentes mantienen sistema_id = NULL.

alter table public.sistemas_instalacion
  add constraint sistemas_instalacion_tenant_instalacion_id_key
  unique (tenant_id, instalacion_id, id);

alter table public.activos
  add column sistema_id uuid,
  add constraint activos_tenant_instalacion_sistema_id_fkey
    foreign key (tenant_id, instalacion_id, sistema_id)
    references public.sistemas_instalacion(tenant_id, instalacion_id, id)
    on delete restrict;

create index activos_sistema_idx
on public.activos (tenant_id, sistema_id)
where sistema_id is not null and deleted_at is null;
