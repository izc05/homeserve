-- Corrige la serialización de versiones de informes y valida el estado de bloqueo.

do $constraint$
declare
  ot_id_attnum smallint;
  version_attnum smallint;
begin
  select attnum into ot_id_attnum
  from pg_attribute
  where attrelid = 'public.ot_informes'::regclass
    and attname = 'ot_id'
    and not attisdropped;

  select attnum into version_attnum
  from pg_attribute
  where attrelid = 'public.ot_informes'::regclass
    and attname = 'version'
    and not attisdropped;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ot_informes'::regclass
      and contype = 'u'
      and conkey = array[ot_id_attnum, version_attnum]::smallint[]
  ) then
    alter table public.ot_informes
      add constraint ot_informes_ot_id_version_key unique (ot_id, version);
  end if;
end;
$constraint$;

create or replace function public.register_work_order_report(
  work_order_uuid uuid,
  filename_text text default null
)
returns public.ot_informes
language plpgsql
security definer
set search_path = public
as $function$
declare
  row_ot public.ordenes_trabajo;
  report_row public.ot_informes;
  next_version integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  -- Lock the work order before deriving the next report version for it.
  select * into row_ot
  from public.ordenes_trabajo
  where id = work_order_uuid
    and deleted_at is null
  for update;

  if row_ot.id is null then
    raise exception 'La OT no existe';
  end if;

  if not (
    public.can_manage_work_orders(row_ot.tenant_id)
    or public.can_execute_work_order(row_ot.tenant_id, row_ot.id)
  ) then
    raise exception 'No tienes permiso sobre esta OT';
  end if;

  if row_ot.estado in ('VALIDADA', 'CANCELADA') then
    raise exception 'La OT validada o cancelada es inmutable';
  end if;

  if row_ot.estado <> 'FINALIZADA_TECNICO' then
    raise exception 'El informe solo puede registrarse tras finalizar la intervención';
  end if;

  select coalesce(max(version), 0) + 1
  into next_version
  from public.ot_informes
  where ot_id = row_ot.id;

  insert into public.ot_informes (
    tenant_id,
    ot_id,
    version,
    filename,
    bucket,
    path,
    created_by
  )
  values (
    row_ot.tenant_id,
    row_ot.id,
    next_version,
    coalesce(
      nullif(trim(filename_text), ''),
      row_ot.codigo_ot || '-informe-v' || next_version || '.pdf'
    ),
    'ot-reports',
    null,
    auth.uid()
  )
  returning * into report_row;

  perform public.log_audit(
    row_ot.tenant_id,
    'register_work_order_report',
    'ordenes_trabajo',
    row_ot.id,
    jsonb_build_object('report_id', report_row.id, 'version', next_version)
  );

  return report_row;
end;
$function$;

create or replace function public.block_work_order(
  work_order_uuid uuid,
  block_status text,
  reason_text text
)
returns public.ordenes_trabajo
language plpgsql
security definer
set search_path = public
as $function$
declare
  row_ot public.ordenes_trabajo;
  normalized_block_status text;
begin
  row_ot := public.require_work_order_actor(work_order_uuid, false);

  if not public.can_execute_work_order(row_ot.tenant_id, row_ot.id)
    or row_ot.estado <> 'EN_CURSO'
    or nullif(trim(reason_text), '') is null then
    raise exception 'Solo el técnico asignado puede bloquear una OT en curso indicando un motivo';
  end if;

  normalized_block_status := upper(
    coalesce(nullif(trim(block_status), ''), 'BLOQUEADA')
  );

  if normalized_block_status <> 'BLOQUEADA' then
    raise exception 'Estado de bloqueo no válido';
  end if;

  perform set_config('app.work_order_rpc', 'on', true);

  update public.ordenes_trabajo
  set estado = normalized_block_status,
      updated_at = now(),
      reassignment_reason = trim(reason_text)
  where id = row_ot.id
  returning * into row_ot;

  perform public.log_audit(
    row_ot.tenant_id,
    'block_work_order',
    'ordenes_trabajo',
    row_ot.id,
    jsonb_build_object(
      'motivo', trim(reason_text),
      'estado_nuevo', normalized_block_status
    )
  );

  return row_ot;
end;
$function$;

revoke all on function public.register_work_order_report(uuid, text) from public, anon, service_role;
revoke all on function public.block_work_order(uuid, text, text) from public, anon, service_role;
grant execute on function public.register_work_order_report(uuid, text) to authenticated;
grant execute on function public.block_work_order(uuid, text, text) to authenticated;
