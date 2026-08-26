-- OT-06C: ejecución por participante activo y múltiples visitas por OT.
-- Mantiene el control global de la OT en el responsable (assigned_to).
-- El cierre individual se introducirá en OT-06D; mientras tanto la ruta legacy
-- finalize_work_order_visit queda sin EXECUTE para authenticated.

create unique index if not exists ot_visitas_tecnico_activa_uq
  on public.ot_visitas(tenant_id, ot_id, tecnico_id)
  where estado = 'EN_CURSO';

create or replace function public.can_execute_work_order(
  tenant_uuid uuid,
  work_order_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.ordenes_trabajo work_order
    join public.tenant_members member
      on member.tenant_id = work_order.tenant_id
     and member.user_id = auth.uid()
     and member.estado = 'activo'
     and member.role in ('tecnico', 'tecnico_externo')
    where work_order.id = work_order_uuid
      and work_order.tenant_id = tenant_uuid
      and work_order.deleted_at is null
      and private.is_active_work_order_participant(
        work_order.tenant_id,
        work_order.id,
        auth.uid()
      )
  );
$function$;

create or replace function public.can_access_work_order(
  work_order_uuid uuid,
  operation text default 'select'
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.ordenes_trabajo work_order
    left join public.tenant_members member
      on member.tenant_id = work_order.tenant_id
     and member.user_id = auth.uid()
     and member.estado = 'activo'
    where work_order.id = work_order_uuid
      and work_order.deleted_at is null
      and (
        public.can_manage_work_orders(work_order.tenant_id)
        or (
          member.role in ('tecnico', 'tecnico_externo')
          and private.is_active_work_order_participant(
            work_order.tenant_id,
            work_order.id,
            auth.uid()
          )
        )
        or (
          member.role = 'cliente_lectura'
          and member.cliente_id = work_order.cliente_id
        )
      )
  );
$function$;

-- Aceptar sigue siendo una acción exclusiva del responsable principal.
create or replace function public.accept_work_order(work_order_uuid uuid)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);

  if work_order_row.assigned_to is distinct from auth.uid()
    or not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or work_order_row.estado <> 'ASIGNADA'
  then
    raise exception 'Solo el técnico asignado puede aceptar una OT asignada';
  end if;

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set estado = 'ACEPTADA', updated_at = clock_timestamp()
  where id = work_order_row.id
  returning * into work_order_row;

  perform public.log_audit(
    work_order_row.tenant_id,
    'accept_work_order',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'estado_anterior', 'ASIGNADA',
      'estado_nuevo', 'ACEPTADA',
      'responsible_id', auth.uid()
    )
  );

  return work_order_row;
end;
$function$;

-- Cualquier participante activo puede abrir SU visita después de que el
-- responsable haya aceptado la OT. Si la OT ya está EN_CURSO no se altera su
-- estado global; distintos técnicos pueden trabajar simultáneamente.
create or replace function public.start_work_order_visit(work_order_uuid uuid)
returns public.ot_visitas
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  visit_row public.ot_visitas;
  previous_state text;
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);

  if not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id) then
    raise exception 'Solo un técnico participante activo puede iniciar una visita';
  end if;

  if work_order_row.estado not in ('ACEPTADA', 'EN_CURSO') then
    raise exception 'La OT debe estar aceptada o en curso para iniciar una visita';
  end if;

  if exists (
    select 1
    from public.ot_visitas visit
    where visit.tenant_id = work_order_row.tenant_id
      and visit.ot_id = work_order_row.id
      and visit.tecnico_id = auth.uid()
      and visit.estado = 'EN_CURSO'
  ) then
    raise exception 'Ya tienes una visita en curso para esta OT';
  end if;

  previous_state := work_order_row.estado;

  insert into public.ot_visitas (
    tenant_id,
    ot_id,
    tecnico_id,
    estado,
    fecha_inicio,
    created_by
  ) values (
    work_order_row.tenant_id,
    work_order_row.id,
    auth.uid(),
    'EN_CURSO',
    clock_timestamp(),
    auth.uid()
  )
  returning * into visit_row;

  if previous_state = 'ACEPTADA' then
    perform set_config('app.work_order_rpc', 'on', true);
    update public.ordenes_trabajo
    set
      estado = 'EN_CURSO',
      fecha_inicio = coalesce(fecha_inicio, clock_timestamp()),
      updated_at = clock_timestamp()
    where id = work_order_row.id;
  end if;

  perform public.log_audit(
    work_order_row.tenant_id,
    'start_work_order_visit',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'visit_id', visit_row.id,
      'technician_id', auth.uid(),
      'estado_anterior', previous_state,
      'estado_nuevo', case when previous_state = 'ACEPTADA' then 'EN_CURSO' else previous_state end
    )
  );

  return visit_row;
end;
$function$;

