-- Normaliza las RPC legacy al contrato operativo actual.
-- SECURITY DEFINER se reserva para transiciones que bloquean filas y deben atravesar RLS;
-- todas validan explícitamente usuario, tenant, rol y estado antes de modificar datos.

alter table public.ordenes_trabajo
  add column if not exists cliente_id uuid,
  add column if not exists tipo_ot_detalle text,
  add column if not exists activos_relacionados uuid[] not null default '{}'::uuid[],
  add column if not exists checklist_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists checklist_snapshot_version integer not null default 1;
alter table public.ot_checklist_respuestas
  add column if not exists punto text,
  add column if not exists descripcion text,
  add column if not exists tipo_respuesta text,
  add column if not exists created_by uuid references public.profiles(id);
alter table public.ot_revisiones_admin
  add column if not exists reviewer_id uuid references public.profiles(id),
  add column if not exists estado_anterior text,
  add column if not exists estado_nuevo text;

create or replace function public.require_work_order_actor(work_order_uuid uuid, require_manager boolean default false)
returns public.ordenes_trabajo
language plpgsql security definer set search_path = public
as $$
declare work_order_row public.ordenes_trabajo;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into work_order_row from public.ordenes_trabajo where id = work_order_uuid and deleted_at is null for update;
  if work_order_row.id is null then raise exception 'La OT no existe'; end if;
  if require_manager then
    if not public.can_manage_work_orders(work_order_row.tenant_id) then raise exception 'No tienes permiso para gestionar esta OT'; end if;
  elsif not (public.can_manage_work_orders(work_order_row.tenant_id) or public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)) then
    raise exception 'No tienes permiso sobre esta OT';
  end if;
  if work_order_row.estado in ('VALIDADA','CANCELADA') then raise exception 'La OT validada o cancelada es inmutable'; end if;
  return work_order_row;
end;
$$;

create or replace function public.guard_official_work_order_update()
returns trigger language plpgsql set search_path = public
as $$
declare manager boolean := public.can_manage_work_orders(old.tenant_id);
declare technician boolean := old.assigned_to = auth.uid() and public.can_execute_work_order(old.tenant_id, old.id);
begin
  if old.tenant_id is distinct from new.tenant_id or old.id is distinct from new.id then raise exception 'No se puede cambiar la identidad de una OT'; end if;
  if old.estado in ('VALIDADA','CANCELADA') then raise exception 'La OT validada o cancelada es inmutable'; end if;
  if current_setting('app.work_order_rpc', true) = 'on' then return new; end if;
  if not manager and not technician then raise exception 'No tienes permiso para modificar esta OT'; end if;
  if technician and (
    old.cliente_id is distinct from new.cliente_id or old.instalacion_id is distinct from new.instalacion_id or old.ubicacion_id is distinct from new.ubicacion_id or old.activo_id is distinct from new.activo_id or old.titulo is distinct from new.titulo or old.descripcion is distinct from new.descripcion or old.tipo is distinct from new.tipo or old.prioridad is distinct from new.prioridad or old.assigned_to is distinct from new.assigned_to or old.configuracion is distinct from new.configuracion
  ) then raise exception 'El técnico no puede modificar la definición, prioridad ni asignación de la OT'; end if;
  if new.estado is distinct from old.estado then raise exception 'Los estados de OT solo se cambian mediante RPC'; end if;
  return new;
end;
$$;
drop trigger if exists work_order_guard_update on public.ordenes_trabajo;
drop trigger if exists guard_work_order_update on public.ordenes_trabajo;
create trigger guard_work_order_update before update on public.ordenes_trabajo for each row execute function public.guard_official_work_order_update();

