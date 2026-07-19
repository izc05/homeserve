-- Base reproducible de IsiVoltPro OT.
-- Debe ejecutarse antes de las migraciones legacy. Es aditiva para instalaciones existentes.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  email text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default extensions.gen_random_uuid(),
  nombre text not null,
  slug text unique,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.clientes (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  nombre text not null,
  codigo text,
  email text,
  telefono text,
  direccion text,
  observaciones text,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  unique nulls not distinct (tenant_id, codigo)
);

create table if not exists public.tenant_members (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cliente_id uuid,
  role text not null check (role in ('admin_cliente', 'coordinador', 'tecnico', 'tecnico_externo', 'cliente_lectura')),
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, id),
  foreign key (tenant_id, cliente_id) references public.clientes(tenant_id, id)
);

create table if not exists public.tenant_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  nombre text,
  email text not null,
  role text not null check (role in ('admin_cliente', 'coordinador', 'tecnico', 'tecnico_externo', 'cliente_lectura')),
  cliente_id uuid,
  invitation_token uuid not null default extensions.gen_random_uuid() unique,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'cancelada', 'caducada')),
  require_mfa boolean not null default false,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, cliente_id) references public.clientes(tenant_id, id)
);

create table if not exists public.instalaciones (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  cliente_id uuid,
  nombre text not null,
  codigo text,
  tipo text,
  direccion text,
  descripcion text,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, cliente_id) references public.clientes(tenant_id, id)
);

create table if not exists public.ubicaciones (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  instalacion_id uuid not null,
  nombre text not null,
  codigo text,
  descripcion text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, instalacion_id) references public.instalaciones(tenant_id, id)
);

create table if not exists public.activos (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  instalacion_id uuid not null,
  ubicacion_id uuid,
  nombre text not null,
  tipo text,
  marca text,
  modelo text,
  numero_serie text,
  referencia text,
  criticidad text not null default 'media',
  estado text not null default 'correcto',
  descripcion text,
  observaciones text,
  fecha_ultima_revision date,
  fecha_proxima_revision date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, instalacion_id) references public.instalaciones(tenant_id, id),
  foreign key (tenant_id, ubicacion_id) references public.ubicaciones(tenant_id, id)
);

create table if not exists public.ordenes_trabajo (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  cliente_id uuid,
  codigo_ot text not null,
  instalacion_id uuid not null,
  ubicacion_id uuid,
  activo_id uuid,
  titulo text not null check (char_length(trim(titulo)) between 3 and 180),
  descripcion text,
  tipo text not null,
  tipo_ot text,
  tipo_ot_detalle text,
  prioridad text not null default 'normal' check (prioridad in ('baja', 'normal', 'alta', 'urgente', 'critica')),
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR', 'ASIGNADA', 'ACEPTADA', 'EN_CURSO', 'BLOQUEADA', 'FINALIZADA_TECNICO', 'VALIDADA', 'CANCELADA')),
  assigned_to uuid references public.profiles(id),
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz,
  reassignment_reason text,
  fecha_prevista timestamptz,
  fecha_limite timestamptz,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  closed_at timestamptz,
  tiempo_estimado_min integer,
  duracion_estimada_minutos integer,
  instrucciones_tecnico text,
  riesgos_precauciones text,
  resultado_esperado text,
  trabajo_solicitado text,
  trabajo_realizado text,
  activos_relacionados uuid[] not null default '{}'::uuid[],
  checklist_snapshot jsonb not null default '[]'::jsonb,
  checklist_snapshot_version integer not null default 1,
  configuracion jsonb not null default '{}'::jsonb,
  revision_admin_estado text not null default 'pendiente',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  unique (tenant_id, codigo_ot),
  foreign key (tenant_id, cliente_id) references public.clientes(tenant_id, id),
  foreign key (tenant_id, instalacion_id) references public.instalaciones(tenant_id, id),
  foreign key (tenant_id, ubicacion_id) references public.ubicaciones(tenant_id, id),
  foreign key (tenant_id, activo_id) references public.activos(tenant_id, id)
);

