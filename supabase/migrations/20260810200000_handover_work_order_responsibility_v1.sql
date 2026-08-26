-- OT-06E: relevo explícito y auditable del responsable de una OT.

create or replace function public.handover_work_order_responsibility(
  work_order_uuid uuid,
  next_technician_uuid uuid,
  note_text text,
  keep_previous_as_collaborator boolean default false
)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  updated_row public.ordenes_trabajo;
  previous_technician uuid;
  normalized_note text := nullif(btrim(note_text), '');
  next_technician_name text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select work_order.*
  into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = work_order_uuid
    and work_order.deleted_at is null
  for update;

  if work_order_row.id is null
    or not public.can_manage_work_orders(work_order_row.tenant_id)
  then
    raise exception 'No tienes permiso para realizar el relevo de esta OT';
  end if;

  if work_order_row.estado not in ('ASIGNADA', 'ACEPTADA', 'EN_CURSO', 'BLOQUEADA') then
    raise exception 'No se puede realizar un relevo en el estado actual de la OT';
  end if;

  if work_order_row.assigned_to is null then
    raise exception 'La OT no tiene un responsable actual; utiliza la asignación normal';
  end if;

  if next_technician_uuid is null then
    raise exception 'Debes indicar el técnico entrante';
  end if;

  if work_order_row.assigned_to is not distinct from next_technician_uuid then
    raise exception 'El técnico entrante ya es el responsable de la OT';
  end if;

  if normalized_note is null or char_length(normalized_note) < 5 then
    raise exception 'Indica una nota de relevo de al menos 5 caracteres';
  end if;

  select nullif(btrim(profile.nombre), '')
  into next_technician_name
  from public.tenant_members member
  join public.profiles profile
    on profile.id = member.user_id
  where member.tenant_id = work_order_row.tenant_id
    and member.user_id = next_technician_uuid
    and member.estado = 'activo'
    and member.role in ('tecnico', 'tecnico_externo');

  if not found then
    raise exception 'El técnico entrante no está activo en este tenant';
  end if;

  previous_technician := work_order_row.assigned_to;

  if exists (
    select 1
    from public.ot_visitas visit
    where visit.tenant_id = work_order_row.tenant_id
      and visit.ot_id = work_order_row.id
      and visit.tecnico_id = previous_technician
      and visit.estado = 'EN_CURSO'
  ) then
    raise exception 'El responsable saliente debe cerrar su visita antes del relevo';
  end if;

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set
    assigned_to = next_technician_uuid,
    assigned_by = auth.uid(),
    assigned_at = clock_timestamp(),
    reassignment_reason = normalized_note,
    updated_at = clock_timestamp()
  where id = work_order_row.id
  returning * into updated_row;

  if keep_previous_as_collaborator then
    perform public.set_work_order_collaborator(
      updated_row.id,
      previous_technician,
      true,
      'Relevo: ' || normalized_note
    );
  end if;

  perform public.log_audit(
    updated_row.tenant_id,
    'handover_work_order_responsibility',
    'ordenes_trabajo',
    updated_row.id,
    jsonb_build_object(
      'previous_responsible_id', previous_technician,
      'next_responsible_id', next_technician_uuid,
      'next_responsible_name', coalesce(next_technician_name, 'Técnico sin nombre'),
      'keep_previous_as_collaborator', keep_previous_as_collaborator,
      'note', normalized_note,
      'estado', updated_row.estado,
      'handover_by', auth.uid(),
      'handover_at', updated_row.assigned_at
    )
  );

  return updated_row;
end;
$function$;

alter function public.handover_work_order_responsibility(uuid, uuid, text, boolean)
  owner to postgres;

revoke execute on function public.handover_work_order_responsibility(uuid, uuid, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.handover_work_order_responsibility(uuid, uuid, text, boolean)
  to authenticated;
