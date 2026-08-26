-- OT-06D: separar el cierre de la visita propia del cierre técnico global de OT.

create or replace function private.assert_work_order_completion_requirements(
  tenant_uuid uuid,
  work_order_uuid uuid,
  requirements jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if coalesce((requirements ->> 'requiere_checklist')::boolean, false)
    and (
      not exists (
        select 1
        from public.ot_checklist_respuestas response
        where response.ot_id = work_order_uuid
          and response.tenant_id = tenant_uuid
      )
      or exists (
        select 1
        from public.ot_checklist_respuestas response
        where response.ot_id = work_order_uuid
          and response.tenant_id = tenant_uuid
          and response.obligatorio
          and nullif(btrim(coalesce(response.resultado, '')), '') is null
      )
    )
  then
    raise exception 'No se puede finalizar: checklist incompleto';
  end if;

  if exists (
    select 1
    from public.ot_checklist_respuestas response
    where response.ot_id = work_order_uuid
      and response.tenant_id = tenant_uuid
      and response.requiere_foto
      and not exists (
        select 1
        from public.ot_fotos photo
        where photo.ot_id = work_order_uuid
          and photo.tenant_id = tenant_uuid
          and photo.checklist_respuesta_id = response.id
      )
  ) then
    raise exception 'No se puede finalizar: faltan fotografías vinculadas al checklist';
  end if;

  if coalesce((requirements ->> 'requiere_fotos_iniciales')::boolean, false)
    and not exists (
      select 1 from public.ot_fotos photo
      where photo.ot_id = work_order_uuid
        and photo.tenant_id = tenant_uuid
        and photo.tipo = 'inicial'
    )
  then
    raise exception 'No se puede finalizar: falta una fotografía inicial';
  end if;

  if coalesce((requirements ->> 'requiere_fotos_finales')::boolean, false)
    and not exists (
      select 1 from public.ot_fotos photo
      where photo.ot_id = work_order_uuid
        and photo.tenant_id = tenant_uuid
        and photo.tipo = 'final'
    )
  then
    raise exception 'No se puede finalizar: falta una fotografía final';
  end if;

  if coalesce((requirements ->> 'requiere_mediciones')::boolean, false)
    and not exists (
      select 1
      from public.ot_checklist_respuestas response
      where response.ot_id = work_order_uuid
        and response.tenant_id = tenant_uuid
        and response.plantilla_item_id = 'mediciones'
        and nullif(btrim(coalesce(response.resultado, '')), '') is not null
    )
  then
    raise exception 'No se puede finalizar: faltan las mediciones requeridas';
  end if;

  if coalesce((requirements ->> 'requiere_materiales')::boolean, false)
    and not exists (
      select 1
      from public.ot_checklist_respuestas response
      where response.ot_id = work_order_uuid
        and response.tenant_id = tenant_uuid
        and response.plantilla_item_id = 'materiales'
        and nullif(btrim(coalesce(response.resultado, '')), '') is not null
    )
  then
    raise exception 'No se puede finalizar: falta el registro de materiales';
  end if;

  if coalesce((requirements ->> 'requiere_prueba_funcional')::boolean, false)
    and not exists (
      select 1
      from public.ot_checklist_respuestas response
      where response.ot_id = work_order_uuid
        and response.tenant_id = tenant_uuid
        and response.plantilla_item_id = 'prueba_funcional'
        and nullif(btrim(coalesce(response.resultado, '')), '') is not null
    )
  then
    raise exception 'No se puede finalizar: falta la prueba funcional';
  end if;

  if coalesce((requirements ->> 'requiere_firma_tecnico')::boolean, false)
    and not exists (
      select 1
      from public.ot_firmas signature
      where signature.ot_id = work_order_uuid
        and signature.tenant_id = tenant_uuid
        and signature.tipo = 'tecnico'
    )
  then
    raise exception 'No se puede finalizar: falta la firma del técnico';
  end if;

  if coalesce((requirements ->> 'requiere_firma_cliente')::boolean, false)
    and not exists (
      select 1
      from public.ot_firmas signature
      where signature.ot_id = work_order_uuid
        and signature.tenant_id = tenant_uuid
        and signature.tipo = 'responsable'
    )
  then
    raise exception 'No se puede finalizar: falta la firma del responsable';
  end if;

  if coalesce((requirements ->> 'requiere_informe')::boolean, false)
    and not exists (
      select 1
      from public.ot_informes report
      where report.ot_id = work_order_uuid
        and report.tenant_id = tenant_uuid
        and nullif(btrim(coalesce(report.path, '')), '') is not null
    )
  then
    raise exception 'No se puede finalizar: falta el informe técnico';
  end if;
end;
$function$;

revoke all on function private.assert_work_order_completion_requirements(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.close_my_work_order_visit(
  work_order_uuid uuid,
  payload_json jsonb default '{}'::jsonb
)
returns public.ot_visitas
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  visit_row public.ot_visitas;
  work_summary text := nullif(btrim(payload_json ->> 'trabajo_realizado'), '');
  close_result text := coalesce(nullif(btrim(payload_json ->> 'resultado_cierre'), ''), 'trabajo_completado');
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);

  if not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or work_order_row.estado not in ('EN_CURSO', 'BLOQUEADA')
  then
    raise exception 'Solo un técnico participante puede cerrar su visita en una OT activa';
  end if;

  if work_summary is null then
    raise exception 'Indica el trabajo realizado antes de cerrar la visita';
  end if;

  if close_result not in (
    'trabajo_completado',
    'pendiente_material',
    'pendiente_cliente',
    'necesita_otra_visita'
  ) then
    raise exception 'Resultado de cierre de visita no válido';
  end if;

  select visit.*
  into visit_row
  from public.ot_visitas visit
  where visit.tenant_id = work_order_row.tenant_id
    and visit.ot_id = work_order_row.id
    and visit.tecnico_id = auth.uid()
    and visit.estado = 'EN_CURSO'
  order by visit.fecha_inicio desc, visit.created_at desc
  limit 1
  for update;

  if visit_row.id is null then
    raise exception 'No tienes una visita en curso para esta OT';
  end if;

  update public.ot_visitas
  set
    estado = 'FINALIZADA',
    fecha_fin = clock_timestamp(),
    trabajo_realizado = work_summary,
    diagnostico = nullif(btrim(payload_json ->> 'diagnostico'), ''),
    pruebas_realizadas = nullif(btrim(payload_json ->> 'pruebas_realizadas'), ''),
    recomendaciones = nullif(btrim(payload_json ->> 'recomendaciones'), ''),
    trabajo_pendiente = nullif(btrim(payload_json ->> 'trabajo_pendiente'), ''),
    motivo_cierre = nullif(btrim(payload_json ->> 'motivo_cierre'), ''),
    proxima_accion = nullif(btrim(payload_json ->> 'proxima_accion'), ''),
    estado_final_activo = nullif(btrim(payload_json ->> 'estado_final_activo'), ''),
    resultado_cierre = close_result,
    updated_at = clock_timestamp()
  where id = visit_row.id
  returning * into visit_row;

  perform public.log_audit(
    work_order_row.tenant_id,
    'close_work_order_visit',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'visit_id', visit_row.id,
      'technician_id', auth.uid(),
      'resultado_cierre', close_result
    )
  );

  return visit_row;
