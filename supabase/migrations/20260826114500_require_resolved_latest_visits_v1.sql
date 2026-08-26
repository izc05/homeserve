-- OT-06 hardening: no permitir el cierre técnico global mientras la última
-- visita finalizada de algún técnico siga declarando trabajo pendiente.
--
-- Una visita histórica pendiente deja de bloquear cuando ese mismo técnico
-- realiza una visita posterior y la cierra como `trabajo_completado`.

create or replace function public.finalize_work_order_technical(
  work_order_uuid uuid,
  summary_text text
)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  work_summary text := nullif(btrim(summary_text), '');
  requirements jsonb;
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);

  if work_order_row.assigned_to is distinct from auth.uid()
    or not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or work_order_row.estado <> 'EN_CURSO'
  then
    raise exception 'Solo el técnico responsable puede finalizar una OT en curso';
  end if;

  if work_summary is null then
    raise exception 'No se puede finalizar: falta el resumen del trabajo realizado';
  end if;

  if exists (
    select 1
    from public.ot_visitas visit
    where visit.tenant_id = work_order_row.tenant_id
      and visit.ot_id = work_order_row.id
      and visit.estado = 'EN_CURSO'
  ) then
    raise exception 'No se puede finalizar la OT mientras existan visitas en curso';
  end if;

  if not exists (
    select 1
    from public.ot_visitas visit
    where visit.tenant_id = work_order_row.tenant_id
      and visit.ot_id = work_order_row.id
      and visit.estado = 'FINALIZADA'
  ) then
    raise exception 'No se puede finalizar la OT sin ninguna visita finalizada';
  end if;

  -- La decisión se toma sobre la última visita cerrada de cada técnico. Así se
  -- conserva todo el histórico y una visita posterior puede resolver una
  -- incidencia que anteriormente quedó pendiente.
  if exists (
    select 1
    from (
      select distinct on (visit.tecnico_id)
        visit.tecnico_id,
        visit.resultado_cierre
      from public.ot_visitas visit
      where visit.tenant_id = work_order_row.tenant_id
        and visit.ot_id = work_order_row.id
        and visit.estado = 'FINALIZADA'
      order by
        visit.tecnico_id,
        visit.fecha_fin desc nulls last,
        visit.created_at desc,
        visit.id desc
    ) latest_visit
    where coalesce(latest_visit.resultado_cierre, '') <> 'trabajo_completado'
  ) then
    raise exception 'No se puede finalizar la OT: existe trabajo pendiente en la última visita de un técnico';
  end if;

  requirements := coalesce(work_order_row.configuracion, '{}'::jsonb);
  perform private.assert_work_order_completion_requirements(
    work_order_row.tenant_id,
    work_order_row.id,
    requirements
  );

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set
    estado = 'FINALIZADA_TECNICO',
    fecha_fin = clock_timestamp(),
    trabajo_realizado = work_summary,
    updated_at = clock_timestamp()
  where id = work_order_row.id
  returning * into work_order_row;

  perform public.log_audit(
    work_order_row.tenant_id,
    'finalize_work_order_technical',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'estado_anterior', 'EN_CURSO',
      'estado_nuevo', 'FINALIZADA_TECNICO',
      'responsible_id', auth.uid(),
      'finalized_visits', (
        select count(*)
        from public.ot_visitas visit
        where visit.tenant_id = work_order_row.tenant_id
          and visit.ot_id = work_order_row.id
          and visit.estado = 'FINALIZADA'
      )
    )
  );

  return work_order_row;
end;
$function$;

alter function public.finalize_work_order_technical(uuid, text) owner to postgres;

revoke execute on function public.finalize_work_order_technical(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.finalize_work_order_technical(uuid, text)
  to authenticated;
