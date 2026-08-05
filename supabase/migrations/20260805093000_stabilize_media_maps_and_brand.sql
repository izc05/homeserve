-- Estabilización de medios privados y geolocalización para IsiVoltPro OT.
-- Migración aditiva e idempotente. No modifica datos históricos ni desactiva RLS.

alter table public.clientes
  add column if not exists logo_bucket text,
  add column if not exists logo_path text,
  add column if not exists logo_mime_type text,
  add column if not exists logo_size_bytes bigint,
  add column if not exists logo_updated_at timestamptz;

alter table public.instalaciones
  add column if not exists latitud numeric(9,6),
  add column if not exists longitud numeric(9,6);

do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clientes_logo_size_check'
      and conrelid = 'public.clientes'::regclass
  ) then
    alter table public.clientes
      add constraint clientes_logo_size_check
      check (logo_size_bytes is null or logo_size_bytes between 1 and 5242880);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'clientes_logo_mime_check'
      and conrelid = 'public.clientes'::regclass
  ) then
    alter table public.clientes
      add constraint clientes_logo_mime_check
      check (
        logo_mime_type is null
        or logo_mime_type in ('image/jpeg', 'image/png', 'image/webp')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'instalaciones_latitud_check'
      and conrelid = 'public.instalaciones'::regclass
  ) then
    alter table public.instalaciones
      add constraint instalaciones_latitud_check
      check (latitud is null or latitud between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'instalaciones_longitud_check'
      and conrelid = 'public.instalaciones'::regclass
  ) then
    alter table public.instalaciones
      add constraint instalaciones_longitud_check
      check (longitud is null or longitud between -180 and 180);
  end if;
end;
$block$;

create index if not exists clientes_logo_path_idx
  on public.clientes(tenant_id, logo_path)
  where logo_path is not null and deleted_at is null;

create index if not exists instalaciones_coordinates_idx
  on public.instalaciones(tenant_id, latitud, longitud)
  where latitud is not null and longitud is not null and deleted_at is null;

-- Lectura: cualquier miembro activo del tenant.
-- Escritura: administrador o coordinador activo del tenant.
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
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.instalaciones installation
      where installation.id = installation_uuid
        and installation.tenant_id = tenant_uuid
        and installation.deleted_at is null
    )
    and case
      when write_access then public.can_manage_work_orders(tenant_uuid)
      else public.has_tenant_access(tenant_uuid)
    end;
$function$;

-- Admite la ruta nueva tenant/instalacion/uuid.ext y la ruta legacy
-- tenant/instalacion/foto/uuid.ext para no romper objetos existentes.
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
  filename_text text;
  segment_four text;
begin
  tenant_uuid := split_part(object_name, '/', 1)::uuid;
  installation_uuid := split_part(object_name, '/', 2)::uuid;
  segment_four := split_part(object_name, '/', 4);

  if split_part(object_name, '/', 3) = 'foto' then
    filename_text := segment_four;
    if split_part(object_name, '/', 5) <> '' then return false; end if;
  else
    filename_text := split_part(object_name, '/', 3);
    if segment_four <> '' then return false; end if;
  end if;

  if filename_text = ''
    or filename_text like '%..%'
    or filename_text like '%/%'
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

alter function private.can_access_installation_photo(uuid, uuid, boolean) owner to postgres;
alter function private.can_access_installation_photo_storage(text, boolean) owner to postgres;
revoke execute on function private.can_access_installation_photo(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function private.can_access_installation_photo_storage(text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function private.can_access_installation_photo(uuid, uuid, boolean)
  to authenticated;
grant execute on function private.can_access_installation_photo_storage(text, boolean)
  to authenticated;

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

drop policy if exists installation_photo_storage_read on storage.objects;
drop policy if exists installation_photo_storage_insert on storage.objects;
drop policy if exists installation_photo_storage_update on storage.objects;
drop policy if exists installation_photo_storage_delete on storage.objects;

create policy installation_photo_storage_read
on storage.objects for select to authenticated
using (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, false)
);

create policy installation_photo_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, true)
  and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 10485760
  and lower(coalesce(metadata ->> 'mimetype', ''))
    in ('image/jpeg', 'image/png', 'image/webp')
);

create policy installation_photo_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, true)
)
with check (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, true)
  and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 10485760
  and lower(coalesce(metadata ->> 'mimetype', ''))
    in ('image/jpeg', 'image/png', 'image/webp')
);

create policy installation_photo_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'installation-photos'
  and private.can_access_installation_photo_storage(name, true)
);

