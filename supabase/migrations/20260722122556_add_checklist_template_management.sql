-- Plantillas administrables y versionadas de checklist por tenant.
-- Las OT conservan una instantánea JSON independiente de futuras ediciones.

create table public.checklist_plantillas (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  nombre text not null check (char_length(btrim(nombre)) between 3 and 160),
  descripcion text,
  especialidad text,
  version integer not null default 1 check (version > 0),
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.checklist_plantilla_secciones (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  plantilla_id uuid not null,
  titulo text not null check (char_length(btrim(titulo)) between 2 and 160),
  descripcion text,
  orden integer not null check (orden >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (plantilla_id, orden),
  foreign key (tenant_id, plantilla_id)
    references public.checklist_plantillas(tenant_id, id)
    on delete cascade
);

create table public.checklist_plantilla_puntos (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  plantilla_id uuid not null,
  seccion_id uuid not null,
  titulo text not null check (char_length(btrim(titulo)) between 2 and 200),
  instrucciones text,
  tipo_respuesta text not null check (tipo_respuesta in (
    'si_no_na', 'correcto_incorrecto', 'numero', 'texto', 'seleccion'
  )),
  unidad text,
  opciones jsonb not null default '[]'::jsonb,
  obligatorio boolean not null default true,
  observacion_negativa_obligatoria boolean not null default false,
  requiere_foto boolean not null default false,
  punto_critico boolean not null default false,
  orden integer not null check (orden >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (seccion_id, orden),
  foreign key (tenant_id, plantilla_id)
    references public.checklist_plantillas(tenant_id, id)
    on delete cascade,
  foreign key (tenant_id, seccion_id)
    references public.checklist_plantilla_secciones(tenant_id, id)
    on delete cascade,
  check (jsonb_typeof(opciones) = 'array'),
  check (
    (tipo_respuesta = 'seleccion' and jsonb_array_length(opciones) > 0)
    or (tipo_respuesta <> 'seleccion' and opciones = '[]'::jsonb)
  )
);

alter table public.ordenes_trabajo
  add column checklist_template_id uuid,
  add column checklist_template_version integer;

alter table public.ordenes_trabajo
  add constraint ordenes_trabajo_checklist_template_fk
  foreign key (tenant_id, checklist_template_id)
  references public.checklist_plantillas(tenant_id, id)
  on delete restrict;

create index checklist_plantillas_tenant_estado_idx
  on public.checklist_plantillas(tenant_id, estado, updated_at desc);
create index checklist_plantilla_secciones_template_idx
  on public.checklist_plantilla_secciones(tenant_id, plantilla_id, orden);
create index checklist_plantilla_puntos_template_idx
  on public.checklist_plantilla_puntos(tenant_id, plantilla_id, seccion_id, orden);

alter table public.checklist_plantillas enable row level security;
alter table public.checklist_plantilla_secciones enable row level security;
alter table public.checklist_plantilla_puntos enable row level security;

create policy checklist_templates_read
on public.checklist_plantillas
for select to authenticated
using (public.can_manage_work_orders(tenant_id));

create policy checklist_templates_insert
on public.checklist_plantillas
for insert to authenticated
with check (
  public.can_manage_work_orders(tenant_id)
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

create policy checklist_templates_update
on public.checklist_plantillas
for update to authenticated
using (public.can_manage_work_orders(tenant_id))
with check (
  public.can_manage_work_orders(tenant_id)
  and updated_by = auth.uid()
);

create policy checklist_templates_delete
on public.checklist_plantillas
for delete to authenticated
using (public.can_manage_work_orders(tenant_id));

create policy checklist_template_sections_read
on public.checklist_plantilla_secciones
for select to authenticated
using (public.can_manage_work_orders(tenant_id));

create policy checklist_template_sections_write
on public.checklist_plantilla_secciones
for all to authenticated
using (public.can_manage_work_orders(tenant_id))
with check (
  public.can_manage_work_orders(tenant_id)
  and created_by = auth.uid()
  and exists (
    select 1
    from public.checklist_plantillas template
    where template.id = plantilla_id
      and template.tenant_id = tenant_id
  )
);

create policy checklist_template_points_read
on public.checklist_plantilla_puntos
for select to authenticated
using (public.can_manage_work_orders(tenant_id));

create policy checklist_template_points_write
on public.checklist_plantilla_puntos
for all to authenticated
using (public.can_manage_work_orders(tenant_id))
with check (
  public.can_manage_work_orders(tenant_id)
  and created_by = auth.uid()
  and exists (
    select 1
    from public.checklist_plantilla_secciones section
    where section.id = seccion_id
      and section.plantilla_id = plantilla_id
      and section.tenant_id = tenant_id
  )
);

grant select, insert, update, delete on public.checklist_plantillas to authenticated;
grant select, insert, update, delete on public.checklist_plantilla_secciones to authenticated;
grant select, insert, update, delete on public.checklist_plantilla_puntos to authenticated;

create trigger checklist_plantillas_updated_at
before update on public.checklist_plantillas
for each row execute function public.set_updated_at();

create trigger checklist_plantilla_secciones_updated_at
before update on public.checklist_plantilla_secciones
for each row execute function public.set_updated_at();

create trigger checklist_plantilla_puntos_updated_at
before update on public.checklist_plantilla_puntos
for each row execute function public.set_updated_at();

create or replace function public.save_checklist_template(
  payload_json jsonb,
  template_uuid uuid default null
)
returns public.checklist_plantillas
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
declare
  template_row public.checklist_plantillas;
  tenant_uuid uuid;
  section_value jsonb;
  point_value jsonb;
  section_uuid uuid;
  section_position bigint;
  point_position bigint;
  response_type text;
  options_json jsonb;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if payload_json is null or jsonb_typeof(payload_json) <> 'object' then
    raise exception 'La plantilla no es válida';
  end if;

  if nullif(btrim(payload_json ->> 'name'), '') is null then
    raise exception 'La plantilla debe tener un nombre';
  end if;

  if template_uuid is null then
    tenant_uuid := nullif(payload_json ->> 'tenantId', '')::uuid;
    if tenant_uuid is null or not public.can_manage_work_orders(tenant_uuid) then
      raise exception 'No tienes permiso para crear plantillas en esta organización';
    end if;

    insert into public.checklist_plantillas (
      tenant_id, nombre, descripcion, especialidad, version, estado,
      created_by, updated_by
    ) values (
      tenant_uuid,
      btrim(payload_json ->> 'name'),
      nullif(btrim(payload_json ->> 'description'), ''),
      nullif(btrim(payload_json ->> 'specialty'), ''),
      1,
      case when coalesce((payload_json ->> 'active')::boolean, true) then 'activo' else 'inactivo' end,
      auth.uid(),
      auth.uid()
    )
    returning * into template_row;
  else
    select template.*
      into template_row
    from public.checklist_plantillas template
    where template.id = template_uuid
    for update;

    if template_row.id is null or not public.can_manage_work_orders(template_row.tenant_id) then
      raise exception 'La plantilla no está disponible';
    end if;

    tenant_uuid := template_row.tenant_id;

    update public.checklist_plantillas
    set
      nombre = btrim(payload_json ->> 'name'),
      descripcion = nullif(btrim(payload_json ->> 'description'), ''),
      especialidad = nullif(btrim(payload_json ->> 'specialty'), ''),
      version = version + 1,
      estado = case when coalesce((payload_json ->> 'active')::boolean, estado = 'activo') then 'activo' else 'inactivo' end,
      updated_by = auth.uid()
    where id = template_row.id
    returning * into template_row;

    delete from public.checklist_plantilla_puntos
    where plantilla_id = template_row.id;
    delete from public.checklist_plantilla_secciones
    where plantilla_id = template_row.id;
  end if;

  if jsonb_typeof(payload_json -> 'sections') <> 'array'
    or jsonb_array_length(payload_json -> 'sections') = 0
  then
    raise exception 'La plantilla debe incluir al menos una sección';
  end if;

  for section_value, section_position in
    select value, ordinality
    from jsonb_array_elements(payload_json -> 'sections') with ordinality
  loop
    if nullif(btrim(section_value ->> 'title'), '') is null
      or jsonb_typeof(section_value -> 'points') <> 'array'
      or jsonb_array_length(section_value -> 'points') = 0
    then
      raise exception 'Cada sección debe tener título y al menos un punto';
    end if;

    insert into public.checklist_plantilla_secciones (
      tenant_id, plantilla_id, titulo, descripcion, orden, created_by
    ) values (
      tenant_uuid,
      template_row.id,
      btrim(section_value ->> 'title'),
      nullif(btrim(section_value ->> 'description'), ''),
      (section_position * 10)::integer,
      auth.uid()
    )
    returning id into section_uuid;

    for point_value, point_position in
      select value, ordinality
      from jsonb_array_elements(section_value -> 'points') with ordinality
    loop
      response_type := point_value ->> 'responseType';
      options_json := coalesce(point_value -> 'options', '[]'::jsonb);

      if nullif(btrim(point_value ->> 'title'), '') is null
        or response_type not in ('si_no_na', 'correcto_incorrecto', 'numero', 'texto', 'seleccion')
        or jsonb_typeof(options_json) <> 'array'
        or (response_type = 'seleccion' and jsonb_array_length(options_json) = 0)
        or (response_type <> 'seleccion' and options_json <> '[]'::jsonb)
      then
        raise exception 'Existe un punto de checklist no válido';
      end if;

      if exists (
        select 1
        from jsonb_array_elements(options_json) as option(value)
        where jsonb_typeof(option.value) <> 'string'
          or nullif(btrim(option.value #>> '{}'), '') is null
      ) then
        raise exception 'Las opciones de selección deben ser textos válidos';
      end if;

      insert into public.checklist_plantilla_puntos (
        tenant_id, plantilla_id, seccion_id, titulo, instrucciones,
        tipo_respuesta, unidad, opciones, obligatorio,
        observacion_negativa_obligatoria, requiere_foto, punto_critico,
        orden, created_by
      ) values (
        tenant_uuid,
        template_row.id,
        section_uuid,
        btrim(point_value ->> 'title'),
        nullif(btrim(point_value ->> 'instructions'), ''),
        response_type,
        case when response_type = 'numero' then nullif(btrim(point_value ->> 'unit'), '') else null end,
        options_json,
        coalesce((point_value ->> 'required')::boolean, true),
        coalesce((point_value ->> 'negativeObservationRequired')::boolean, false),
        coalesce((point_value ->> 'photoRequired')::boolean, false),
        coalesce((point_value ->> 'critical')::boolean, false),
        (point_position * 10)::integer,
        auth.uid()
      );
    end loop;
  end loop;

  perform public.log_audit(
    tenant_uuid,
    case when template_uuid is null then 'create_checklist_template' else 'update_checklist_template' end,
    'checklist_plantillas',
    template_row.id,
    jsonb_build_object('version', template_row.version, 'estado', template_row.estado)
  );

  return template_row;
end;
$function$;

create or replace function public.duplicate_checklist_template(
  template_uuid uuid
)
returns public.checklist_plantillas
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
declare
  source_row public.checklist_plantillas;
  copy_row public.checklist_plantillas;
  source_section public.checklist_plantilla_secciones;
  new_section_uuid uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select template.* into source_row
  from public.checklist_plantillas template
  where template.id = template_uuid;

  if source_row.id is null or not public.can_manage_work_orders(source_row.tenant_id) then
    raise exception 'La plantilla no está disponible';
  end if;

  insert into public.checklist_plantillas (
    tenant_id, nombre, descripcion, especialidad, version, estado,
    created_by, updated_by
  ) values (
    source_row.tenant_id,
    left(source_row.nombre || ' (copia)', 160),
    source_row.descripcion,
    source_row.especialidad,
    1,
    'inactivo',
    auth.uid(),
    auth.uid()
  ) returning * into copy_row;

  for source_section in
    select section.*
    from public.checklist_plantilla_secciones section
    where section.plantilla_id = source_row.id
    order by section.orden
  loop
    insert into public.checklist_plantilla_secciones (
      tenant_id, plantilla_id, titulo, descripcion, orden, created_by
    ) values (
      copy_row.tenant_id, copy_row.id, source_section.titulo,
      source_section.descripcion, source_section.orden, auth.uid()
    ) returning id into new_section_uuid;

    insert into public.checklist_plantilla_puntos (
      tenant_id, plantilla_id, seccion_id, titulo, instrucciones,
      tipo_respuesta, unidad, opciones, obligatorio,
      observacion_negativa_obligatoria, requiere_foto, punto_critico,
      orden, created_by
    )
    select
      copy_row.tenant_id, copy_row.id, new_section_uuid, point.titulo,
      point.instrucciones, point.tipo_respuesta, point.unidad, point.opciones,
      point.obligatorio, point.observacion_negativa_obligatoria,
      point.requiere_foto, point.punto_critico, point.orden, auth.uid()
    from public.checklist_plantilla_puntos point
    where point.seccion_id = source_section.id
    order by point.orden;
  end loop;

  perform public.log_audit(
    copy_row.tenant_id,
    'duplicate_checklist_template',
    'checklist_plantillas',
    copy_row.id,
    jsonb_build_object('source_template_id', source_row.id)
  );

  return copy_row;
end;
$function$;

create or replace function public.set_checklist_template_active(
  template_uuid uuid,
  active_value boolean
)
returns public.checklist_plantillas
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
declare
  template_row public.checklist_plantillas;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select template.* into template_row
  from public.checklist_plantillas template
  where template.id = template_uuid
  for update;

  if template_row.id is null or not public.can_manage_work_orders(template_row.tenant_id) then
    raise exception 'La plantilla no está disponible';
  end if;

  update public.checklist_plantillas
  set estado = case when active_value then 'activo' else 'inactivo' end,
      updated_by = auth.uid()
  where id = template_row.id
  returning * into template_row;

  perform public.log_audit(
    template_row.tenant_id,
    case when active_value then 'activate_checklist_template' else 'deactivate_checklist_template' end,
    'checklist_plantillas',
    template_row.id,
    jsonb_build_object('version', template_row.version)
  );

  return template_row;
end;
$function$;

revoke execute on function public.save_checklist_template(jsonb, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.duplicate_checklist_template(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.set_checklist_template_active(uuid, boolean)
  from public, anon, authenticated, service_role;

grant execute on function public.save_checklist_template(jsonb, uuid) to authenticated;
grant execute on function public.duplicate_checklist_template(uuid) to authenticated;
grant execute on function public.set_checklist_template_active(uuid, boolean) to authenticated;