create table if not exists public.ot_visitas (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ot_id uuid not null,
  tecnico_id uuid not null references public.profiles(id),
  estado text not null default 'EN_CURSO' check (estado in ('EN_CURSO', 'FINALIZADA', 'CANCELADA')),
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  trabajo_realizado text,
  diagnostico text,
  pruebas_realizadas text,
  recomendaciones text,
  trabajo_pendiente text,
  motivo_cierre text,
  proxima_accion text,
  estado_final_activo text,
  resultado_cierre text,
  firma_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id, id)
);

create table if not exists public.ot_checklist_respuestas (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ot_id uuid not null,
  plantilla_item_id text,
  orden integer not null default 0,
  punto text,
  titulo text,
  descripcion text,
  obligatorio boolean not null default true,
  requiere_foto boolean not null default false,
  resultado text,
  tipo_respuesta text,
  observaciones text,
  created_by uuid references public.profiles(id),
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id, id)
);

create table if not exists public.ot_fotos (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ot_id uuid not null,
  checklist_respuesta_id uuid,
  tipo text not null default 'evidencia' check (tipo in ('inicial', 'final', 'checklist', 'evidencia')),
  bucket text not null default 'ot-photos',
  path text not null,
  filename text,
  mime_type text,
  size_bytes bigint,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id, id),
  foreign key (checklist_respuesta_id) references public.ot_checklist_respuestas(id),
  unique (bucket, path)
);

create table if not exists public.ot_visita_materiales (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ot_id uuid not null,
  visita_id uuid,
  descripcion text not null,
  cantidad numeric(12,3) not null check (cantidad > 0),
  unidad text not null default 'ud',
  referencia text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id, id),
  foreign key (visita_id) references public.ot_visitas(id)
);

create table if not exists public.ot_firmas (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ot_id uuid not null,
  visita_id uuid,
  tipo text not null check (tipo in ('tecnico', 'responsable')),
  bucket text not null default 'ot-signatures',
  path text not null,
  firmante_nombre text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id, id),
  foreign key (visita_id) references public.ot_visitas(id),
  unique (bucket, path)
);

create table if not exists public.ot_informes (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ot_id uuid not null,
  version integer not null default 1 check (version > 0),
  filename text not null,
  bucket text default 'ot-reports',
  path text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id, id),
  unique (ot_id, version)
);

create table if not exists public.ot_revisiones_admin (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ot_id uuid not null,
  decision text not null check (decision in ('validada', 'correccion_solicitada')),
  notas text not null,
  reviewer_id uuid references public.profiles(id),
  estado_anterior text,
  estado_nuevo text,
  reviewed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id, id)
);