-- Sustituye únicamente la validación de ruta del registro existente.
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
  if (select auth.uid()) is null then raise exception 'Debes iniciar sesión'; end if;

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

  if not private.can_access_installation_photo_storage(path_text, true)
    or split_part(path_text, '/', 1) <> installation_row.tenant_id::text
    or split_part(path_text, '/', 2) <> installation_row.id::text
  then
    raise exception 'La ruta de fotografía no pertenece a la instalación';
  end if;

  select
    lower(coalesce(nullif(object.metadata ->> 'mimetype', ''), nullif(mime_type_text, ''))),
    coalesce(nullif(object.metadata ->> 'size', '')::bigint, size_bytes_value),
    case
      when split_part(object.name, '/', 3) = 'foto'
        then split_part(object.name, '/', 4)
      else split_part(object.name, '/', 3)
    end
  into object_mime, object_size, object_filename
  from storage.objects object
  where object.bucket_id = 'installation-photos'
    and object.name = path_text
    and object.owner = (select auth.uid());

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
    (select auth.uid())
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

create or replace function private.update_installation_photo_metadata_internal(
  photo_uuid uuid,
  title_text text default null,
  description_text text default null,
  category_text text default 'general'
)
returns public.instalacion_fotos
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  photo_row public.instalacion_fotos;
  normalized_category text;
begin
  if (select auth.uid()) is null then raise exception 'Debes iniciar sesión'; end if;

  select photo.* into photo_row
  from public.instalacion_fotos photo
  where photo.id = photo_uuid and photo.estado = 'activo'
  for update;

  if photo_row.id is null
    or not public.can_manage_work_orders(photo_row.tenant_id)
  then
    raise exception 'La fotografía no está disponible';
  end if;

  normalized_category := coalesce(nullif(btrim(category_text), ''), 'general');
  if normalized_category not in ('principal', 'acceso', 'equipos', 'seguridad', 'general') then
    raise exception 'La categoría de fotografía no es válida';
  end if;

  update public.instalacion_fotos
  set titulo = nullif(btrim(title_text), ''),
      descripcion = nullif(btrim(description_text), ''),
      categoria = normalized_category,
      updated_at = now()
  where id = photo_row.id
  returning * into photo_row;

  perform public.log_audit(
    photo_row.tenant_id,
    'update_installation_photo_metadata',
    'instalaciones',
    photo_row.instalacion_id,
    jsonb_build_object('photo_id', photo_row.id, 'category', photo_row.categoria)
  );
  return photo_row;
end;
$function$;

create or replace function public.update_installation_photo_metadata(
  photo_uuid uuid,
  title_text text default null,
  description_text text default null,
  category_text text default 'general'
)
returns public.instalacion_fotos
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.update_installation_photo_metadata_internal(
    photo_uuid, title_text, description_text, category_text
  );
$function$;

alter function private.register_installation_photo_internal(uuid, text, text, text, bigint, text, text, text, boolean) owner to postgres;
alter function private.update_installation_photo_metadata_internal(uuid, text, text, text) owner to postgres;
revoke execute on function private.update_installation_photo_metadata_internal(uuid, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.update_installation_photo_metadata(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function private.update_installation_photo_metadata_internal(uuid, text, text, text)
  to authenticated;
grant execute on function public.update_installation_photo_metadata(uuid, text, text, text)
  to authenticated;

-- Imagen principal privada de cliente.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'client-media',
  'client-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_access_client_media_storage(
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
  client_uuid uuid;
  filename_text text;
begin
  tenant_uuid := split_part(object_name, '/', 1)::uuid;
  client_uuid := split_part(object_name, '/', 2)::uuid;
  filename_text := split_part(object_name, '/', 3);

  if filename_text = ''
    or split_part(object_name, '/', 4) <> ''
    or filename_text like '%..%'
  then
    return false;
  end if;

  if not exists (
    select 1 from public.clientes client
    where client.id = client_uuid
      and client.tenant_id = tenant_uuid
      and client.deleted_at is null
  ) then return false; end if;

  if write_access then return public.can_manage_work_orders(tenant_uuid); end if;
  return public.has_tenant_access(tenant_uuid);
exception
  when invalid_text_representation then return false;
end;
$function$;

alter function private.can_access_client_media_storage(text, boolean) owner to postgres;
revoke execute on function private.can_access_client_media_storage(text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function private.can_access_client_media_storage(text, boolean)
  to authenticated;

drop policy if exists client_media_storage_read on storage.objects;
drop policy if exists client_media_storage_insert on storage.objects;
drop policy if exists client_media_storage_update on storage.objects;
drop policy if exists client_media_storage_delete on storage.objects;

create policy client_media_storage_read
on storage.objects for select to authenticated
using (
  bucket_id = 'client-media'
  and private.can_access_client_media_storage(name, false)
);
create policy client_media_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'client-media'
  and private.can_access_client_media_storage(name, true)
  and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 5242880
  and lower(coalesce(metadata ->> 'mimetype', ''))
    in ('image/jpeg', 'image/png', 'image/webp')
);
create policy client_media_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'client-media'
  and private.can_access_client_media_storage(name, true)
)
with check (
  bucket_id = 'client-media'
  and private.can_access_client_media_storage(name, true)
  and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 5242880
  and lower(coalesce(metadata ->> 'mimetype', ''))
    in ('image/jpeg', 'image/png', 'image/webp')
);
create policy client_media_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'client-media'
  and private.can_access_client_media_storage(name, true)
);

