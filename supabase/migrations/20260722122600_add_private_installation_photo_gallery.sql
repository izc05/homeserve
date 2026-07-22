-- Galería privada de instalaciones, separada de las evidencias de OT.

create table public.instalacion_fotos (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  instalacion_id uuid not null,
  bucket text not null default 'installation-photos',
  path text not null,
  filename text,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  titulo text,
  descripcion text,
  categoria text not null default 'general'
    check (categoria in ('principal', 'acceso', 'equipos', 'seguridad', 'general')),
  es_principal boolean not null default false,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (bucket, path),
  foreign key (tenant_id, instalacion_id)
    references public.instalaciones(tenant_id, id)
    on delete restrict
);

create index instalacion_fotos_installation_idx
  on public.instalacion_fotos(tenant_id, instalacion_id, created_at desc)
  where estado = 'activo';
create unique index instalacion_fotos_one_main_idx
  on public.instalacion_fotos(tenant_id, instalacion_id)
  where es_principal and estado = 'activo';

alter table public.instalacion_fotos enable row level security;

create or replace function private.can_access_installation_photo(
  tenant_uuid uuid,
  installation_uuid uuid,
  write_access boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.instalaciones installation
      where installation.id = installation_uuid
        and installation.tenant_id = tenant_uuid
        and installation.deleted_at is null
    )
    and (
      public.can_manage_work_orders(tenant_uuid)
      or (
        not write_access
        and exists (
          select 1
          from public.ordenes_trabajo work_order
          join public.tenant_members member
            on member.tenant_id = work_order.tenant_id
           and member.user_id = auth.uid()
           and member.estado = 'activo'
           and member.role in ('tecnico', 'tecnico_externo')
          where work_order.tenant_id = tenant_uuid
            and work_order.instalacion_id = installation_uuid
            and work_order.assigned_to = auth.uid()
            and work_order.deleted_at is null
        )
      )
    );
$function$;

create or replace function private.can_access_installation_photo_storage(
  object_name text,
  write_access boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  tenant_uuid uuid;
  installation_uuid uuid;
begin
  tenant_uuid := split_part(object_name, '/', 1)::uuid;
  installation_uuid := split_part(object_name, '/', 2)::uuid;

  if split_part(object_name, '/', 3) <> 'foto'
    or split_part(object_name, '/', 4) = ''
    or split_part(object_name, '/', 5) <> ''
    or split_part(object_name, '/', 4) like '%..%'
  then
    return false;
  end if;

  return private.can_access_installation_photo(
    tenant_uuid,
    installation_uuid,
    write_access
  );
exception
  when invalid_text_representation then
    return false;
end;
$function$;

revoke execute on function private.can_access_installation_photo(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function private.can_access_installation_photo_storage(text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function private.can_access_installation_photo(uuid, uuid, boolean)
  to authenticated;
grant execute on function private.can_access_installation_photo_storage(text, boolean)
  to authenticated;

create policy installation_photos_read
on public.instalacion_fotos
for select to authenticated
using (private.can_access_installation_photo(tenant_id, instalacion_id, false));

grant select on public.instalacion_fotos to authenticated;
revoke insert, update, delete on public.instalacion_fotos from authenticated;

create trigger instalacion_fotos_updated_at
before update on public.instalacion_fotos
for each row execute function public.set_updated_at();

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'installation-photos',
  'installation-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy installation_photo_storage_read
on storage.objects
for select to authenticated
using (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, false)
);

create policy installation_photo_storage_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, true)
  and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 10485760
);

create policy installation_photo_storage_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, true)
)
with check (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, true)
  and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 10485760
);

create policy installation_photo_storage_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, true)
);