create table if not exists public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Tablas de planificación e histórico requeridas por las migraciones ya existentes.
create table if not exists public.planes_mantenimiento (
  id uuid primary key default extensions.gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
  instalacion_id uuid not null, ubicacion_id uuid, activo_id uuid not null, titulo text not null, nombre text,
  descripcion text, instrucciones text, tipo text not null default 'mantenimiento_preventivo', prioridad text default 'normal',
  periodicidad_valor integer not null default 1, periodicidad_unidad text not null default 'mes',
  fecha_inicio date, fecha_proxima_realizacion date, fecha_ultima_realizacion date, dias_aviso integer not null default 30, tolerancia_dias integer not null default 0, activo boolean not null default true, responsable_id uuid references public.profiles(id), assigned_to uuid references public.profiles(id),
  estado text not null default 'activo', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (tenant_id, id), foreign key (tenant_id, instalacion_id) references public.instalaciones(tenant_id,id), foreign key (tenant_id, activo_id) references public.activos(tenant_id,id)
);
create table if not exists public.mantenimientos_programados (
  id uuid primary key default extensions.gen_random_uuid(), tenant_id uuid not null references public.tenants(id), plan_id uuid,
  instalacion_id uuid not null, ubicacion_id uuid, activo_id uuid not null, ot_id uuid, titulo text not null, descripcion text,
  tipo text not null, estado text not null default 'proximo', prioridad text, fecha_programada date, fecha_limite date,
  assigned_to uuid references public.profiles(id), origen text, completed_at timestamptz, cancelled_at timestamptz, motivo_cancelacion text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (tenant_id,id), foreign key (tenant_id, plan_id) references public.planes_mantenimiento(tenant_id,id), foreign key (tenant_id, instalacion_id) references public.instalaciones(tenant_id,id), foreign key (tenant_id, activo_id) references public.activos(tenant_id,id), foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id,id)
);
create table if not exists public.historial_mantenimiento (
  id uuid primary key default extensions.gen_random_uuid(), tenant_id uuid not null references public.tenants(id), activo_id uuid not null,
  mantenimiento_programado_id uuid, plan_id uuid, ot_id uuid, fecha date not null, tipo text, titulo text not null, descripcion text, tecnico_id uuid references public.profiles(id), estado_final text, proxima_accion text, origen text, fecha_inicio timestamptz, fecha_fin timestamptz, trabajo_previsto text, trabajo_realizado text, resultado text, estado_activo_final text, proxima_fecha date, observaciones text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), deleted_at timestamptz,
  unique (tenant_id,id), foreign key (tenant_id, activo_id) references public.activos(tenant_id,id), foreign key (tenant_id, ot_id) references public.ordenes_trabajo(tenant_id,id)
);

create index if not exists idx_tenant_members_tenant_user on public.tenant_members(tenant_id, user_id) where estado = 'activo';
create index if not exists idx_installations_tenant_client on public.instalaciones(tenant_id, cliente_id) where deleted_at is null;
create index if not exists idx_assets_tenant_installation on public.activos(tenant_id, instalacion_id) where deleted_at is null;
create index if not exists idx_orders_tenant_status_dates on public.ordenes_trabajo(tenant_id, estado, fecha_prevista, fecha_limite) where deleted_at is null;
create index if not exists idx_orders_assigned on public.ordenes_trabajo(tenant_id, assigned_to) where deleted_at is null;
create index if not exists idx_visits_tenant_order on public.ot_visitas(tenant_id, ot_id);
create index if not exists idx_audit_tenant_created on public.audit_logs(tenant_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id,nombre,email) values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(coalesce(new.email,''),'@',1)), new.email) on conflict (id) do update set email = excluded.email, updated_at = now(); return new; end; $$;
revoke all on function public.handle_new_user() from public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_super_admin() returns boolean language sql stable security definer set search_path = public as $$ select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false); $$;
create or replace function public.has_tenant_role(tenant_uuid uuid, required_role text) returns boolean language sql stable security definer set search_path = public as $$ select public.is_super_admin() or exists (select 1 from public.tenant_members where tenant_id = tenant_uuid and user_id = auth.uid() and estado = 'activo' and role = required_role); $$;
create or replace function public.has_tenant_access(tenant_uuid uuid) returns boolean language sql stable security definer set search_path = public as $$ select public.is_super_admin() or exists (select 1 from public.tenant_members where tenant_id = tenant_uuid and user_id = auth.uid() and estado = 'activo'); $$;
create or replace function public.can_manage_work_orders(tenant_uuid uuid) returns boolean language sql stable security definer set search_path = public as $$ select public.is_super_admin() or exists (select 1 from public.tenant_members where tenant_id = tenant_uuid and user_id = auth.uid() and estado = 'activo' and role in ('admin_cliente','coordinador')); $$;
create or replace function public.can_execute_work_order(tenant_uuid uuid, work_order_uuid uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.ordenes_trabajo ot join public.tenant_members tm on tm.tenant_id = ot.tenant_id and tm.user_id = auth.uid() and tm.estado = 'activo' and tm.role in ('tecnico','tecnico_externo') where ot.id = work_order_uuid and ot.tenant_id = tenant_uuid and ot.assigned_to = auth.uid() and ot.deleted_at is null); $$;
create or replace function public.can_access_work_order(work_order_uuid uuid, operation text default 'select') returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.ordenes_trabajo ot left join public.tenant_members tm on tm.tenant_id = ot.tenant_id and tm.user_id = auth.uid() and tm.estado = 'activo' where ot.id = work_order_uuid and (public.can_manage_work_orders(ot.tenant_id) or (tm.role in ('tecnico','tecnico_externo') and ot.assigned_to = auth.uid()) or (tm.role = 'cliente_lectura' and tm.cliente_id = ot.cliente_id))); $$;
create or replace function public.is_work_order_mutable(work_order_uuid uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.ordenes_trabajo where id = work_order_uuid and estado not in ('VALIDADA','CANCELADA') and deleted_at is null); $$;
create or replace function public.log_audit(tenant_uuid uuid, action_text text, entity_type_text text, entity_uuid uuid, metadata_json jsonb default '{}'::jsonb) returns void language plpgsql security invoker set search_path = public as $$ begin if not public.has_tenant_access(tenant_uuid) then raise exception 'Sin acceso al tenant para auditoría'; end if; insert into public.audit_logs(tenant_id,user_id,action,entity_type,entity_id,metadata) values (tenant_uuid,auth.uid(),action_text,entity_type_text,entity_uuid,coalesce(metadata_json,'{}'::jsonb)); end; $$;