end;
$function$;

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

-- Compatibilidad temporal con el frontend actual: solo sirve cuando el
-- responsable tiene su propia visita activa y no existe otra visita activa.
create or replace function public.finalize_active_work_order_visit(
  work_order_uuid uuid,
  payload_json jsonb default '{}'::jsonb
)
returns public.ot_visitas
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  visit_row public.ot_visitas;
  work_summary text := nullif(btrim(payload_json ->> 'trabajo_realizado'), '');
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);

  if work_order_row.assigned_to is distinct from auth.uid()
    or not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or work_order_row.estado <> 'EN_CURSO'
  then
    raise exception 'Solo el técnico asignado puede finalizar una OT en curso';
  end if;

  if work_summary is null then
    raise exception 'No se puede finalizar: falta el resumen del trabajo realizado';
  end if;

  select visit.*
  into visit_row
  from public.ot_visitas visit
  where visit.tenant_id = work_order_row.tenant_id
    and visit.ot_id = work_order_row.id
    and visit.tecnico_id = auth.uid()
    and visit.estado = 'EN_CURSO'
  order by visit.fecha_inicio desc, visit.created_at desc
  limit 1
  for update;

  if visit_row.id is null then
    raise exception 'No existe una visita en curso del técnico responsable';
  end if;

  visit_row := public.close_my_work_order_visit(work_order_uuid, payload_json);
  perform public.finalize_work_order_technical(work_order_uuid, work_summary);

  perform public.log_audit(
    work_order_row.tenant_id,
    'finalize_active_work_order_visit',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'visit_id', visit_row.id,
      'compatibility_wrapper', true
    )
  );

  return visit_row;
end;
$function$;

alter function public.close_my_work_order_visit(uuid, jsonb) owner to postgres;
alter function public.finalize_work_order_technical(uuid, text) owner to postgres;
alter function public.finalize_active_work_order_visit(uuid, jsonb) owner to postgres;

revoke execute on function public.close_my_work_order_visit(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.finalize_work_order_technical(uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.finalize_active_work_order_visit(uuid, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function public.close_my_work_order_visit(uuid, jsonb)
  to authenticated;
grant execute on function public.finalize_work_order_technical(uuid, text)
  to authenticated;
grant execute on function public.finalize_active_work_order_visit(uuid, jsonb)
  to authenticated;
