-- Ciclo técnico de OT: aceptar, iniciar, bloquear y reanudar desde RPC controladas.
-- Mantiene las validaciones en servidor y deja preparada la app para el cierre guiado.

create or replace function public.enforce_work_order_management_transition()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if current_setting('app.work_order_lifecycle_rpc', true) = 'on' then
    return new;
  end if;

  if new.estado is distinct from old.estado and public.can_manage_work_orders(old.tenant_id) then
    if not (
      (old.estado in ('BORRADOR','NUEVA') and new.estado in ('ASIGNADA','CANCELADA'))
      or (old.estado in ('ASIGNADA','ACEPTADA','EN_CURSO','PAUSADA','PENDIENTE_MATERIAL','PENDIENTE_CLIENTE') and new.estado='CANCELADA')
      or (old.estado='FINALIZADA' and new.estado in ('VALIDADA','EN_CURSO'))
    ) then
      raise exception 'El administrador gestiona y revisa la OT, pero no puede ejecutar sus pasos técnicos';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.guard_work_order_update()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
 manager boolean := public.can_manage_work_orders(old.tenant_id);
 assigned_technician boolean := old.assigned_to = auth.uid() and (public.has_tenant_role(old.tenant_id,'tecnico') or public.has_tenant_role(old.tenant_id,'tecnico_externo'));
 valid_transition boolean := false;
 checklist_required boolean := coalesce((old.configuracion->>'requiere_checklist')::boolean,false);
 signature_required boolean := coalesce((old.configuracion->>'requiere_firma_cliente')::boolean,false);
 report_required boolean := coalesce((old.configuracion->>'requiere_informe')::boolean,false);
begin
 if old.tenant_id is distinct from new.tenant_id or old.id is distinct from new.id then raise exception 'No se puede cambiar la identidad o empresa de una OT'; end if;

 if current_setting('app.work_order_lifecycle_rpc', true) = 'on' then
   return new;
 end if;

 if old.estado in ('VALIDADA','CERRADA','CANCELADA') then raise exception 'La OT cerrada es de solo lectura'; end if;
 if old.estado='FINALIZADA' and (not manager or new.estado not in ('VALIDADA','EN_CURSO')) then raise exception 'La OT finalizada solo puede validarse o reabrirse por un responsable'; end if;
 if not manager then
  if not assigned_technician then raise exception 'Solo el tecnico asignado puede actualizar esta OT'; end if;
  if old.instalacion_id is distinct from new.instalacion_id or old.ubicacion_id is distinct from new.ubicacion_id or old.activo_id is distinct from new.activo_id or old.titulo is distinct from new.titulo or old.descripcion is distinct from new.descripcion or old.tipo is distinct from new.tipo or old.tipo_ot is distinct from new.tipo_ot or old.prioridad is distinct from new.prioridad or old.assigned_to is distinct from new.assigned_to or old.created_by is distinct from new.created_by or old.configuracion is distinct from new.configuracion or old.deleted_at is distinct from new.deleted_at then raise exception 'El tecnico no puede modificar la definicion de la OT'; end if;
  valid_transition := new.estado=old.estado or case old.estado when 'ASIGNADA' then new.estado='ACEPTADA' when 'ACEPTADA' then new.estado in ('EN_CURSO','PAUSADA') when 'EN_CURSO' then new.estado in ('PAUSADA','PENDIENTE_MATERIAL','PENDIENTE_CLIENTE','FINALIZADA') when 'PAUSADA' then new.estado in ('EN_CURSO','PENDIENTE_MATERIAL','PENDIENTE_CLIENTE') when 'PENDIENTE_MATERIAL' then new.estado in ('EN_CURSO','FINALIZADA') when 'PENDIENTE_CLIENTE' then new.estado in ('EN_CURSO','FINALIZADA') else false end;
  if not valid_transition then raise exception 'Transicion de estado no permitida: % -> %',old.estado,new.estado; end if;
 end if;
 if old.estado<>'FINALIZADA' and new.estado='FINALIZADA' then
  if checklist_required and (not exists(select 1 from public.ot_checklist_respuestas c where c.ot_id=old.id) or exists(select 1 from public.ot_checklist_respuestas c where c.ot_id=old.id and c.resultado='pendiente')) then raise exception 'No se puede finalizar: checklist incompleto'; end if;
  if exists(select 1 from public.ot_checklist_respuestas c where c.ot_id=old.id and c.requiere_foto and not exists(select 1 from public.ot_fotos f where f.checklist_respuesta_id=c.id)) then raise exception 'No se puede finalizar: faltan fotos obligatorias'; end if;
  if signature_required and not exists(select 1 from public.ot_visitas v where v.ot_id=old.id and v.firma_path is not null) then raise exception 'No se puede finalizar: falta la firma del cliente'; end if;
  if report_required and not exists(select 1 from public.ot_informes i where i.ot_id=old.id) then raise exception 'No se puede finalizar: falta el informe PDF'; end if;
 end if;
 return new;
