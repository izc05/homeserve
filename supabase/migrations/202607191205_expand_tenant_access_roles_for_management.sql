create or replace function public.has_tenant_access(tenant_uuid uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.is_super_admin()
    or exists (
      select 1
      from public.tenant_members
      where tenant_id = tenant_uuid
        and user_id = auth.uid()
        and role in ('admin_cliente', 'coordinador', 'tecnico', 'tecnico_externo', 'cliente_lectura')
        and estado = 'activo'
    );
$function$;