create or replace function private.set_client_logo_internal(
  client_uuid uuid,
  path_text text,
  mime_type_text text,
  size_bytes_value bigint
)
returns public.clientes
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  client_row public.clientes;
  object_mime text;
  object_size bigint;
begin
  if (select auth.uid()) is null then raise exception 'Debes iniciar sesión'; end if;

  select client.* into client_row
  from public.clientes client
  where client.id = client_uuid and client.deleted_at is null
  for update;

  if client_row.id is null or not public.can_manage_work_orders(client_row.tenant_id) then
    raise exception 'No tienes permiso para gestionar la imagen de este cliente';
  end if;

  if not private.can_access_client_media_storage(path_text, true)
    or split_part(path_text, '/', 1) <> client_row.tenant_id::text
    or split_part(path_text, '/', 2) <> client_row.id::text
  then raise exception 'La ruta de imagen no pertenece al cliente'; end if;

  select
    lower(coalesce(nullif(object.metadata ->> 'mimetype', ''), nullif(mime_type_text, ''))),
    coalesce(nullif(object.metadata ->> 'size', '')::bigint, size_bytes_value)
  into object_mime, object_size
  from storage.objects object
  where object.bucket_id = 'client-media'
    and object.name = path_text
    and object.owner = (select auth.uid());

  if object_mime is null then raise exception 'El archivo privado no está disponible'; end if;
  if object_mime not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'El formato de imagen debe ser JPEG, PNG o WebP';
  end if;
  if object_size is null or object_size < 1 or object_size > 5242880 then
    raise exception 'La imagen no puede superar 5 MiB';
  end if;

  update public.clientes
  set logo_bucket = 'client-media',
      logo_path = path_text,
      logo_mime_type = object_mime,
      logo_size_bytes = object_size,
      logo_updated_at = now(),
      updated_at = now()
  where id = client_row.id
  returning * into client_row;

  perform public.log_audit(
    client_row.tenant_id,
    'set_client_logo',
    'clientes',
    client_row.id,
    jsonb_build_object('path', path_text)
  );
  return client_row;
end;
$function$;

create or replace function public.set_client_logo(
  client_uuid uuid,
  path_text text,
  mime_type_text text,
  size_bytes_value bigint
)
returns public.clientes
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.set_client_logo_internal(
    client_uuid, path_text, mime_type_text, size_bytes_value
  );
$function$;

create or replace function private.clear_client_logo_internal(client_uuid uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  client_row public.clientes;
  previous_path text;
begin
  if (select auth.uid()) is null then raise exception 'Debes iniciar sesión'; end if;
  select client.* into client_row
  from public.clientes client
  where client.id = client_uuid and client.deleted_at is null
  for update;
  if client_row.id is null or not public.can_manage_work_orders(client_row.tenant_id) then
    raise exception 'No tienes permiso para gestionar la imagen de este cliente';
  end if;

  previous_path := client_row.logo_path;
  update public.clientes
  set logo_bucket = null, logo_path = null, logo_mime_type = null,
      logo_size_bytes = null, logo_updated_at = now(), updated_at = now()
  where id = client_row.id;

  perform public.log_audit(
    client_row.tenant_id, 'clear_client_logo', 'clientes', client_row.id, '{}'::jsonb
  );
  return previous_path;
end;
$function$;

create or replace function public.clear_client_logo(client_uuid uuid)
returns text
language sql
security invoker
set search_path = pg_catalog
as $function$
  select private.clear_client_logo_internal(client_uuid);
$function$;

alter function private.set_client_logo_internal(uuid, text, text, bigint) owner to postgres;
alter function private.clear_client_logo_internal(uuid) owner to postgres;
revoke execute on function private.set_client_logo_internal(uuid, text, text, bigint)
  from public, anon, authenticated, service_role;
revoke execute on function private.clear_client_logo_internal(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.set_client_logo(uuid, text, text, bigint)
  from public, anon, authenticated, service_role;
revoke execute on function public.clear_client_logo(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.set_client_logo_internal(uuid, text, text, bigint)
  to authenticated;
grant execute on function private.clear_client_logo_internal(uuid)
  to authenticated;
grant execute on function public.set_client_logo(uuid, text, text, bigint)
  to authenticated;
grant execute on function public.clear_client_logo(uuid)
  to authenticated;