-- El bloqueo y la reanudación afectan a TODA la OT y continúan siendo
-- responsabilidad exclusiva de assigned_to.
create or replace function public.block_work_order(
  work_order_uuid uuid,
  block_status text,
  reason_text text
)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  normalized_reason text := nullif(btrim(reason_text), '');
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);

  if work_order_row.assigned_to is distinct from auth.uid()
    or not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or work_order_row.estado <> 'EN_CURSO'
    or normalized_reason is null
  then
    raise exception 'Solo el técnico asignado puede bloquear una OT en curso indicando un motivo';
  end if;

  if upper(coalesce(block_status, '')) <> 'BLOQUEADA' then
    raise exception 'Estado de bloqueo no válido';
  end if;

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set
    estado = 'BLOQUEADA',
    updated_at = clock_timestamp(),
    reassignment_reason = normalized_reason
  where id = work_order_row.id
  returning * into work_order_row;

  perform public.log_audit(
    work_order_row.tenant_id,
    'block_work_order',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'motivo', normalized_reason,
      'estado_nuevo', 'BLOQUEADA',
      'responsible_id', auth.uid()
    )
  );

  return work_order_row;
end;
$function$;

create or replace function public.resume_work_order(work_order_uuid uuid)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);

  if work_order_row.assigned_to is distinct from auth.uid()
    or not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or work_order_row.estado <> 'BLOQUEADA'
  then
    raise exception 'Solo el técnico asignado puede reanudar una OT bloqueada';
  end if;

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set estado = 'EN_CURSO', updated_at = clock_timestamp()
  where id = work_order_row.id
  returning * into work_order_row;

  perform public.log_audit(
    work_order_row.tenant_id,
    'resume_work_order',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'estado_nuevo', 'EN_CURSO',
      'responsible_id', auth.uid()
    )
  );

  return work_order_row;
end;
$function$;

-- Nadie modifica visitas directamente desde PostgREST. Las visitas se crean y
-- cierran mediante RPC para poder imponer actor, estado y auditoría.
revoke insert, update, delete on table public.ot_visitas from authenticated;
grant select on table public.ot_visitas to authenticated;

-- La RPC legacy por visit_id queda temporalmente fuera de la superficie
-- autenticada. OT-06D la sustituirá por close_my_work_order_visit.
revoke execute on function public.finalize_work_order_visit(uuid, jsonb)
  from public, anon, authenticated, service_role;

-- Guardia transversal: una función técnica no puede cerrar/modificar la visita
-- activa de otro técnico aunque exista una ruta legacy o future bug.
create or replace function private.guard_work_order_visit_actor()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if old.tenant_id is distinct from new.tenant_id
    or old.ot_id is distinct from new.ot_id
    or old.tecnico_id is distinct from new.tecnico_id
    or old.id is distinct from new.id
  then
    raise exception 'No se puede cambiar la identidad de una visita';
  end if;

  if auth.uid() is not null and old.tecnico_id is distinct from auth.uid() then
    raise exception 'Solo el técnico de la visita puede modificarla';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_work_order_visit_actor()
  from public, anon, authenticated, service_role;

drop trigger if exists guard_work_order_visit_actor on public.ot_visitas;
create trigger guard_work_order_visit_actor
before update on public.ot_visitas
for each row
execute function private.guard_work_order_visit_actor();

-- Guardia independiente del bypass app.work_order_rpc: una OT no puede pasar a
-- FINALIZADA_TECNICO mientras exista cualquier visita activa.
create or replace function private.guard_work_order_finalization_active_visits()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if new.estado = 'FINALIZADA_TECNICO'
    and old.estado is distinct from new.estado
    and exists (
      select 1
      from public.ot_visitas visit
      where visit.tenant_id = new.tenant_id
        and visit.ot_id = new.id
        and visit.estado = 'EN_CURSO'
    )
  then
    raise exception 'No se puede finalizar la OT mientras existan visitas en curso';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_work_order_finalization_active_visits()
  from public, anon, authenticated, service_role;

drop trigger if exists guard_work_order_finalization_active_visits
  on public.ordenes_trabajo;
create trigger guard_work_order_finalization_active_visits
before update of estado on public.ordenes_trabajo
for each row
execute function private.guard_work_order_finalization_active_visits();

-- Las firmas públicas existentes conservan su ACL prevista salvo la RPC legacy
-- finalize_work_order_visit revocada explícitamente arriba.
revoke execute on function public.can_execute_work_order(uuid, uuid)
  from public, anon, service_role;
revoke execute on function public.can_access_work_order(uuid, text)
  from public, anon, service_role;
revoke execute on function public.accept_work_order(uuid)
  from public, anon, service_role;
revoke execute on function public.start_work_order_visit(uuid)
  from public, anon, service_role;
revoke execute on function public.block_work_order(uuid, text, text)
  from public, anon, service_role;
revoke execute on function public.resume_work_order(uuid)
  from public, anon, service_role;

grant execute on function public.can_execute_work_order(uuid, uuid) to authenticated;
grant execute on function public.can_access_work_order(uuid, text) to authenticated;
grant execute on function public.accept_work_order(uuid) to authenticated;
grant execute on function public.start_work_order_visit(uuid) to authenticated;
grant execute on function public.block_work_order(uuid, text, text) to authenticated;
grant execute on function public.resume_work_order(uuid) to authenticated;
