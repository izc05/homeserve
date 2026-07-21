alter table public.profiles
  add column if not exists telefono text null;

alter table public.tenant_members
  add column if not exists especialidad text null;

alter table public.tenant_invitations
  add column if not exists telefono text null,
  add column if not exists especialidad text null;

create or replace function public.create_tenant_invitation_with_details(
  tenant_uuid uuid,
  invite_email text,
  invite_role text,
  require_mfa boolean default false,
  invite_name text default null,
  invite_phone text default null,
  invite_specialty text default null
)
returns table(invitation_token uuid)
language plpgsql
security definer
set search_path = public
as $function$
declare
  token uuid;
  normalized_email text;
  normalized_name text;
  normalized_phone text;
  normalized_specialty text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if not public.has_tenant_role(tenant_uuid, 'admin_cliente') then
    raise exception 'No tienes permiso para invitar usuarios';
  end if;

  normalized_email := lower(btrim(coalesce(invite_email, '')));
  normalized_name := nullif(btrim(coalesce(invite_name, '')), '');
  normalized_phone := nullif(btrim(coalesce(invite_phone, '')), '');
  normalized_specialty := nullif(btrim(coalesce(invite_specialty, '')), '');

  if normalized_email = '' or invite_role not in ('admin_cliente', 'coordinador', 'tecnico', 'tecnico_externo', 'cliente_lectura') then
    raise exception 'Invitación no válida';
  end if;

  insert into public.tenant_invitations (
    tenant_id,
    nombre,
    email,
    role,
    require_mfa,
    telefono,
    especialidad,
    created_by
  ) values (
    tenant_uuid,
    normalized_name,
    normalized_email,
    invite_role,
    coalesce(require_mfa, false),
    normalized_phone,
    normalized_specialty,
    auth.uid()
  )
  returning public.tenant_invitations.invitation_token into token;

  perform public.log_audit(
    tenant_uuid,
    'create_tenant_invitation',
    'tenant_invitations',
    null,
    jsonb_build_object('email', normalized_email, 'role', invite_role)
  );

  return query select token;
end;
$function$;

create or replace function public.accept_tenant_invitation(invitation_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  invitation public.tenant_invitations;
  profile_email text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select *
    into invitation
  from public.tenant_invitations
  where tenant_invitations.invitation_token = accept_tenant_invitation.invitation_token
  for update;

  if invitation.id is null or invitation.estado <> 'pendiente' or invitation.expires_at <= now() then
    raise exception 'La invitación no está disponible';
  end if;

  select email
    into profile_email
  from public.profiles
  where id = auth.uid();

  if lower(coalesce(profile_email, '')) <> lower(invitation.email) then
    raise exception 'La invitación pertenece a otro correo';
  end if;

  update public.profiles
  set telefono = coalesce(invitation.telefono, profiles.telefono),
      updated_at = now()
  where id = auth.uid();

  insert into public.tenant_members (tenant_id, user_id, cliente_id, role, estado, especialidad)
  values (
    invitation.tenant_id,
    auth.uid(),
    invitation.cliente_id,
    invitation.role,
    'activo',
    invitation.especialidad
  )
  on conflict (tenant_id, user_id) do update
  set role = excluded.role,
      cliente_id = excluded.cliente_id,
      estado = 'activo',
      especialidad = coalesce(excluded.especialidad, public.tenant_members.especialidad),
      updated_at = now();

  update public.tenant_invitations
  set estado = 'aceptada',
      accepted_at = now(),
      accepted_by = auth.uid(),
      updated_at = now()
  where id = invitation.id;

  perform public.log_audit(
    invitation.tenant_id,
    'accept_tenant_invitation',
    'tenant_invitations',
    invitation.id,
    jsonb_build_object('role', invitation.role)
  );
end;
$function$;

revoke all on function public.create_tenant_invitation_with_details(uuid, text, text, boolean, text, text, text) from public, anon;
revoke all on function public.accept_tenant_invitation(uuid) from public, anon;

grant execute on function public.create_tenant_invitation_with_details(uuid, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.accept_tenant_invitation(uuid) to authenticated;