end;
$function$;

create or replace function public.ensure_work_order_lifecycle_permission(work_order_uuid uuid)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  work_order_row public.ordenes_trabajo;
begin
  if auth.uid() is null then
    raise exception 'Sesión no autenticada';
  end if;

  select * into work_order_row
  from public.ordenes_trabajo
  where id = work_order_uuid
  for update;

  if work_order_row.id is null or work_order_row.deleted_at is not null then
    raise exception 'No se ha encontrado la OT';
  end if;

  if not (
    public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or public.can_manage_work_orders(work_order_row.tenant_id)
  ) then
    raise exception 'No tienes permisos para ejecutar esta OT';
  end if;

  if work_order_row.estado in ('VALIDADA','CERRADA','CANCELADA') then
    raise exception 'La OT cerrada es de solo lectura';
  end if;

  return work_order_row;
end;
$function$;

create or replace function public.accept_work_order(work_order_uuid uuid)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  work_order_row public.ordenes_trabajo;
  updated_row public.ordenes_trabajo;
begin
  work_order_row := public.ensure_work_order_lifecycle_permission(work_order_uuid);

  if work_order_row.estado <> 'ASIGNADA' then
    raise exception 'Solo se puede aceptar una OT asignada';
  end if;

  perform set_config('app.work_order_lifecycle_rpc', 'on', true);

  update public.ordenes_trabajo
  set estado = 'ACEPTADA', updated_at = now()
  where id = work_order_row.id and tenant_id = work_order_row.tenant_id
  returning * into updated_row;

  insert into public.audit_logs(tenant_id, user_id, action, entity_type, entity_id, metadata)
  values (work_order_row.tenant_id, auth.uid(), 'accept_work_order', 'ordenes_trabajo', work_order_row.id, jsonb_build_object('estado_anterior', work_order_row.estado, 'estado_nuevo', 'ACEPTADA'));

  return updated_row;
end;
$function$;

create or replace function public.start_work_order_visit(work_order_uuid uuid)
returns public.ot_visitas
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  work_order_row public.ordenes_trabajo;
  visit_row public.ot_visitas;
  technician_uuid uuid;
begin
  work_order_row := public.ensure_work_order_lifecycle_permission(work_order_uuid);

  if work_order_row.estado not in ('ASIGNADA','ACEPTADA','PAUSADA','PENDIENTE_MATERIAL','PENDIENTE_CLIENTE','EN_CURSO') then
    raise exception 'La OT no está preparada para iniciar intervención';
  end if;

  if exists(select 1 from public.ot_visitas where ot_id = work_order_row.id and estado = 'EN_CURSO') then
    raise exception 'Ya existe una intervención en curso para esta OT';
  end if;

  technician_uuid := coalesce(work_order_row.assigned_to, auth.uid());

  perform set_config('app.work_order_lifecycle_rpc', 'on', true);

  insert into public.ot_visitas(
    tenant_id, ot_id, tecnico_id, fecha_inicio, estado, tipo_visita, created_at, updated_at
  ) values (
    work_order_row.tenant_id, work_order_row.id, technician_uuid, now(), 'EN_CURSO', 'intervencion', now(), now()
  ) returning * into visit_row;

  update public.ordenes_trabajo
  set estado = 'EN_CURSO', fecha_inicio = coalesce(fecha_inicio, now()), updated_at = now()
  where id = work_order_row.id and tenant_id = work_order_row.tenant_id;

  insert into public.audit_logs(tenant_id, user_id, action, entity_type, entity_id, metadata)
  values (work_order_row.tenant_id, auth.uid(), 'start_work_order_visit', 'ordenes_trabajo', work_order_row.id, jsonb_build_object('visita_id', visit_row.id, 'estado_anterior', work_order_row.estado, 'estado_nuevo', 'EN_CURSO'));

  return visit_row;