create or replace function public.create_work_order(
  tenant_uuid uuid, installation_uuid uuid, title_text text, description_text text default null,
  work_order_type_text text default 'mantenimiento_preventivo', priority_text text default 'normal',
  location_uuid uuid default null, asset_uuid uuid default null, technician_uuid uuid default null,
  planned_at_value timestamptz default null, due_at_value timestamptz default null,
  estimated_minutes_value integer default null, instructions_text text default null,
  safety_notes_text text default null, expected_result_text text default null,
  requirements_json jsonb default '{}'::jsonb
) returns public.ordenes_trabajo
language plpgsql security invoker set search_path = public
as $$
declare created_row public.ordenes_trabajo; installation_row public.instalaciones; normalized_requirements jsonb;
begin
  if auth.uid() is null or not public.can_manage_work_orders(tenant_uuid) then raise exception 'No tienes permiso para crear OT'; end if;
  if nullif(trim(title_text),'') is null or char_length(trim(title_text)) < 3 then raise exception 'El título debe tener al menos 3 caracteres'; end if;
  if work_order_type_text not in ('averia','mantenimiento_preventivo','mantenimiento_correctivo','revision','inspeccion','instalacion','sustitucion','medicion','urgencia','otro') then raise exception 'Tipo de OT no válido'; end if;
  if priority_text not in ('baja','normal','alta','urgente','critica') then raise exception 'Prioridad no válida'; end if;
  if due_at_value is not null and planned_at_value is not null and due_at_value < planned_at_value then raise exception 'La fecha límite no puede ser anterior a la prevista'; end if;
  select * into installation_row from public.instalaciones where id=installation_uuid and tenant_id=tenant_uuid and deleted_at is null;
  if installation_row.id is null then raise exception 'La instalación no pertenece al tenant'; end if;
  if location_uuid is not null and not exists(select 1 from public.ubicaciones where id=location_uuid and tenant_id=tenant_uuid and instalacion_id=installation_uuid and deleted_at is null) then raise exception 'La ubicación no pertenece a la instalación'; end if;
  if asset_uuid is not null and not exists(select 1 from public.activos where id=asset_uuid and tenant_id=tenant_uuid and instalacion_id=installation_uuid and deleted_at is null) then raise exception 'El activo no pertenece a la instalación'; end if;
  if technician_uuid is not null and not exists(select 1 from public.tenant_members where tenant_id=tenant_uuid and user_id=technician_uuid and estado='activo' and role in ('tecnico','tecnico_externo')) then raise exception 'El técnico no está activo en este tenant'; end if;
  normalized_requirements := jsonb_build_object('requiere_checklist',coalesce((requirements_json->>'requiere_checklist')::boolean,true),'requiere_fotos_iniciales',coalesce((requirements_json->>'requiere_fotos_iniciales')::boolean,false),'requiere_fotos_finales',coalesce((requirements_json->>'requiere_fotos_finales')::boolean,true),'requiere_mediciones',coalesce((requirements_json->>'requiere_mediciones')::boolean,false),'requiere_materiales',coalesce((requirements_json->>'requiere_materiales')::boolean,false),'requiere_firma_tecnico',coalesce((requirements_json->>'requiere_firma_tecnico')::boolean,true),'requiere_firma_cliente',coalesce((requirements_json->>'requiere_firma_cliente')::boolean,false),'requiere_prueba_funcional',coalesce((requirements_json->>'requiere_prueba_funcional')::boolean,false),'requiere_informe',coalesce((requirements_json->>'requiere_informe')::boolean,true),'requiere_revision_admin',coalesce((requirements_json->>'requiere_revision_admin')::boolean,true));
  insert into public.ordenes_trabajo(tenant_id,cliente_id,codigo_ot,instalacion_id,ubicacion_id,activo_id,titulo,descripcion,tipo,tipo_ot,prioridad,estado,assigned_to,assigned_by,assigned_at,fecha_prevista,fecha_limite,tiempo_estimado_min,duracion_estimada_minutos,instrucciones_tecnico,riesgos_precauciones,resultado_esperado,configuracion,revision_admin_estado,created_by)
  values(tenant_uuid,installation_row.cliente_id,public.next_work_order_code(),installation_uuid,location_uuid,asset_uuid,trim(title_text),nullif(trim(description_text),''),work_order_type_text,work_order_type_text,priority_text,case when technician_uuid is null then 'BORRADOR' else 'ASIGNADA' end,technician_uuid,case when technician_uuid is null then null else auth.uid() end,case when technician_uuid is null then null else now() end,planned_at_value,due_at_value,estimated_minutes_value,estimated_minutes_value,nullif(trim(instructions_text),''),nullif(trim(safety_notes_text),''),nullif(trim(expected_result_text),''),normalized_requirements,case when (normalized_requirements->>'requiere_revision_admin')::boolean then 'pendiente' else 'no_requerida' end,auth.uid()) returning * into created_row;
  perform public.log_audit(tenant_uuid,'create_work_order','ordenes_trabajo',created_row.id,jsonb_build_object('estado_nuevo',created_row.estado));
  return created_row;
end;
$$;

