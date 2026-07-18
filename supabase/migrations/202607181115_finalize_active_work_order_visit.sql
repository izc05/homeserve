-- Finalizar la intervención activa desde una OT.
-- Evita que el frontend tenga que conocer previamente el id de la visita en curso.

create or replace function public.finalize_active_work_order_visit(
  work_order_uuid uuid,
  payload_json jsonb default '{}'::jsonb
)
returns public.ot_visitas
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  work_order_row public.ordenes_trabajo;
  visit_row public.ot_visitas;
begin
  work_order_row := public.ensure_work_order_lifecycle_permission(work_order_uuid);

  select * into visit_row
  from public.ot_visitas
  where ot_id = work_order_row.id
    and tenant_id = work_order_row.tenant_id
    and estado = 'EN_CURSO'
  order by fecha_inicio desc nulls last, created_at desc
  limit 1;

  if visit_row.id is null then
    raise exception 'No hay una intervención en curso para finalizar';
  end if;

  return public.finalize_work_order_visit(visit_row.id, payload_json);
end;
$function$;

grant execute on function public.finalize_active_work_order_visit(uuid, jsonb) to authenticated, service_role;
