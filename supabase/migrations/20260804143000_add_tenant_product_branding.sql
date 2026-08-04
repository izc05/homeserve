-- Una única aplicación puede presentarse como IsiVoltPro OT o como una demostración de marca.
-- La organización es la autoridad de marca después de iniciar sesión.

alter table public.tenants
  add column if not exists branding_key text not null default 'isivoltpro';

alter table public.tenants
  drop constraint if exists tenants_branding_key_check,
  add constraint tenants_branding_key_check
    check (branding_key in ('isivoltpro', 'homeserve-demo'));

update public.tenants
set branding_key = 'homeserve-demo'
where branding_key = 'isivoltpro'
  and (
    lower(coalesce(slug, '')) like '%homeserve%'
    or lower(nombre) like 'homeserve%'
  );

comment on column public.tenants.branding_key is
  'Identidad visual del mismo producto: isivoltpro o homeserve-demo.';