create or replace function private.register_installation_photo_internal(
  installation_uuid uuid,
  path_text text,
  filename_text text,
  mime_type_text text,
  size_bytes_value bigint,
  title_text text default null,
  description_text text default null,
  category_text text default 'general',
  main_value boolean default false
)
returns public.instalacion_fotos
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  installation_row public.instalaciones;
  photo_row public.instalacion_fotos;
  object_mime text;
  object_size bigint;
  object_filename text;
  normalized_category text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select installation.* into installation_row
  from public.instalaciones installation
  where installation.id = installation_uuid
    and installation.deleted_at is null
  for update;

  if installation_row.id is null
    or not public.can_manage_work_orders(installation_row.tenant_id)
  then
    raise exception 'No tienes permiso para gestionar fotografías de esta instalación';
  end if;

  if path_text not like installation_row.tenant_id::text || '/' || installation_row.id::text || '/foto/%'
    or split_part(path_text, '/', 4) = ''
    or split_part(path_text, '/', 5) <> ''
    or split_part(path_text, '/', 4) like '%..%'
  then
    raise exception 'La ruta de fotografía no pertenece a la instalación';
  end if;

  select
    lower(coalesce(nullif(object.metadata ->> 'mimetype', ''), nullif(mime_type_text, ''))),
    coalesce(nullif(object.metadata ->> 'size', '')::bigint, size_bytes_value),
    split_part(object.name, '/', 4)
  into object_mime, object_size, object_filename
  from storage.objects object
  where object.bucket_id = 'installation-photos'
    and object.name = path_text
    and object.owner = auth.uid();

  if object_filename is null then
    raise exception 'El archivo privado no está disponible para este usuario';
  end if;
  if object_mime not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'El formato de fotografía debe ser JPEG, PNG o WebP';
  end if;
  if object_size is null or object_size < 1 or object_size > 10485760 then
    raise exception 'La fotografía no puede superar 10 MiB';
  end if;

  normalized_category := coalesce(nullif(btrim(category_text), ''), 'general');
  if normalized_category not in ('principal', 'acceso', 'equipos', 'seguridad', 'general') then
    raise exception 'La categoría de fotografía no es válida';
  end if;

  if coalesce(main_value, false) then
    update public.instalacion_fotos
    set es_principal = false
    where tenant_id = installation_row.tenant_id
      and instalacion_id = installation_row.id
      and estado = 'activo'
      and es_principal;
  end if;

  insert into public.instalacion_fotos (
    tenant_id, instalacion_id, bucket, path, filename, mime_type,
    size_bytes, titulo, descripcion, categoria, es_principal, created_by
  ) values (
    installation_row.tenant_id,
    installation_row.id,
    'installation-photos',
    path_text,
    coalesce(nullif(btrim(filename_text), ''), object_filename),
    object_mime,
    object_size,
    nullif(btrim(title_text), ''),
    nullif(btrim(description_text), ''),
    normalized_category,
    coalesce(main_value, false),
    auth.uid()
  ) returning * into photo_row;

  perform public.log_audit(
    installation_row.tenant_id,
    'register_installation_photo',
    'instalaciones',
    installation_row.id,
    jsonb_build_object(
      'photo_id', photo_row.id,
      'category', photo_row.categoria,
      'main', photo_row.es_principal
    )
  );

  return photo_row;
end;
$function$;

create or replace function public.register_installation_photo(
  installation_uuid uuid,
  path_text text,
  filename_text text,
  mime_type_text text,
  size_bytes_value bigint,
  title_text text default null,
  description_text text default null,
  category_text text default 'general',
  main_value boolean default false
)
returns public.instalacion_fotos
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.register_installation_photo_internal(
    installation_uuid,
    path_text,
    filename_text,
    mime_type_text,
    size_bytes_value,
    title_text,
    description_text,
    category_text,
    main_value
  );
$function$;

