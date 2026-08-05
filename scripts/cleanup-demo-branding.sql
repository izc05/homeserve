-- Limpieza controlada de referencias demo residuales.
-- NO ejecutar sin copia de seguridad y revisión del PR.
-- Uso de previsualización (hace ROLLBACK):
--   psql "$DATABASE_URL" -v tenant_id='UUID-TENANT-DEMO' -f scripts/cleanup-demo-branding.sql
-- Aplicación explícita:
--   psql "$DATABASE_URL" -v tenant_id='UUID-TENANT-DEMO' -v apply=true -f scripts/cleanup-demo-branding.sql
--
-- No modifica slug, branding_key, tenant_id, user_id, relaciones ni audit_logs.

\set ON_ERROR_STOP on
\if :{?tenant_id}
\else
  \echo 'ERROR: indica -v tenant_id=UUID-TENANT-DEMO'
  \quit
\endif

\if :{?apply}
\else
  \set apply false
\endif

begin;

\echo '--- Valores exactos que se modificarían ---'
select 'tenants.nombre' as origen, id::text as registro, nombre as valor_actual
from public.tenants
where id = :'tenant_id'::uuid
  and nombre in ('HomeServe', 'Demo HomeServe', 'Administración Demo HomeServe');

select 'profiles.nombre' as origen, profile.id::text as registro, profile.nombre as valor_actual
from public.profiles profile
join public.tenant_members member on member.user_id = profile.id
where member.tenant_id = :'tenant_id'::uuid
  and profile.nombre in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe');

select 'tenant_invitations.nombre' as origen, invitation.id::text as registro, invitation.nombre as valor_actual
from public.tenant_invitations invitation
where invitation.tenant_id = :'tenant_id'::uuid
  and invitation.nombre in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe');

select 'clientes.contacto_nombre' as origen, client.id::text as registro, client.contacto_nombre as valor_actual
from public.clientes client
where client.tenant_id = :'tenant_id'::uuid
  and client.contacto_nombre in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe');

select 'instalaciones.contacto_nombre' as origen, installation.id::text as registro, installation.contacto_nombre as valor_actual
from public.instalaciones installation
where installation.tenant_id = :'tenant_id'::uuid
  and installation.contacto_nombre in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe');

update public.tenants
set nombre = case nombre
  when 'HomeServe' then 'IsiVoltPro'
  when 'Demo HomeServe' then 'Demo IsiVoltPro'
  when 'Administración Demo HomeServe' then 'Administración Demo IsiVoltPro'
  else nombre
end,
updated_at = now()
where id = :'tenant_id'::uuid
  and nombre in ('HomeServe', 'Demo HomeServe', 'Administración Demo HomeServe');

update public.profiles profile
set nombre = case profile.nombre
  when 'Administración Demo HomeServe' then 'Administración Demo IsiVoltPro'
  when 'Técnico Demo HomeServe' then 'Técnico Demo IsiVoltPro'
  when 'HomeServe' then 'IsiVoltPro'
  else profile.nombre
end,
updated_at = now()
from public.tenant_members member
where member.user_id = profile.id
  and member.tenant_id = :'tenant_id'::uuid
  and profile.nombre in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe');

update auth.users auth_user
set raw_user_meta_data = coalesce(auth_user.raw_user_meta_data, '{}'::jsonb)
  || jsonb_strip_nulls(jsonb_build_object(
    'nombre', case auth_user.raw_user_meta_data ->> 'nombre'
      when 'Administración Demo HomeServe' then 'Administración Demo IsiVoltPro'
      when 'Técnico Demo HomeServe' then 'Técnico Demo IsiVoltPro'
      when 'HomeServe' then 'IsiVoltPro'
      else null
    end,
    'name', case auth_user.raw_user_meta_data ->> 'name'
      when 'Administración Demo HomeServe' then 'Administración Demo IsiVoltPro'
      when 'Técnico Demo HomeServe' then 'Técnico Demo IsiVoltPro'
      when 'HomeServe' then 'IsiVoltPro'
      else null
    end,
    'full_name', case auth_user.raw_user_meta_data ->> 'full_name'
      when 'Administración Demo HomeServe' then 'Administración Demo IsiVoltPro'
      when 'Técnico Demo HomeServe' then 'Técnico Demo IsiVoltPro'
      when 'HomeServe' then 'IsiVoltPro'
      else null
    end
  )),
updated_at = now()
where auth_user.id in (
  select member.user_id
  from public.tenant_members member
  where member.tenant_id = :'tenant_id'::uuid
)
and (
  auth_user.raw_user_meta_data ->> 'nombre' in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe')
  or auth_user.raw_user_meta_data ->> 'name' in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe')
  or auth_user.raw_user_meta_data ->> 'full_name' in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe')
);

update public.tenant_invitations
set nombre = case nombre
  when 'Administración Demo HomeServe' then 'Administración Demo IsiVoltPro'
  when 'Técnico Demo HomeServe' then 'Técnico Demo IsiVoltPro'
  when 'HomeServe' then 'IsiVoltPro'
  else nombre
end,
updated_at = now()
where tenant_id = :'tenant_id'::uuid
  and nombre in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe');

update public.clientes
set contacto_nombre = case contacto_nombre
  when 'Administración Demo HomeServe' then 'Administración Demo IsiVoltPro'
  when 'Técnico Demo HomeServe' then 'Técnico Demo IsiVoltPro'
  when 'HomeServe' then 'IsiVoltPro'
  else contacto_nombre
end,
updated_at = now()
where tenant_id = :'tenant_id'::uuid
  and contacto_nombre in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe');

update public.instalaciones
set contacto_nombre = case contacto_nombre
  when 'Administración Demo HomeServe' then 'Administración Demo IsiVoltPro'
  when 'Técnico Demo HomeServe' then 'Técnico Demo IsiVoltPro'
  when 'HomeServe' then 'IsiVoltPro'
  else contacto_nombre
end,
updated_at = now()
where tenant_id = :'tenant_id'::uuid
  and contacto_nombre in ('Administración Demo HomeServe', 'Técnico Demo HomeServe', 'HomeServe');

\echo '--- Resultado dentro de la transacción ---'
select profile.id, profile.nombre
from public.profiles profile
join public.tenant_members member on member.user_id = profile.id
where member.tenant_id = :'tenant_id'::uuid
order by profile.nombre;

\if :apply
  commit;
  \echo 'CAMBIOS APLICADOS. Conserva la copia de seguridad para rollback.'
\else
  rollback;
  \echo 'PREVISUALIZACIÓN: se ha ejecutado ROLLBACK. Usa -v apply=true tras revisar.'
\endif