create or replace function public.create_tenant_invitation(tenant_uuid uuid, invite_email text, invite_role text, require_mfa boolean default false, invite_name text default null) returns table(invitation_token uuid) language plpgsql security definer set search_path = public as $$ declare token uuid; begin if auth.uid() is null or not public.has_tenant_role(tenant_uuid,'admin_cliente') then raise exception 'No tienes permiso para invitar usuarios'; end if; if lower(trim(invite_email)) = '' or invite_role not in ('admin_cliente','coordinador','tecnico','tecnico_externo','cliente_lectura') then raise exception 'Invitación no válida'; end if; insert into public.tenant_invitations(tenant_id,nombre,email,role,require_mfa,created_by) values(tenant_uuid,nullif(trim(invite_name),''),lower(trim(invite_email)),invite_role,coalesce(require_mfa,false),auth.uid()) returning tenant_invitations.invitation_token into token; perform public.log_audit(tenant_uuid,'create_tenant_invitation','tenant_invitations',null,jsonb_build_object('email',lower(trim(invite_email)),'role',invite_role)); return query select token; end; $$;
create or replace function public.accept_tenant_invitation(invitation_token uuid) returns void language plpgsql security definer set search_path = public as $$ declare invitation public.tenant_invitations; profile_email text; begin if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if; select * into invitation from public.tenant_invitations where tenant_invitations.invitation_token = accept_tenant_invitation.invitation_token for update; if invitation.id is null or invitation.estado <> 'pendiente' or invitation.expires_at <= now() then raise exception 'La invitación no está disponible'; end if; select email into profile_email from public.profiles where id = auth.uid(); if lower(coalesce(profile_email,'')) <> lower(invitation.email) then raise exception 'La invitación pertenece a otro correo'; end if; insert into public.tenant_members(tenant_id,user_id,cliente_id,role,estado) values(invitation.tenant_id,auth.uid(),invitation.cliente_id,invitation.role,'activo') on conflict(tenant_id,user_id) do update set role=excluded.role,cliente_id=excluded.cliente_id,estado='activo',updated_at=now(); update public.tenant_invitations set estado='aceptada',accepted_at=now(),accepted_by=auth.uid(),updated_at=now() where id=invitation.id; perform public.log_audit(invitation.tenant_id,'accept_tenant_invitation','tenant_invitations',invitation.id,jsonb_build_object('role',invitation.role)); end; $$;