create or replace function private.set_installation_main_photo_internal(
  photo_uuid uuid
)
returns public.instalacion_fotos
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  photo_row public.instalacion_fotos;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select photo.* into photo_row
  from public.instalacion_fotos photo
  where photo.id = photo_uuid
    and photo.estado = 'activo'
  for update;

  if photo_row.id is null
    or not public.can_manage_work_orders(photo_row.tenant_id)
  then
    raise exception 'La fotografía no está disponible';
  end if;

  update public.instalacion_fotos
  set es_principal = false
  where tenant_id = photo_row.tenant_id
    and instalacion_id = photo_row.instalacion_id
    and estado = 'activo'
    and es_principal;

  update public.instalacion_fotos
  set es_principal = true
  where id = photo_row.id
  returning * into photo_row;

  perform public.log_audit(
    photo_row.tenant_id,
    'set_installation_main_photo',
    'instalaciones',
    photo_row.instalacion_id,
    jsonb_build_object('photo_id', photo_row.id)
  );

  return photo_row;
end;
$function$;

create or replace function public.set_installation_main_photo(
  photo_uuid uuid
)
returns public.instalacion_fotos
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.set_installation_main_photo_internal(photo_uuid);
$function$;

create or replace function private.delete_installation_photo_metadata_internal(
  photo_uuid uuid
)
returns public.instalacion_fotos
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  photo_row public.instalacion_fotos;
  replacement_uuid uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select photo.* into photo_row
  from public.instalacion_fotos photo
  where photo.id = photo_uuid
  for update;

  if photo_row.id is null
    or not public.can_manage_work_orders(photo_row.tenant_id)
  then
    raise exception 'La fotografía no está disponible';
  end if;

  delete from public.instalacion_fotos
  where id = photo_row.id;

  if photo_row.es_principal then
    select photo.id into replacement_uuid
    from public.instalacion_fotos photo
    where photo.tenant_id = photo_row.tenant_id
      and photo.instalacion_id = photo_row.instalacion_id
      and photo.estado = 'activo'
    order by photo.created_at desc
    limit 1;

    if replacement_uuid is not null then
      update public.instalacion_fotos
      set es_principal = true
      where id = replacement_uuid;
    end if;
  end if;

  perform public.log_audit(
    photo_row.tenant_id,
    'delete_installation_photo',
    'instalaciones',
    photo_row.instalacion_id,
    jsonb_build_object('photo_id', photo_row.id)
  );

  return photo_row;
end;
$function$;

create or replace function public.delete_installation_photo_metadata(
  photo_uuid uuid
)
returns public.instalacion_fotos
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.delete_installation_photo_metadata_internal(photo_uuid);
$function$;

alter function private.can_access_installation_photo(uuid, uuid, boolean) owner to postgres;
alter function private.can_access_installation_photo_storage(text, boolean) owner to postgres;
alter function private.register_installation_photo_internal(uuid, text, text, text, bigint, text, text, text, boolean) owner to postgres;
alter function private.set_installation_main_photo_internal(uuid) owner to postgres;
alter function private.delete_installation_photo_metadata_internal(uuid) owner to postgres;

revoke execute on function public.register_installation_photo(uuid, text, text, text, bigint, text, text, text, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function public.set_installation_main_photo(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.delete_installation_photo_metadata(uuid)
  from public, anon, authenticated, service_role;

revoke execute on function private.register_installation_photo_internal(uuid, text, text, text, bigint, text, text, text, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function private.set_installation_main_photo_internal(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.delete_installation_photo_metadata_internal(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.register_installation_photo(uuid, text, text, text, bigint, text, text, text, boolean)
  to authenticated;
grant execute on function public.set_installation_main_photo(uuid)
  to authenticated;
grant execute on function public.delete_installation_photo_metadata(uuid)
  to authenticated;

grant execute on function private.register_installation_photo_internal(uuid, text, text, text, bigint, text, text, text, boolean)
  to authenticated;
grant execute on function private.set_installation_main_photo_internal(uuid)
  to authenticated;
grant execute on function private.delete_installation_photo_metadata_internal(uuid)
  to authenticated;
