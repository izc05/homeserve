-- Ejecución avanzada, compatible con los puntos legacy existentes.

alter table public.ot_checklist_respuestas
  add column seccion_id text,
  add column seccion_titulo text,
  add column seccion_orden integer not null default 0,
  add column instrucciones text,
  add column observacion_negativa_obligatoria boolean not null default false,
  add column punto_critico boolean not null default false,
  add column unidad text,
  add column opciones jsonb not null default '[]'::jsonb,
  add column valor_numero numeric;

alter table public.ot_checklist_respuestas
  add constraint ot_checklist_respuestas_opciones_array
  check (jsonb_typeof(opciones) = 'array');

alter table public.ot_fotos
  add column categoria text,
  add column comentario text;

create index ot_checklist_respuestas_section_idx
  on public.ot_checklist_respuestas(tenant_id, ot_id, seccion_orden, orden);
create index ot_fotos_checklist_response_idx
  on public.ot_fotos(tenant_id, ot_id, checklist_respuesta_id)
  where checklist_respuesta_id is not null;

create or replace function private.prepare_work_order_checklist_internal(
  work_order_uuid uuid,
  template_uuid uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  template_row public.checklist_plantillas;
  snapshot_json jsonb;
  created_count integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select work_order.* into work_order_row
  from public.ordenes_trabajo work_order
  where work_order.id = work_order_uuid
    and work_order.deleted_at is null
  for update;

  if work_order_row.id is null
    or not public.can_manage_work_orders(work_order_row.tenant_id)
  then
    raise exception 'La OT no está disponible para preparar su checklist';
  end if;

  if work_order_row.estado not in ('BORRADOR', 'ASIGNADA', 'ACEPTADA') then
    raise exception 'El checklist debe prepararse antes de iniciar la intervención';
  end if;

  if exists (
    select 1 from public.ot_checklist_respuestas response
    where response.ot_id = work_order_row.id
  ) then
    raise exception 'La OT ya tiene un checklist preparado';
  end if;

  select template.* into template_row
  from public.checklist_plantillas template
  where template.id = template_uuid
    and template.tenant_id = work_order_row.tenant_id
    and template.estado = 'activo'
  for share;

  if template_row.id is null then
    raise exception 'La plantilla activa no está disponible en esta organización';
  end if;

  select jsonb_build_object(
    'templateId', template_row.id,
    'name', template_row.nombre,
    'description', template_row.descripcion,
    'specialty', template_row.especialidad,
    'version', template_row.version,
    'capturedAt', now(),
    'sections', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', section.id,
          'title', section.titulo,
          'description', section.descripcion,
          'order', section.orden,
          'points', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', point.id,
                'title', point.titulo,
                'instructions', point.instrucciones,
                'responseType', point.tipo_respuesta,
                'unit', point.unidad,
                'options', point.opciones,
                'required', point.obligatorio,
                'negativeObservationRequired', point.observacion_negativa_obligatoria,
                'photoRequired', point.requiere_foto,
                'critical', point.punto_critico,
                'order', point.orden
              ) order by point.orden
            )
            from public.checklist_plantilla_puntos point
            where point.seccion_id = section.id
          ), '[]'::jsonb)
        ) order by section.orden
      )
      from public.checklist_plantilla_secciones section
      where section.plantilla_id = template_row.id
    ), '[]'::jsonb)
  ) into snapshot_json;

  update public.ordenes_trabajo
  set
    checklist_template_id = template_row.id,
    checklist_template_version = template_row.version,
    checklist_snapshot = snapshot_json,
    checklist_snapshot_version = template_row.version,
    configuracion = jsonb_set(coalesce(configuracion, '{}'::jsonb), '{requiere_checklist}', 'true'::jsonb, true),
    updated_at = now()
  where id = work_order_row.id;

  insert into public.ot_checklist_respuestas (
    tenant_id, ot_id, plantilla_item_id, orden, punto, titulo,
    descripcion, obligatorio, requiere_foto, tipo_respuesta, created_by,
    seccion_id, seccion_titulo, seccion_orden, instrucciones,
    observacion_negativa_obligatoria, punto_critico, unidad, opciones
  )
  select
    work_order_row.tenant_id,
    work_order_row.id,
    point.id::text,
    point.orden,
    point.titulo,
    point.titulo,
    point.instrucciones,
    point.obligatorio,
    point.requiere_foto,
    point.tipo_respuesta,
    auth.uid(),
    section.id::text,
    section.titulo,
    section.orden,
    point.instrucciones,
    point.observacion_negativa_obligatoria,
    point.punto_critico,
    point.unidad,
    point.opciones
  from public.checklist_plantilla_secciones section
  join public.checklist_plantilla_puntos point
    on point.seccion_id = section.id
   and point.tenant_id = section.tenant_id
  where section.plantilla_id = template_row.id
  order by section.orden, point.orden;

  get diagnostics created_count = row_count;

  perform public.log_audit(
    work_order_row.tenant_id,
    'prepare_work_order_checklist',
    'ordenes_trabajo',
    work_order_row.id,
    jsonb_build_object(
      'template_id', template_row.id,
      'template_version', template_row.version,
      'created_items', created_count
    )
  );

  return jsonb_build_object(
    'work_order_id', work_order_row.id,
    'template_id', template_row.id,
    'template_version', template_row.version,
    'created_items', created_count
  );