end;
$function$;

create or replace function public.block_work_order(work_order_uuid uuid, block_status text, reason_text text)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  work_order_row public.ordenes_trabajo;
  updated_row public.ordenes_trabajo;
  normalized_status text := upper(coalesce(nullif(block_status, ''), 'PAUSADA'));
  normalized_reason text := nullif(trim(coalesce(reason_text, '')), '');
begin
  work_order_row := public.ensure_work_order_lifecycle_permission(work_order_uuid);

  if normalized_status not in ('PAUSADA','PENDIENTE_MATERIAL','PENDIENTE_CLIENTE') then
    raise exception 'Estado de bloqueo no válido';
  end if;

  if normalized_reason is null then
    raise exception 'Indica el motivo del bloqueo';
  end if;

  perform set_config('app.work_order_lifecycle_rpc', 'on', true);

  update public.ordenes_trabajo
  set estado = normalized_status,
      revision_admin_notas = normalized_reason,
      updated_at = now()
  where id = work_order_row.id and tenant_id = work_order_row.tenant_id
  returning * into updated_row;

  update public.ot_visitas
  set observaciones = coalesce(observaciones || E'\n', '') || 'Bloqueo: ' || normalized_reason,
      updated_at = now()
  where ot_id = work_order_row.id and tenant_id = work_order_row.tenant_id and estado = 'EN_CURSO';

  insert into public.audit_logs(tenant_id, user_id, action, entity_type, entity_id, metadata)
  values (work_order_row.tenant_id, auth.uid(), 'block_work_order', 'ordenes_trabajo', work_order_row.id, jsonb_build_object('estado_anterior', work_order_row.estado, 'estado_nuevo', normalized_status, 'motivo', normalized_reason));

  return updated_row;
end;
$function$;

create or replace function public.resume_work_order(work_order_uuid uuid)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  work_order_row public.ordenes_trabajo;
  updated_row public.ordenes_trabajo;
begin
  work_order_row := public.ensure_work_order_lifecycle_permission(work_order_uuid);

  if work_order_row.estado not in ('PAUSADA','PENDIENTE_MATERIAL','PENDIENTE_CLIENTE') then
    raise exception 'Solo se puede reanudar una OT pausada o pendiente';
  end if;

  perform set_config('app.work_order_lifecycle_rpc', 'on', true);

  update public.ordenes_trabajo
  set estado = 'EN_CURSO', updated_at = now()
  where id = work_order_row.id and tenant_id = work_order_row.tenant_id
  returning * into updated_row;

  insert into public.audit_logs(tenant_id, user_id, action, entity_type, entity_id, metadata)
  values (work_order_row.tenant_id, auth.uid(), 'resume_work_order', 'ordenes_trabajo', work_order_row.id, jsonb_build_object('estado_anterior', work_order_row.estado, 'estado_nuevo', 'EN_CURSO'));

  return updated_row;
end;
$function$;

grant execute on function public.ensure_work_order_lifecycle_permission(uuid) to authenticated, service_role;
grant execute on function public.accept_work_order(uuid) to authenticated, service_role;
grant execute on function public.start_work_order_visit(uuid) to authenticated, service_role;
grant execute on function public.block_work_order(uuid, text, text) to authenticated, service_role;
grant execute on function public.resume_work_order(uuid) to authenticated, service_role;