create or replace function public.assign_work_order(work_order_uuid uuid, technician_uuid uuid, planned_at_value timestamptz default null, reassignment_reason_text text default null)
returns public.ordenes_trabajo language plpgsql security invoker set search_path = public
as $$ declare work_order_row public.ordenes_trabajo; updated_row public.ordenes_trabajo; begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into work_order_row from public.ordenes_trabajo where id=work_order_uuid and deleted_at is null for update;
  if work_order_row.id is null or not public.can_manage_work_orders(work_order_row.tenant_id) then raise exception 'No tienes permiso para asignar esta OT'; end if;
  if work_order_row.estado not in ('BORRADOR','ASIGNADA') then raise exception 'La OT no puede reasignarse después de ser aceptada'; end if;
  if not exists(select 1 from public.tenant_members where tenant_id=work_order_row.tenant_id and user_id=technician_uuid and estado='activo' and role in ('tecnico','tecnico_externo')) then raise exception 'El técnico no está activo'; end if;
  perform set_config('app.work_order_rpc','on',true);
  update public.ordenes_trabajo set assigned_to=technician_uuid,assigned_by=auth.uid(),assigned_at=now(),reassignment_reason=nullif(trim(reassignment_reason_text),''),fecha_prevista=coalesce(planned_at_value,fecha_prevista),estado='ASIGNADA',updated_at=now() where id=work_order_uuid returning * into updated_row;
  perform public.log_audit(updated_row.tenant_id,'assign_work_order','ordenes_trabajo',updated_row.id,jsonb_build_object('assigned_to',technician_uuid)); return updated_row;
end; $$;

create or replace function public.accept_work_order(work_order_uuid uuid) returns public.ordenes_trabajo language plpgsql security definer set search_path = public as $$ declare row_ot public.ordenes_trabajo; begin row_ot:=public.require_work_order_actor(work_order_uuid,false); if not public.can_execute_work_order(row_ot.tenant_id,row_ot.id) or row_ot.estado <> 'ASIGNADA' then raise exception 'Solo el técnico asignado puede aceptar una OT asignada'; end if; perform set_config('app.work_order_rpc','on',true); update public.ordenes_trabajo set estado='ACEPTADA',updated_at=now() where id=row_ot.id returning * into row_ot; perform public.log_audit(row_ot.tenant_id,'accept_work_order','ordenes_trabajo',row_ot.id,jsonb_build_object('estado_anterior','ASIGNADA','estado_nuevo','ACEPTADA')); return row_ot; end; $$;
create or replace function public.start_work_order_visit(work_order_uuid uuid) returns public.ot_visitas language plpgsql security definer set search_path = public as $$ declare row_ot public.ordenes_trabajo; visit_row public.ot_visitas; begin row_ot:=public.require_work_order_actor(work_order_uuid,false); if not public.can_execute_work_order(row_ot.tenant_id,row_ot.id) or row_ot.estado <> 'ACEPTADA' then raise exception 'Solo el técnico asignado puede iniciar una OT aceptada'; end if; perform set_config('app.work_order_rpc','on',true); insert into public.ot_visitas(tenant_id,ot_id,tecnico_id,estado,fecha_inicio,created_by) values(row_ot.tenant_id,row_ot.id,auth.uid(),'EN_CURSO',now(),auth.uid()) returning * into visit_row; update public.ordenes_trabajo set estado='EN_CURSO',fecha_inicio=coalesce(fecha_inicio,now()),updated_at=now() where id=row_ot.id; perform public.log_audit(row_ot.tenant_id,'start_work_order_visit','ordenes_trabajo',row_ot.id,'{}'); return visit_row; end; $$;
create or replace function public.block_work_order(work_order_uuid uuid, block_status text, reason_text text) returns public.ordenes_trabajo language plpgsql security definer set search_path = public as $$ declare row_ot public.ordenes_trabajo; begin row_ot:=public.require_work_order_actor(work_order_uuid,false); if not public.can_execute_work_order(row_ot.tenant_id,row_ot.id) or row_ot.estado <> 'EN_CURSO' or nullif(trim(reason_text),'') is null then raise exception 'Solo el técnico asignado puede bloquear una OT en curso indicando un motivo'; end if; perform set_config('app.work_order_rpc','on',true); update public.ordenes_trabajo set estado='BLOQUEADA',updated_at=now(),reassignment_reason=trim(reason_text) where id=row_ot.id returning * into row_ot; perform public.log_audit(row_ot.tenant_id,'block_work_order','ordenes_trabajo',row_ot.id,jsonb_build_object('motivo',trim(reason_text),'estado_nuevo','BLOQUEADA')); return row_ot; end; $$;
create or replace function public.resume_work_order(work_order_uuid uuid) returns public.ordenes_trabajo language plpgsql security definer set search_path = public as $$ declare row_ot public.ordenes_trabajo; begin row_ot:=public.require_work_order_actor(work_order_uuid,false); if not public.can_execute_work_order(row_ot.tenant_id,row_ot.id) or row_ot.estado <> 'BLOQUEADA' then raise exception 'Solo el técnico asignado puede reanudar una OT bloqueada'; end if; perform set_config('app.work_order_rpc','on',true); update public.ordenes_trabajo set estado='EN_CURSO',updated_at=now() where id=row_ot.id returning * into row_ot; perform public.log_audit(row_ot.tenant_id,'resume_work_order','ordenes_trabajo',row_ot.id,jsonb_build_object('estado_nuevo','EN_CURSO')); return row_ot; end; $$;

