-- Permite que un gestor reciba la fila creada por INSERT ... RETURNING.
-- Los técnicos mantienen el aislamiento existente mediante can_access_work_order(id).
drop policy if exists orders_read on public.ordenes_trabajo;

create policy orders_read
on public.ordenes_trabajo
for select
to authenticated
using (
  public.can_manage_work_orders(tenant_id)
  or public.can_access_work_order(id)
);