alter table public.profiles enable row level security; alter table public.tenants enable row level security; alter table public.tenant_members enable row level security; alter table public.tenant_invitations enable row level security; alter table public.clientes enable row level security; alter table public.instalaciones enable row level security; alter table public.ubicaciones enable row level security; alter table public.activos enable row level security; alter table public.ordenes_trabajo enable row level security; alter table public.ot_visitas enable row level security; alter table public.ot_checklist_respuestas enable row level security; alter table public.ot_fotos enable row level security; alter table public.ot_visita_materiales enable row level security; alter table public.ot_firmas enable row level security; alter table public.ot_informes enable row level security; alter table public.ot_revisiones_admin enable row level security; alter table public.audit_logs enable row level security; alter table public.planes_mantenimiento enable row level security; alter table public.mantenimientos_programados enable row level security; alter table public.historial_mantenimiento enable row level security;

create policy profiles_self_or_tenant_manager on public.profiles for select to authenticated using (id = auth.uid() or exists(select 1 from public.tenant_members tm where tm.user_id = profiles.id and public.can_manage_work_orders(tm.tenant_id)));
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and is_super_admin = (select is_super_admin from public.profiles where id = auth.uid()));
create policy tenants_read on public.tenants for select to authenticated using (public.has_tenant_access(id));
create policy tenant_members_read on public.tenant_members for select to authenticated using (user_id = auth.uid() or public.can_manage_work_orders(tenant_id));
create policy tenant_members_manage on public.tenant_members for all to authenticated using (public.can_manage_work_orders(tenant_id)) with check (public.can_manage_work_orders(tenant_id));
create policy tenant_invitations_manage on public.tenant_invitations for all to authenticated using (public.has_tenant_role(tenant_id,'admin_cliente')) with check (public.has_tenant_role(tenant_id,'admin_cliente'));
create policy clientes_read on public.clientes for select to authenticated using (public.has_tenant_access(tenant_id));
create policy clientes_manage on public.clientes for all to authenticated using (public.can_manage_work_orders(tenant_id)) with check (public.can_manage_work_orders(tenant_id));
create policy installations_read on public.instalaciones for select to authenticated using (public.has_tenant_access(tenant_id));
create policy installations_manage on public.instalaciones for all to authenticated using (public.can_manage_work_orders(tenant_id)) with check (public.can_manage_work_orders(tenant_id));
create policy locations_read on public.ubicaciones for select to authenticated using (public.has_tenant_access(tenant_id));
create policy locations_manage on public.ubicaciones for all to authenticated using (public.can_manage_work_orders(tenant_id)) with check (public.can_manage_work_orders(tenant_id));
create policy assets_read on public.activos for select to authenticated using (public.has_tenant_access(tenant_id));
create policy assets_manage on public.activos for all to authenticated using (public.can_manage_work_orders(tenant_id)) with check (public.can_manage_work_orders(tenant_id));
create policy orders_read on public.ordenes_trabajo for select to authenticated using (public.can_access_work_order(id));
create policy orders_create on public.ordenes_trabajo for insert to authenticated with check (public.can_manage_work_orders(tenant_id));
create policy orders_update on public.ordenes_trabajo for update to authenticated using (public.can_manage_work_orders(tenant_id) or public.can_execute_work_order(tenant_id,id)) with check (public.can_manage_work_orders(tenant_id) or public.can_execute_work_order(tenant_id,id));
create policy evidence_read on public.ot_visitas for select to authenticated using (public.can_access_work_order(ot_id));
create policy evidence_write on public.ot_visitas for all to authenticated using (public.can_manage_work_orders(tenant_id) or public.can_execute_work_order(tenant_id,ot_id)) with check (public.can_manage_work_orders(tenant_id) or (public.can_execute_work_order(tenant_id,ot_id) and public.is_work_order_mutable(ot_id)));
create policy checklist_read on public.ot_checklist_respuestas for select to authenticated using (public.can_access_work_order(ot_id));
create policy checklist_write on public.ot_checklist_respuestas for all to authenticated using (public.can_manage_work_orders(tenant_id) or public.can_execute_work_order(tenant_id,ot_id)) with check (public.can_manage_work_orders(tenant_id) or (public.can_execute_work_order(tenant_id,ot_id) and public.is_work_order_mutable(ot_id)));
create policy photos_read on public.ot_fotos for select to authenticated using (public.can_access_work_order(ot_id));
create policy photos_write on public.ot_fotos for all to authenticated using (public.can_manage_work_orders(tenant_id) or public.can_execute_work_order(tenant_id,ot_id)) with check (public.can_manage_work_orders(tenant_id) or (public.can_execute_work_order(tenant_id,ot_id) and public.is_work_order_mutable(ot_id)));
create policy materials_read on public.ot_visita_materiales for select to authenticated using (public.can_access_work_order(ot_id));
create policy materials_write on public.ot_visita_materiales for all to authenticated using (public.can_manage_work_orders(tenant_id) or public.can_execute_work_order(tenant_id,ot_id)) with check (public.can_manage_work_orders(tenant_id) or (public.can_execute_work_order(tenant_id,ot_id) and public.is_work_order_mutable(ot_id)));
create policy signatures_read on public.ot_firmas for select to authenticated using (public.can_access_work_order(ot_id));
create policy signatures_write on public.ot_firmas for all to authenticated using (public.can_manage_work_orders(tenant_id) or public.can_execute_work_order(tenant_id,ot_id)) with check (public.can_manage_work_orders(tenant_id) or (public.can_execute_work_order(tenant_id,ot_id) and public.is_work_order_mutable(ot_id)));
create policy reports_read on public.ot_informes for select to authenticated using (public.can_access_work_order(ot_id));
create policy reports_write on public.ot_informes for all to authenticated using (public.can_manage_work_orders(tenant_id) or public.can_execute_work_order(tenant_id,ot_id)) with check (public.can_manage_work_orders(tenant_id) or (public.can_execute_work_order(tenant_id,ot_id) and public.is_work_order_mutable(ot_id)));
create policy reviews_read on public.ot_revisiones_admin for select to authenticated using (public.can_manage_work_orders(tenant_id));
create policy reviews_write on public.ot_revisiones_admin for all to authenticated using (public.can_manage_work_orders(tenant_id)) with check (public.can_manage_work_orders(tenant_id));
create policy audit_read on public.audit_logs for select to authenticated using (public.can_manage_work_orders(tenant_id));
create policy audit_write_by_manager on public.audit_logs for insert to authenticated with check (public.can_manage_work_orders(tenant_id));
create policy planning_read on public.planes_mantenimiento for select to authenticated using (public.has_tenant_access(tenant_id));
create policy planning_manage on public.planes_mantenimiento for all to authenticated using (public.can_manage_work_orders(tenant_id)) with check (public.can_manage_work_orders(tenant_id));
create policy scheduled_read on public.mantenimientos_programados for select to authenticated using (public.has_tenant_access(tenant_id));
create policy scheduled_manage on public.mantenimientos_programados for all to authenticated using (public.can_manage_work_orders(tenant_id)) with check (public.can_manage_work_orders(tenant_id));
create policy history_read on public.historial_mantenimiento for select to authenticated using (public.has_tenant_access(tenant_id));

