-- Persistencia estrecha del checklist técnico.
-- El cliente conserva SELECT, pero las respuestas se escriben únicamente por esta RPC.

create or replace function public.save_work_order_checklist_response(
  checklist_response_uuid uuid,
  result_text text,
  observations_text text default null
)
returns public.ot_checklist_respuestas
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  response_row public.ot_checklist_respuestas;
  work_order_row public.ordenes_trabajo;
  normalized_result text;
  normalized_observations text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select response.*
    into response_row
  from public.ot_checklist_respuestas response
  where response.id = checklist_response_uuid
  for update;

  if response_row.id is null then
    raise exception 'El punto de checklist no está disponible';
  end if;

  select work_order.*
    into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = response_row.ot_id
    and work_order.tenant_id = response_row.tenant_id
    and work_order.deleted_at is null
  for update;

  if work_order_row.id is null
    or work_order_row.estado <> 'EN_CURSO'
    or work_order_row.assigned_to is distinct from auth.uid()
    or not public.can_execute_work_order(work_order_row.tenant_id, work_order_row.id)
    or not public.is_work_order_mutable(work_order_row.id)
  then
    raise exception 'Solo el técnico asignado puede completar el checklist de una OT en curso';
  end if;

  normalized_result := nullif(btrim(result_text), '');
  normalized_observations := nullif(btrim(observations_text), '');

  if normalized_result is not null then
    if response_row.tipo_respuesta = 'ok_ko_na' then
      normalized_result := lower(normalized_result);
      if normalized_result not in ('ok', 'ko', 'na') then
        raise exception 'La respuesta admitida es OK, KO o No aplica';
      end if;
    elsif response_row.tipo_respuesta in ('texto', 'medicion') then
      -- El texto se conserva, salvo espacios exteriores.
      null;
    else
      raise exception 'El tipo de respuesta del checklist no está soportado';
    end if;
  end if;

  update public.ot_checklist_respuestas
  set
    resultado = normalized_result,
    observaciones = normalized_observations,
    completed_by = case when normalized_result is null then null else auth.uid() end,
    completed_at = case when normalized_result is null then null else now() end,
    updated_at = now()
  where id = response_row.id
  returning * into response_row;

  insert into public.audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    response_row.tenant_id,
    auth.uid(),
    'save_work_order_checklist_response',
    'ordenes_trabajo',
    response_row.ot_id,
    jsonb_build_object(
      'checklist_response_id', response_row.id,
      'plantilla_item_id', response_row.plantilla_item_id,
      'completed', response_row.resultado is not null
    )
  );

  return response_row;
end;
$function$;

revoke insert, update, delete on public.ot_checklist_respuestas from authenticated;

revoke execute on function public.save_work_order_checklist_response(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.save_work_order_checklist_response(uuid, text, text)
  to authenticated;
