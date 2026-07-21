-- Campos de contacto aditivos para clientes e instalaciones.

alter table public.clientes
  add column if not exists cif_nif text,
  add column if not exists contacto_nombre text;

alter table public.instalaciones
  add column if not exists contacto_nombre text,
  add column if not exists contacto_telefono text,
  add column if not exists contacto_email text;

create index if not exists idx_clientes_tenant_cif_nif_normalized
  on public.clientes (
    tenant_id,
    upper(replace(replace(replace(btrim(cif_nif), ' ', ''), '-', ''), '.', ''))
  )
  where cif_nif is not null
    and deleted_at is null;
