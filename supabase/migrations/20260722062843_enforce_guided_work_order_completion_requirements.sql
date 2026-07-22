-- Cierre técnico guiado y revisión administrativa coherente con el esquema actual.
-- Las funciones conservan sus firmas y estados canónicos; las comprobaciones se
-- realizan en servidor para que el frontend no sea la frontera de seguridad.

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
  work_summary text;
  requirements jsonb;
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);

  if not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or work_order_row.assigned_to is distinct from auth.uid()
    or work_order_row.estado <> 'EN_CURSO'
  then
    raise exception 'Solo el técnico asignado puede finalizar una OT en curso';
  end if;

  work_summary := nullif(btrim(payload_json ->> 'trabajo_realizado'), '');
  if work_summary is null then
    raise exception 'No se puede finalizar: falta el resumen del trabajo realizado';
  end if;

  requirements := coalesce(work_order_row.configuracion, '{}'::jsonb);

  if coalesce((requirements ->> 'requiere_checklist')::boolean, false)
    and (
      not exists (
        select 1
        from public.ot_checklist_respuestas response
        where response.ot_id = work_order_row.id
          and response.tenant_id = work_order_row.tenant_id
      )
      or exists (
        select 1
        from public.ot_checklist_respuestas response
        where response.ot_id = work_order_row.id
          and response.tenant_id = work_order_row.tenant_id
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
    where response.ot_id = work_order_row.id
      and response.tenant_id = work_order_row.tenant_id
      and response.requiere_foto
      and not exists (
        select 1
        from public.ot_fotos photo
        where photo.ot_id = work_order_row.id
          and photo.tenant_id = work_order_row.tenant_id
          and photo.checklist_respuesta_id = response.id
      )
  ) then
    raise exception 'No se puede finalizar: faltan fotografías vinculadas al checklist';
  end if;

  if coalesce((requirements ->> 'requiere_fotos_iniciales')::boolean, false)
    and not exists (
      select 1
      from public.ot_fotos photo
      where photo.ot_id = work_order_row.id
        and photo.tenant_id = work_order_row.tenant_id
        and photo.tipo = 'inicial'
    )
  then
    raise exception 'No se puede finalizar: falta una fotografía inicial';
  end if;

  if coalesce((requirements ->> 'requiere_fotos_finales')::boolean, false)
    and not exists (
      select 1
      from public.ot_fotos photo
      where photo.ot_id = work_order_row.id
        and photo.tenant_id = work_order_row.tenant_id
        and photo.tipo = 'final'
    )
  then
    raise exception 'No se puede finalizar: falta una fotografía final';
  end if;

  if coalesce((requirements ->> 'requiere_mediciones')::boolean, false)
    and not exists (
      select 1
      from public.ot_checklist_respuestas response
      where response.ot_id = work_order_row.id
        and response.tenant_id = work_order_row.tenant_id
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
      where response.ot_id = work_order_row.id
        and response.tenant_id = work_order_row.tenant_id
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
      where response.ot_id = work_order_row.id
        and response.tenant_id = work_order_row.tenant_id
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
      where signature.ot_id = work_order_row.id
        and signature.tenant_id = work_order_row.tenant_id
        and signature.tipo = 'tecnico'
    )
  then
    raise exception 'No se puede finalizar: falta la firma del técnico';
  end if;

  if coalesce((requirements ->> 'requiere_firma_cliente')::boolean, false)
    and not exists (
      select 1
      from public.ot_firmas signature
      where signature.ot_id = work_order_row.id
        and signature.tenant_id = work_order_row.tenant_id
        and signature.tipo = 'responsable'
    )
  then
    raise exception 'No se puede finalizar: falta la firma del responsable';
  end if;

  if coalesce((requirements ->> 'requiere_informe')::boolean, false)
    and not exists (
      select 1
      from public.ot_informes report
      where report.ot_id = work_order_row.id
        and report.tenant_id = work_order_row.tenant_id
        and nullif(btrim(coalesce(report.path, '')), '') is not null
    )
  then
    raise exception 'No se puede finalizar: falta el informe técnico';
  end if;

  select visit.*
    into visit_row
  from public.ot_visitas visit
  where visit.ot_id = work_order_row.id
    and visit.tenant_id = work_order_row.tenant_id
    and visit.estado = 'EN_CURSO'
  order by visit.fecha_inicio desc
  limit 1
  for update;

  if visit_row.id is null then
    raise exception 'No existe una visita en curso';
  end if;

  update public.ot_visitas
  set
    estado = 'FINALIZADA',
    fecha_fin = now(),
    trabajo_realizado = work_summary,
    diagnostico = nullif(btrim(payload_json ->> 'diagnostico'), ''),
    pruebas_realizadas = nullif(btrim(payload_json ->> 'pruebas_realizadas'), ''),
    recomendaciones = nullif(btrim(payload_json ->> 'recomendaciones'), ''),
    trabajo_pendiente = nullif(btrim(payload_json ->> 'trabajo_pendiente'), ''),
    motivo_cierre = nullif(btrim(payload_json ->> 'motivo_cierre'), ''),
    proxima_accion = nullif(btrim(payload_json ->> 'proxima_accion'), ''),
    estado_final_activo = nullif(btrim(payload_json ->> 'estado_final_activo'), ''),
    resultado_cierre = coalesce(nullif(btrim(payload_json ->> 'resultado_cierre'), ''), 'trabajo_completado'),
    updated_at = now()
  where id = visit_row.id
  returning * into visit_row;

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set
    estado = 'FINALIZADA_TECNICO',
    fecha_fin = now(),
    trabajo_realizado = visit_row.trabajo_realizado,
    updated_at = now()
  where id = work_order_row.id;

  perform public.log_audit(
    work_order_row.tenant_id,
    'finalize_active_work_order_visit',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'estado_anterior', 'EN_CURSO',
      'estado_nuevo', 'FINALIZADA_TECNICO',
      'visit_id', visit_row.id
    )
  );

  return visit_row;