create or replace function public.finalize_active_work_order_visit(work_order_uuid uuid, payload_json jsonb default '{}'::jsonb) returns public.ot_visitas language plpgsql security definer set search_path = public as $$ declare row_ot public.ordenes_trabajo; visit_row public.ot_visitas; begin row_ot:=public.require_work_order_actor(work_order_uuid,false); if not public.can_execute_work_order(row_ot.tenant_id,row_ot.id) or row_ot.estado <> 'EN_CURSO' then raise exception 'Solo el técnico asignado puede finalizar una OT en curso'; end if; if coalesce((row_ot.configuracion->>'requiere_checklist')::boolean,false) and (not exists(select 1 from public.ot_checklist_respuestas where ot_id=row_ot.id) or exists(select 1 from public.ot_checklist_respuestas where ot_id=row_ot.id and obligatorio and nullif(trim(coalesce(resultado,'')),'') is null)) then raise exception 'No se puede finalizar: checklist incompleto'; end if; if coalesce((row_ot.configuracion->>'requiere_firma_tecnico')::boolean,false) and not exists(select 1 from public.ot_firmas where ot_id=row_ot.id and tipo='tecnico') then raise exception 'No se puede finalizar: falta la firma del técnico'; end if; select * into visit_row from public.ot_visitas where ot_id=row_ot.id and estado='EN_CURSO' order by fecha_inicio desc limit 1 for update; if visit_row.id is null then raise exception 'No existe una visita en curso'; end if; update public.ot_visitas set estado='FINALIZADA',fecha_fin=now(),trabajo_realizado=nullif(trim(payload_json->>'trabajo_realizado'),''),diagnostico=nullif(trim(payload_json->>'diagnostico'),''),pruebas_realizadas=nullif(trim(payload_json->>'pruebas_realizadas'),''),recomendaciones=nullif(trim(payload_json->>'recomendaciones'),''),trabajo_pendiente=nullif(trim(payload_json->>'trabajo_pendiente'),''),updated_at=now() where id=visit_row.id returning * into visit_row; perform set_config('app.work_order_rpc','on',true); update public.ordenes_trabajo set estado='FINALIZADA_TECNICO',fecha_fin=now(),trabajo_realizado=visit_row.trabajo_realizado,updated_at=now() where id=row_ot.id; perform public.log_audit(row_ot.tenant_id,'finalize_active_work_order_visit','ordenes_trabajo',row_ot.id,'{}'); return visit_row; end; $$;
create or replace function public.finalize_work_order_visit(visit_uuid uuid, payload_json jsonb default '{}'::jsonb) returns public.ot_visitas language plpgsql security definer set search_path = public as $$ declare visit_row public.ot_visitas; begin select * into visit_row from public.ot_visitas where id=visit_uuid; if visit_row.id is null then raise exception 'La visita no existe'; end if; return public.finalize_active_work_order_visit(visit_row.ot_id,payload_json); end; $$;
create or replace function public.review_work_order(work_order_uuid uuid, decision_text text, notes_text text) returns public.ordenes_trabajo language plpgsql security definer set search_path = public as $$ declare row_ot public.ordenes_trabajo; declare next_state text; begin row_ot:=public.require_work_order_actor(work_order_uuid,true); if row_ot.estado <> 'FINALIZADA_TECNICO' or nullif(trim(notes_text),'') is null or decision_text not in ('validada','correccion_solicitada') then raise exception 'La revisión no es válida'; end if; next_state:=case when decision_text='validada' then 'VALIDADA' else 'EN_CURSO' end; perform set_config('app.work_order_rpc','on',true); update public.ordenes_trabajo set estado=next_state,revision_admin_estado=decision_text,updated_at=now() where id=row_ot.id returning * into row_ot; insert into public.ot_revisiones_admin(tenant_id,ot_id,reviewer_id,decision,notas,estado_anterior,estado_nuevo) values(row_ot.tenant_id,row_ot.id,auth.uid(),decision_text,trim(notes_text),'FINALIZADA_TECNICO',next_state); perform public.log_audit(row_ot.tenant_id,case when decision_text='validada' then 'validate_work_order' else 'request_work_order_correction' end,'ordenes_trabajo',row_ot.id,jsonb_build_object('notes',trim(notes_text))); return row_ot; end; $$;
create or replace function public.soft_delete_work_order(work_order_uuid uuid, reason_text text) returns public.ordenes_trabajo language plpgsql security definer set search_path = public as $$ declare row_ot public.ordenes_trabajo; begin row_ot:=public.require_work_order_actor(work_order_uuid,true); if nullif(trim(reason_text),'') is null then raise exception 'Indica un motivo de anulación'; end if; perform set_config('app.work_order_rpc','on',true); update public.ordenes_trabajo set estado='CANCELADA',deleted_at=now(),updated_at=now(),reassignment_reason=trim(reason_text) where id=row_ot.id returning * into row_ot; perform public.log_audit(row_ot.tenant_id,'soft_delete_work_order','ordenes_trabajo',row_ot.id,jsonb_build_object('reason',trim(reason_text))); return row_ot; end; $$;