end;
$function$;

create or replace function public.prepare_work_order_checklist(
  work_order_uuid uuid,
  template_uuid uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.prepare_work_order_checklist_internal(work_order_uuid, template_uuid);
$function$;

create or replace function private.ensure_work_order_default_checklist_internal(
  work_order_uuid uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  work_order_row public.ordenes_trabajo;
  created_count integer := 0;
  total_count integer := 0;
  done_count integer := 0;
  config_json jsonb;
begin
  work_order_row := public.require_work_order_actor(work_order_uuid, false);
  config_json := coalesce(work_order_row.configuracion, '{}'::jsonb);

  if not public.is_work_order_mutable(work_order_uuid) then
    raise exception 'La OT finalizada o cerrada es de solo lectura';
  end if;

  if not exists (
    select 1 from public.ot_checklist_respuestas existing
    where existing.ot_id = work_order_row.id
  ) and jsonb_typeof(work_order_row.checklist_snapshot -> 'sections') = 'array'
    and jsonb_array_length(work_order_row.checklist_snapshot -> 'sections') > 0
  then
    insert into public.ot_checklist_respuestas (
      tenant_id, ot_id, plantilla_item_id, orden, punto, titulo,
      descripcion, obligatorio, requiere_foto, tipo_respuesta, created_by,
      seccion_id, seccion_titulo, seccion_orden, instrucciones,
      observacion_negativa_obligatoria, punto_critico, unidad, opciones
    )
    select
      work_order_row.tenant_id,
      work_order_row.id,
      point.value ->> 'id',
      coalesce((point.value ->> 'order')::integer, (point.ordinality * 10)::integer),
      point.value ->> 'title',
      point.value ->> 'title',
      nullif(btrim(point.value ->> 'instructions'), ''),
      coalesce((point.value ->> 'required')::boolean, true),
      coalesce((point.value ->> 'photoRequired')::boolean, false),
      point.value ->> 'responseType',
      auth.uid(),
      section.value ->> 'id',
      section.value ->> 'title',
      coalesce((section.value ->> 'order')::integer, (section.ordinality * 10)::integer),
      nullif(btrim(point.value ->> 'instructions'), ''),
      coalesce((point.value ->> 'negativeObservationRequired')::boolean, false),
      coalesce((point.value ->> 'critical')::boolean, false),
      nullif(btrim(point.value ->> 'unit'), ''),
      coalesce(point.value -> 'options', '[]'::jsonb)
    from jsonb_array_elements(work_order_row.checklist_snapshot -> 'sections') with ordinality section(value, ordinality)
    cross join lateral jsonb_array_elements(section.value -> 'points') with ordinality point(value, ordinality);

    get diagnostics created_count = row_count;
  elsif not exists (
    select 1 from public.ot_checklist_respuestas existing
    where existing.ot_id = work_order_row.id
  ) then
    -- Compatibilidad: las OT anteriores sin plantilla mantienen el checklist legacy.
    insert into public.ot_checklist_respuestas (
      tenant_id, ot_id, orden, punto, descripcion, resultado,
      requiere_foto, obligatorio, tipo_respuesta, plantilla_item_id,
      created_by, seccion_id, seccion_titulo, seccion_orden
    )
    select
      work_order_row.tenant_id,
      work_order_row.id,
      item.orden,
      item.punto,
      item.descripcion,
      null,
      item.requiere_foto,
      true,
      item.tipo_respuesta,
      item.plantilla_item_id,
      auth.uid(),
      'legacy',
      'Checklist de intervención',
      10
    from (
      values
        (10, 'Identificación', 'Confirmar instalación, ubicación, equipo y alcance de la OT.', false, 'ok_ko_na', 'identificacion'),
        (20, 'Seguridad', 'Revisar condiciones de seguridad antes de intervenir.', false, 'ok_ko_na', 'seguridad'),
        (30, 'Estado inicial', 'Registrar situación encontrada y anomalías visibles.', coalesce((config_json->>'requiere_fotos_iniciales')::boolean, false), 'texto', 'estado_inicial'),
        (40, 'Ejecución técnica', 'Registrar trabajo realizado y comprobaciones principales.', false, 'texto', 'ejecucion'),
        (50, 'Mediciones', 'Anotar mediciones obligatorias cuando aplique.', false, 'medicion', 'mediciones'),
        (60, 'Materiales', 'Registrar material usado o pendiente de suministro.', false, 'texto', 'materiales'),
        (70, 'Prueba funcional', 'Comprobar funcionamiento final y dejar constancia del resultado.', false, 'ok_ko_na', 'prueba_funcional'),
        (80, 'Fotos finales', 'Adjuntar evidencia fotográfica final cuando aplique.', true, 'ok_ko_na', 'fotos_finales'),
        (90, 'Firma técnico', 'Confirmar firma o responsable técnico de la intervención.', false, 'texto', 'firma_tecnico'),
        (100, 'Informe', 'Generar o revisar el informe técnico de cierre.', false, 'ok_ko_na', 'informe')
    ) as item(orden, punto, descripcion, requiere_foto, tipo_respuesta, plantilla_item_id)
    where (
      item.plantilla_item_id in ('identificacion', 'seguridad', 'estado_inicial', 'ejecucion')
      or (item.plantilla_item_id = 'mediciones' and coalesce((config_json->>'requiere_mediciones')::boolean, false))
      or (item.plantilla_item_id = 'materiales' and coalesce((config_json->>'requiere_materiales')::boolean, false))
      or (item.plantilla_item_id = 'prueba_funcional' and coalesce((config_json->>'requiere_prueba_funcional')::boolean, false))
      or (item.plantilla_item_id = 'fotos_finales' and coalesce((config_json->>'requiere_fotos_finales')::boolean, false))
      or (item.plantilla_item_id = 'firma_tecnico' and coalesce((config_json->>'requiere_firma_tecnico')::boolean, false))
      or (item.plantilla_item_id = 'informe' and coalesce((config_json->>'requiere_informe')::boolean, false))
    );

    get diagnostics created_count = row_count;
  end if;

  select count(*), count(*) filter (where nullif(btrim(coalesce(resultado, '')), '') is not null)
  into total_count, done_count
  from public.ot_checklist_respuestas
  where ot_id = work_order_row.id;

  insert into public.audit_logs (tenant_id, action, entity_type, entity_id, user_id, metadata)
  values (
    work_order_row.tenant_id,
    'ensure_work_order_default_checklist',
    'ordenes_trabajo',
    work_order_row.id,
    auth.uid(),
    jsonb_build_object('created_items', created_count, 'total_items', total_count, 'completed_items', done_count)
  );

  return jsonb_build_object(
    'work_order_id', work_order_row.id,
    'created_items', created_count,
    'total_items', total_count,
    'completed_items', done_count
  );
end;
$function$;

create or replace function public.ensure_work_order_default_checklist(
  work_order_uuid uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.ensure_work_order_default_checklist_internal(work_order_uuid);
$function$;

create or replace function private.save_work_order_checklist_response_v2_internal(
  checklist_response_uuid uuid,
  result_text text default null,
  numeric_value numeric default null,
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
  is_negative boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select response.* into response_row
  from public.ot_checklist_respuestas response
  where response.id = checklist_response_uuid
  for update;

  if response_row.id is null then
    raise exception 'El punto de checklist no está disponible';
  end if;

  select work_order.* into work_order_row
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

  if response_row.tipo_respuesta in ('ok_ko_na', 'si_no_na', 'correcto_incorrecto')
    and normalized_result is not null
  then
    normalized_result := lower(normalized_result);
    if response_row.tipo_respuesta = 'ok_ko_na' and normalized_result not in ('ok', 'ko', 'na') then
      raise exception 'La respuesta admitida es OK, KO o No aplica';
    elsif response_row.tipo_respuesta = 'si_no_na' and normalized_result not in ('si', 'no', 'na') then
      raise exception 'La respuesta admitida es Sí, No o No aplica';
    elsif response_row.tipo_respuesta = 'correcto_incorrecto' and normalized_result not in ('correcto', 'incorrecto') then
      raise exception 'La respuesta admitida es Correcto o Incorrecto';
    end if;
  elsif response_row.tipo_respuesta = 'numero' then
    if numeric_value is not null then
      normalized_result := numeric_value::text;
    elsif normalized_result is not null then
      raise exception 'Introduce una medición numérica válida';
    end if;
  elsif response_row.tipo_respuesta = 'seleccion' and normalized_result is not null then
    if not response_row.opciones ? normalized_result then
      raise exception 'La opción seleccionada no pertenece a este punto';
    end if;
  elsif response_row.tipo_respuesta not in ('texto', 'medicion')
    and normalized_result is not null
  then
    raise exception 'El tipo de respuesta del checklist no está soportado';
  end if;

  is_negative := normalized_result in ('ko', 'no', 'incorrecto');
  if is_negative
    and response_row.observacion_negativa_obligatoria
    and normalized_observations is null
  then
    raise exception 'La respuesta negativa requiere una observación';
  end if;

  update public.ot_checklist_respuestas
  set
    resultado = normalized_result,
    valor_numero = case when tipo_respuesta = 'numero' then numeric_value else null end,
    observaciones = normalized_observations,
    completed_by = case when normalized_result is null then null else auth.uid() end,
    completed_at = case when normalized_result is null then null else now() end,
    updated_at = now()
  where id = response_row.id
  returning * into response_row;

  insert into public.audit_logs (
    tenant_id, user_id, action, entity_type, entity_id, metadata
  ) values (
    response_row.tenant_id,
    auth.uid(),
    'save_work_order_checklist_response',
    'ordenes_trabajo',
    response_row.ot_id,
    jsonb_build_object(
      'checklist_response_id', response_row.id,
      'plantilla_item_id', response_row.plantilla_item_id,
      'completed', response_row.resultado is not null,
      'negative', is_negative,
      'critical', response_row.punto_critico
    )
  );

  return response_row;
end;
$function$;

create or replace function public.save_work_order_checklist_response_v2(
  checklist_response_uuid uuid,
  result_text text default null,
  numeric_value numeric default null,
  observations_text text default null
)
returns public.ot_checklist_respuestas
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.save_work_order_checklist_response_v2_internal(
    checklist_response_uuid,
    result_text,
    numeric_value,
    observations_text
  );
$function$;

create or replace function private.register_work_order_photo_v2_internal(
  work_order_uuid uuid,
  photo_type_text text,
  path_text text,
  filename_text text,
  mime_type_text text,
  size_bytes_value bigint,
  checklist_response_uuid uuid default null,
  category_text text default null,
  comment_text text default null
)
returns public.ot_fotos
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  photo_row public.ot_fotos;
  stored_type text;
  normalized_category text;
begin
  stored_type := case when checklist_response_uuid is null then photo_type_text else 'checklist' end;
  normalized_category := coalesce(nullif(btrim(category_text), ''), stored_type);

  if normalized_category not in ('inicial', 'durante', 'final', 'checklist', 'incidencia') then
    raise exception 'La categoría de fotografía no es válida';
  end if;

  if char_length(coalesce(comment_text, '')) > 1000 then
    raise exception 'El comentario de la fotografía es demasiado largo';
  end if;

  photo_row := public.register_work_order_photo(
    work_order_uuid,
    stored_type,
    path_text,
    filename_text,
    mime_type_text,
    size_bytes_value,
    checklist_response_uuid
  );

  update public.ot_fotos
  set
    categoria = normalized_category,
    comentario = nullif(btrim(comment_text), '')
  where id = photo_row.id
  returning * into photo_row;

  return photo_row;
end;
$function$;

create or replace function public.register_work_order_photo_v2(
  work_order_uuid uuid,
  photo_type_text text,
  path_text text,
  filename_text text,
  mime_type_text text,
  size_bytes_value bigint,
  checklist_response_uuid uuid default null,
  category_text text default null,
  comment_text text default null
)
returns public.ot_fotos
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.register_work_order_photo_v2_internal(
    work_order_uuid,
    photo_type_text,
    path_text,
    filename_text,
    mime_type_text,
    size_bytes_value,
    checklist_response_uuid,
    category_text,
    comment_text
  );
$function$;

create or replace function public.enforce_advanced_checklist_completion()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if new.estado = 'FINALIZADA_TECNICO'
    and old.estado is distinct from 'FINALIZADA_TECNICO'
  then
    if exists (
      select 1
      from public.ot_checklist_respuestas response
      where response.ot_id = new.id
        and response.tenant_id = new.tenant_id
        and response.observacion_negativa_obligatoria
        and response.resultado in ('ko', 'no', 'incorrecto')
        and nullif(btrim(coalesce(response.observaciones, '')), '') is null
    ) then
      raise exception 'No se puede finalizar: una respuesta negativa requiere observación';
    end if;

    if exists (
      select 1
      from public.ot_checklist_respuestas response
      where response.ot_id = new.id
        and response.tenant_id = new.tenant_id
        and response.punto_critico
        and response.resultado in ('ko', 'no', 'incorrecto')
    ) then
      raise exception 'No se puede finalizar: existe un punto crítico incorrecto';
    end if;

    if exists (
      select 1
      from public.ot_checklist_respuestas response
      where response.ot_id = new.id
        and response.tenant_id = new.tenant_id
        and response.requiere_foto
        and not exists (
          select 1
          from public.ot_fotos photo
          where photo.ot_id = new.id
            and photo.tenant_id = new.tenant_id
            and photo.checklist_respuesta_id = response.id
        )
    ) then
      raise exception 'No se puede finalizar: faltan fotografías vinculadas al checklist';
    end if;
  end if;

  return new;
end;
$function$;

create trigger enforce_advanced_checklist_completion_trigger
before update of estado on public.ordenes_trabajo
for each row execute function public.enforce_advanced_checklist_completion();

alter function private.prepare_work_order_checklist_internal(uuid, uuid) owner to postgres;
alter function private.ensure_work_order_default_checklist_internal(uuid) owner to postgres;
alter function private.save_work_order_checklist_response_v2_internal(uuid, text, numeric, text) owner to postgres;
alter function private.register_work_order_photo_v2_internal(uuid, text, text, text, text, bigint, uuid, text, text) owner to postgres;

revoke execute on function public.prepare_work_order_checklist(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.save_work_order_checklist_response_v2(uuid, text, numeric, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.register_work_order_photo_v2(uuid, text, text, text, text, bigint, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.enforce_advanced_checklist_completion()
  from public, anon, authenticated, service_role;

revoke execute on function private.prepare_work_order_checklist_internal(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.ensure_work_order_default_checklist_internal(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.save_work_order_checklist_response_v2_internal(uuid, text, numeric, text)
  from public, anon, authenticated, service_role;
revoke execute on function private.register_work_order_photo_v2_internal(uuid, text, text, text, text, bigint, uuid, text, text)
  from public, anon, authenticated, service_role;

grant execute on function public.prepare_work_order_checklist(uuid, uuid) to authenticated;
grant execute on function public.save_work_order_checklist_response_v2(uuid, text, numeric, text) to authenticated;
grant execute on function public.register_work_order_photo_v2(uuid, text, text, text, text, bigint, uuid, text, text) to authenticated;

grant execute on function private.prepare_work_order_checklist_internal(uuid, uuid) to authenticated;
grant execute on function private.ensure_work_order_default_checklist_internal(uuid) to authenticated;
grant execute on function private.save_work_order_checklist_response_v2_internal(uuid, text, numeric, text) to authenticated;
grant execute on function private.register_work_order_photo_v2_internal(uuid, text, text, text, text, bigint, uuid, text, text) to authenticated;

revoke execute on function public.ensure_work_order_default_checklist(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.ensure_work_order_default_checklist(uuid) to authenticated;
