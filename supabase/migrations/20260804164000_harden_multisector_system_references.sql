-- Technical systems use soft deletion. Physical deletion is restricted while
-- assets or work orders preserve a historical reference to the system.

alter table public.activos
  drop constraint if exists activos_tenant_id_sistema_id_fkey,
  add constraint activos_tenant_id_sistema_id_fkey
    foreign key (tenant_id, sistema_id)
    references public.sistemas_instalacion(tenant_id, id) on delete restrict;

alter table public.ordenes_trabajo
  drop constraint if exists ordenes_trabajo_tenant_id_sistema_id_fkey,
  add constraint ordenes_trabajo_tenant_id_sistema_id_fkey
    foreign key (tenant_id, sistema_id)
    references public.sistemas_instalacion(tenant_id, id) on delete restrict;
