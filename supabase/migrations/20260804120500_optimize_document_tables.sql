-- Las escrituras de firmas e informes se realizan mediante RPC estrechas.
-- Se eliminan políticas ALL obsoletas que duplicaban las políticas de lectura.

drop policy if exists signatures_write on public.ot_firmas;
drop policy if exists reports_write on public.ot_informes;

create index if not exists idx_ot_firmas_tenant_ot
  on public.ot_firmas (tenant_id, ot_id);
create index if not exists idx_ot_firmas_visita
  on public.ot_firmas (visita_id)
  where visita_id is not null;
create index if not exists idx_ot_firmas_created_by
  on public.ot_firmas (created_by);

create index if not exists idx_ot_informes_tenant_ot
  on public.ot_informes (tenant_id, ot_id);
create index if not exists idx_ot_informes_created_by
  on public.ot_informes (created_by);
