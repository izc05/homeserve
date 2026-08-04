-- Capacidades para automatizar el primer informe obligatorio sin impedir versiones manuales posteriores.

create or replace function public.get_work_order_report_capabilities(work_order_uuid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  manager_access boolean := false;
  final_exists boolean := false;
  provisional_exists boolean := false;
  report_required boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select work_order.*
    into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = work_order_uuid
    and work_order.deleted_at is null;

  if work_order_row.id is null
    or not public.can_access_work_order(work_order_row.id)
  then
    raise exception 'La OT no está disponible';
  end if;

  manager_access := public.can_manage_work_orders(work_order_row.tenant_id);
  report_required := coalesce(work_order_row.configuracion ->> 'requiere_informe', 'false') = 'true';

  select exists (
    select 1
    from public.ot_informes report
    where report.ot_id = work_order_row.id
      and report.tipo = 'provisional'
      and report.estado in ('generando', 'listo')
  ) into provisional_exists;

  select exists (
    select 1
    from public.ot_informes report
    where report.ot_id = work_order_row.id
      and report.tipo = 'final'
      and report.estado in ('generando', 'listo')
  ) into final_exists;

  return jsonb_build_object(
    'work_order_status', work_order_row.estado,
    'report_required', report_required,
    'provisional_report_exists', provisional_exists,
    'can_generate_provisional',
      work_order_row.estado = 'FINALIZADA_TECNICO'
      and (manager_access or work_order_row.assigned_to = auth.uid()),
    'can_generate_final',
      work_order_row.estado = 'VALIDADA'
      and manager_access
      and not final_exists,
    'final_report_exists', final_exists
  );
end;
$function$;
