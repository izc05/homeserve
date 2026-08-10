-- OT-06B: gestión segura de colaboradores.
-- No amplía todavía can_execute_work_order ni modifica las RPC de visitas.

create or replace function public.set_work_order_collaborator(
  work_order_uuid uuid,
  technician_uuid uuid,
  enabled boolean,
  reason_text text default null
)
returns public.ot_participantes
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  participant_row public.ot_participantes;
  normalized_reason text := nullif(btrim(reason_text), '');
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
    raise exception 'No tienes permiso para gestionar participantes de esta OT';
  end if;

  if work_order_row.estado not in (
    'BORRADOR', 'ASIGNADA', 'ACEPTADA', 'EN_CURSO', 'BLOQUEADA'
  ) then
    raise exception 'No se pueden cambiar colaboradores en el estado actual de la OT';
  end if;

  if technician_uuid is null then
    raise exception 'Debes indicar un técnico';
  end if;

  if work_order_row.assigned_to is not distinct from technician_uuid then
    raise exception 'El técnico responsable no se gestiona como colaborador';
  end if;

  if enabled then
    if not exists (
      select 1
      from public.tenant_members member
      where member.tenant_id = work_order_row.tenant_id
        and member.user_id = technician_uuid
        and member.estado = 'activo'
        and member.role in ('tecnico', 'tecnico_externo')
    ) then
      raise exception 'El colaborador debe ser un técnico activo del tenant';
    end if;

    select participant.*
    into participant_row
    from public.ot_participantes participant
    where participant.tenant_id = work_order_row.tenant_id
      and participant.ot_id = work_order_row.id
      and participant.tecnico_id = technician_uuid
      and participant.estado = 'activo'
    for update;

    if participant_row.id is not null then
      if participant_row.rol <> 'colaborador' then
        raise exception 'El participante activo no es un colaborador';
      end if;
      return participant_row;
    end if;

    insert into public.ot_participantes (
      tenant_id,
      ot_id,
      tecnico_id,
      rol,
      estado,
      added_by,
      added_at,
      motivo
    ) values (
      work_order_row.tenant_id,
      work_order_row.id,
      technician_uuid,
      'colaborador',
      'activo',
      auth.uid(),
      clock_timestamp(),
      normalized_reason
    )
    returning * into participant_row;

    perform public.log_audit(
      work_order_row.tenant_id,
      'add_work_order_collaborator',
      'ordenes_trabajo',
      work_order_row.id,
      jsonb_build_object(
        'participant_id', participant_row.id,
        'technician_id', technician_uuid,
        'role', participant_row.rol,
        'reason', normalized_reason
      )
    );

    return participant_row;
  end if;

  if normalized_reason is null or char_length(normalized_reason) < 3 then
    raise exception 'Indica el motivo de retirada del colaborador';
  end if;

  select participant.*
  into participant_row
  from public.ot_participantes participant
  where participant.tenant_id = work_order_row.tenant_id
    and participant.ot_id = work_order_row.id
    and participant.tecnico_id = technician_uuid
    and participant.rol = 'colaborador'
    and participant.estado = 'activo'
  for update;

  if participant_row.id is null then
    raise exception 'El técnico no es colaborador activo de esta OT';
  end if;

  update public.ot_participantes
  set
    estado = 'retirado',
    removed_by = auth.uid(),
    removed_at = clock_timestamp(),
    motivo = normalized_reason,
    updated_at = clock_timestamp()
  where id = participant_row.id
  returning * into participant_row;

  perform public.log_audit(
    work_order_row.tenant_id,
    'remove_work_order_collaborator',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'participant_id', participant_row.id,
      'technician_id', technician_uuid,
      'role', participant_row.rol,
      'reason', normalized_reason
    )
  );

  return participant_row;
end;
$function$;

alter function public.set_work_order_collaborator(uuid, uuid, boolean, text)
  owner to postgres;

revoke execute on function public.set_work_order_collaborator(uuid, uuid, boolean, text)
  from public, anon, authenticated, service_role;
grant execute on function public.set_work_order_collaborator(uuid, uuid, boolean, text)
  to authenticated;