grant select, insert, update, delete on public.profiles, public.tenants, public.tenant_members, public.tenant_invitations, public.clientes, public.instalaciones, public.ubicaciones, public.activos, public.ordenes_trabajo, public.ot_visitas, public.ot_checklist_respuestas, public.ot_fotos, public.ot_visita_materiales, public.ot_firmas, public.ot_informes, public.ot_revisiones_admin, public.audit_logs, public.planes_mantenimiento, public.mantenimientos_programados, public.historial_mantenimiento to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('ot-photos','ot-photos',false,52428800,array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('ot-signatures','ot-signatures',false,5242880,array['image/png','image/jpeg']) on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('ot-reports','ot-reports',false,52428800,array['application/pdf']) on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit;

create or replace function public.can_access_work_order_storage(bucket_name text, object_name text, write_access boolean default false) returns boolean language plpgsql stable security definer set search_path = public, storage as $$ declare tenant_uuid uuid; order_uuid uuid; expected_type text; begin tenant_uuid := split_part(object_name,'/',1)::uuid; order_uuid := split_part(object_name,'/',2)::uuid; expected_type := split_part(object_name,'/',3); if split_part(object_name,'/',4) = '' or expected_type not in ('foto','firma','informe') then return false; end if; if (bucket_name = 'ot-photos' and expected_type <> 'foto') or (bucket_name = 'ot-signatures' and expected_type <> 'firma') or (bucket_name = 'ot-reports' and expected_type <> 'informe') then return false; end if; return exists(select 1 from public.ordenes_trabajo ot where ot.id=order_uuid and ot.tenant_id=tenant_uuid and (public.can_manage_work_orders(tenant_uuid) or (not write_access and public.can_access_work_order(order_uuid)) or (write_access and public.can_execute_work_order(tenant_uuid,order_uuid) and public.is_work_order_mutable(order_uuid)))); exception when invalid_text_representation then return false; end; $$;
create policy ot_storage_read on storage.objects for select to authenticated using (bucket_id in ('ot-photos','ot-signatures','ot-reports') and public.can_access_work_order_storage(bucket_id,name,false));
create policy ot_storage_insert on storage.objects for insert to authenticated with check (bucket_id in ('ot-photos','ot-signatures','ot-reports') and public.can_access_work_order_storage(bucket_id,name,true) and coalesce((metadata->>'size')::bigint,0) <= 52428800);
create policy ot_storage_update on storage.objects for update to authenticated using (bucket_id in ('ot-photos','ot-signatures','ot-reports') and public.can_access_work_order_storage(bucket_id,name,true)) with check (bucket_id in ('ot-photos','ot-signatures','ot-reports') and public.can_access_work_order_storage(bucket_id,name,true));
create policy ot_storage_delete on storage.objects for delete to authenticated using (bucket_id in ('ot-photos','ot-signatures','ot-reports') and public.can_access_work_order_storage(bucket_id,name,true));

revoke all on function public.is_super_admin() from public;
revoke all on function public.has_tenant_role(uuid,text) from public;
revoke all on function public.has_tenant_access(uuid) from public;
revoke all on function public.can_manage_work_orders(uuid) from public;
revoke all on function public.can_execute_work_order(uuid,uuid) from public;
revoke all on function public.can_access_work_order(uuid,text) from public;
revoke all on function public.is_work_order_mutable(uuid) from public;
revoke all on function public.log_audit(uuid,text,text,uuid,jsonb) from public;
revoke all on function public.create_tenant_invitation(uuid,text,text,boolean,text) from public, anon;
revoke all on function public.accept_tenant_invitation(uuid) from public, anon;
grant execute on function public.create_tenant_invitation(uuid,text,text,boolean,text) to authenticated;
grant execute on function public.accept_tenant_invitation(uuid) to authenticated;
grant execute on function public.is_super_admin(), public.has_tenant_role(uuid,text), public.has_tenant_access(uuid), public.can_manage_work_orders(uuid), public.can_execute_work_order(uuid,uuid), public.can_access_work_order(uuid,text), public.is_work_order_mutable(uuid), public.log_audit(uuid,text,text,uuid,jsonb) to authenticated;