end;
$function$;

create or replace function public.review_work_order(
  work_order_uuid uuid,
  decision_text text,
  notes_text text
)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  next_state text;
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, true);

  if work_order_row.estado <> 'FINALIZADA_TECNICO'
    or nullif(btrim(notes_text), '') is null
    or decision_text not in ('validada', 'correccion_solicitada')
  then
    raise exception 'La revisión no es válida';
  end if;

  next_state := case
    when decision_text = 'validada' then 'VALIDADA'
    else 'EN_CURSO'
  end;

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set
    estado = next_state,
    revision_admin_estado = decision_text,
    updated_at = now()
  where id = work_order_row.id
  returning * into work_order_row;

  insert into public.ot_revisiones_admin (
    tenant_id,
    ot_id,
    reviewer_id,
    reviewed_by,
    decision,
    notas,
    estado_anterior,
    estado_nuevo
  )
  values (
    work_order_row.tenant_id,
    work_order_row.id,
    auth.uid(),
    auth.uid(),
    decision_text,
    btrim(notes_text),
    'FINALIZADA_TECNICO',
    next_state
  );

  perform public.log_audit(
    work_order_row.tenant_id,
    case
      when decision_text = 'validada' then 'validate_work_order'
      else 'request_work_order_correction'
    end,
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'decision', decision_text,
      'estado_anterior', 'FINALIZADA_TECNICO',
      'estado_nuevo', next_state
    )
  );

  return work_order_row;
end;
$function$;

revoke execute on function public.finalize_active_work_order_visit(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.review_work_order(uuid, text, text)
  from public, anon, authenticated, service_role;

grant execute on function public.finalize_active_work_order_visit(uuid, jsonb)
  to authenticated;
grant execute on function public.review_work_order(uuid, text, text)
  to authenticated;