create or replace function public.register_work_order_report(work_order_uuid uuid, filename_text text default null) returns public.ot_informes language plpgsql security definer set search_path = public as $$ declare row_ot public.ordenes_trabajo; report_row public.ot_informes; next_version integer; begin row_ot:=public.require_work_order_actor(work_order_uuid,false); if row_ot.estado <> 'FINALIZADA_TECNICO' then raise exception 'El informe solo puede registrarse tras finalizar la intervención'; end if; select coalesce(max(version),0)+1 into next_version from public.ot_informes where ot_id=row_ot.id for update; insert into public.ot_informes(tenant_id,ot_id,version,filename,bucket,path,created_by) values(row_ot.tenant_id,row_ot.id,next_version,coalesce(nullif(trim(filename_text),''),row_ot.codigo_ot || '-informe-v' || next_version || '.pdf'),'ot-reports',null,auth.uid()) returning * into report_row; perform public.log_audit(row_ot.tenant_id,'register_work_order_report','ordenes_trabajo',row_ot.id,jsonb_build_object('report_id',report_row.id,'version',next_version)); return report_row; end; $$;

create or replace function public.audit_work_order_evidence_insert() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.audit_logs(tenant_id,user_id,action,entity_type,entity_id,metadata) values(new.tenant_id,auth.uid(),'add_' || TG_TABLE_NAME,TG_TABLE_NAME,new.id,jsonb_build_object('work_order_id',new.ot_id)); return new; end; $$;
drop trigger if exists audit_ot_fotos_insert on public.ot_fotos;
drop trigger if exists audit_ot_visita_materiales_insert on public.ot_visita_materiales;
drop trigger if exists audit_ot_firmas_insert on public.ot_firmas;
create trigger audit_ot_fotos_insert after insert on public.ot_fotos for each row execute function public.audit_work_order_evidence_insert();
create trigger audit_ot_visita_materiales_insert after insert on public.ot_visita_materiales for each row execute function public.audit_work_order_evidence_insert();
create trigger audit_ot_firmas_insert after insert on public.ot_firmas for each row execute function public.audit_work_order_evidence_insert();

revoke all on function public.require_work_order_actor(uuid,boolean) from public;
revoke all on function public.audit_work_order_evidence_insert() from public;
revoke all on function public.accept_work_order(uuid) from public, anon;
revoke all on function public.start_work_order_visit(uuid) from public, anon;
revoke all on function public.block_work_order(uuid,text,text) from public, anon;
revoke all on function public.resume_work_order(uuid) from public, anon;
revoke all on function public.finalize_active_work_order_visit(uuid,jsonb) from public, anon;
revoke all on function public.finalize_work_order_visit(uuid,jsonb) from public, anon;
revoke all on function public.review_work_order(uuid,text,text) from public, anon;
revoke all on function public.soft_delete_work_order(uuid,text) from public, anon;
revoke all on function public.register_work_order_report(uuid,text) from public, anon;
revoke all on function public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamptz,timestamptz,integer,text,text,text,jsonb) from public, anon;
revoke all on function public.assign_work_order(uuid,uuid,timestamptz,text) from public, anon;
grant execute on function public.accept_work_order(uuid), public.start_work_order_visit(uuid), public.block_work_order(uuid,text,text), public.resume_work_order(uuid), public.finalize_active_work_order_visit(uuid,jsonb), public.finalize_work_order_visit(uuid,jsonb), public.review_work_order(uuid,text,text), public.soft_delete_work_order(uuid,text), public.register_work_order_report(uuid,text), public.create_work_order(uuid,uuid,text,text,text,text,uuid,uuid,uuid,timestamptz,timestamptz,integer,text,text,text,jsonb), public.assign_work_order(uuid,uuid,timestamptz,text) to authenticated;
