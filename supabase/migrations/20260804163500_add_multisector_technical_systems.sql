-- IsiVoltPro OT: foundation for multi-sector installations.
-- Photovoltaics remains one specialty among the complete technical catalog.

create table public.especialidades_tecnicas (
  clave text primary key,
  nombre text not null,
  grupo text not null default 'general',
  descripcion text,
  orden integer not null default 100,
  estado text not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint especialidades_tecnicas_clave_check
    check (clave = lower(clave) and clave ~ '^[a-z0-9_]{2,60}$'),
  constraint especialidades_tecnicas_nombre_check
    check (char_length(trim(nombre)) between 2 and 120),
  constraint especialidades_tecnicas_estado_check
    check (estado in ('activo', 'inactivo'))
);

insert into public.especialidades_tecnicas (clave, nombre, grupo, descripcion, orden)
values
  ('general', 'General / multidisciplinar', 'general', 'Trabajos que no requieren una especialidad única o todavía no han sido clasificados.', 10),
  ('electricidad_bt', 'Electricidad de baja tensión', 'electricidad', 'Cuadros, líneas, alumbrado, receptores, tierras y protecciones de baja tensión.', 20),
  ('electricidad_mt_at', 'Media y alta tensión', 'electricidad', 'Centros de transformación, celdas, protecciones y redes de media o alta tensión.', 30),
  ('fotovoltaica', 'Energía solar fotovoltaica', 'energia', 'Módulos, inversores, protecciones, baterías y monitorización fotovoltaica.', 40),
  ('grupos_sai', 'Grupos electrógenos y SAI', 'energia', 'Generación de emergencia, UPS/SAI, baterías y conmutaciones.', 50),
  ('climatizacion', 'Climatización y ventilación', 'hvac', 'Producción térmica, UTA, climatizadores, fan-coils, conductos y ventilación.', 60),
  ('refrigeracion', 'Refrigeración', 'hvac', 'Cámaras, centrales frigoríficas, circuitos y equipos de refrigeración.', 70),
  ('fontaneria_saneamiento', 'Fontanería y saneamiento', 'hidraulica', 'Abastecimiento, evacuación, bombeos, aparatos y redes hidráulicas.', 80),
  ('acs_legionella', 'ACS y prevención de Legionella', 'hidraulica', 'Producción y distribución de ACS, retornos, puntos terminales y controles sanitarios.', 90),
  ('pci', 'Protección contra incendios', 'seguridad', 'Detección, extinción, BIE, rociadores, grupos PCI y control de humos.', 100),
  ('gases_medicinales', 'Gases medicinales', 'hospitalario', 'Centrales, redes, tomas, alarmas y equipamiento de gases medicinales.', 110),
  ('electromedicina', 'Electromedicina', 'hospitalario', 'Equipos electromédicos y sistemas asociados a la actividad asistencial.', 120),
  ('ascensores', 'Ascensores y elevación', 'transporte', 'Ascensores, montacargas, plataformas y sistemas de elevación.', 130),
  ('telecomunicaciones', 'Telecomunicaciones y datos', 'comunicaciones', 'Cableado estructurado, redes, telefonía, televisión y comunicaciones.', 140),
  ('seguridad_control', 'Seguridad y control de accesos', 'seguridad', 'CCTV, intrusión, interfonía, control de accesos y cerramientos automáticos.', 150),
  ('automatizacion_control', 'Automatización y control', 'control', 'BMS, PLC, instrumentación, regulación y supervisión.', 160),
  ('aire_comprimido', 'Aire comprimido', 'industrial', 'Compresores, secadores, depósitos y redes de aire comprimido.', 170),
  ('vapor', 'Vapor y fluidos térmicos', 'industrial', 'Calderas, vapor, condensados y redes de fluidos térmicos.', 180),
  ('obra_civil', 'Obra civil y edificación', 'infraestructura', 'Estructuras, cerramientos, cubiertas, albañilería y acabados.', 190),
  ('eficiencia_energetica', 'Eficiencia energética', 'energia', 'Medición, optimización, contadores y actuaciones de ahorro energético.', 200),
  ('otra', 'Otra especialidad', 'general', 'Especialidad pendiente de incorporar al catálogo normalizado.', 999)
on conflict (clave) do update set
  nombre = excluded.nombre,
  grupo = excluded.grupo,
  descripcion = excluded.descripcion,
  orden = excluded.orden,
  estado = 'activo',
  updated_at = now();

alter table public.especialidades_tecnicas enable row level security;

grant select on public.especialidades_tecnicas to authenticated;

create policy especialidades_tecnicas_read
on public.especialidades_tecnicas
for select
to authenticated
using (estado = 'activo');

create trigger especialidades_tecnicas_set_updated_at
before update on public.especialidades_tecnicas
for each row execute function public.set_updated_at();

alter table public.instalaciones
  add column sector text not null default 'general',
  add column uso_principal text,
  add column nivel_riesgo text not null default 'medio',
  add constraint instalaciones_nivel_riesgo_check
    check (nivel_riesgo in ('bajo', 'medio', 'alto', 'critico'));

create table public.sistemas_instalacion (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  instalacion_id uuid not null,
  especialidad_clave text not null default 'general'
    references public.especialidades_tecnicas(clave) on update cascade on delete restrict,
  nombre text not null,
  codigo text,
  descripcion text,
  normativa_aplicable text[] not null default '{}'::text[],
  criticidad text not null default 'media',
  estado text not null default 'activo',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint sistemas_instalacion_tenant_id_id_key unique (tenant_id, id),
  constraint sistemas_instalacion_tenant_id_instalacion_id_fkey
    foreign key (tenant_id, instalacion_id)
    references public.instalaciones(tenant_id, id) on delete cascade,
  constraint sistemas_instalacion_nombre_check
    check (char_length(trim(nombre)) between 2 and 180),
  constraint sistemas_instalacion_criticidad_check
    check (criticidad in ('baja', 'media', 'alta', 'critica')),
  constraint sistemas_instalacion_estado_check
    check (estado in ('activo', 'fuera_servicio', 'inactivo'))
);

create unique index sistemas_instalacion_codigo_activo_uq
on public.sistemas_instalacion (tenant_id, instalacion_id, lower(codigo))
where codigo is not null and deleted_at is null;

create index sistemas_instalacion_instalacion_idx
on public.sistemas_instalacion (tenant_id, instalacion_id, especialidad_clave)
where deleted_at is null;

alter table public.sistemas_instalacion enable row level security;

grant select, insert, update, delete on public.sistemas_instalacion to authenticated;

create policy installation_systems_read
on public.sistemas_instalacion
for select
to authenticated
using (public.has_tenant_access(tenant_id));

create policy installation_systems_manage
on public.sistemas_instalacion
for all
to authenticated
using (public.can_manage_work_orders(tenant_id))
with check (public.can_manage_work_orders(tenant_id));

create trigger sistemas_instalacion_set_updated_at
before update on public.sistemas_instalacion
for each row execute function public.set_updated_at();

-- Every existing installation receives a neutral system, preserving all current data.
insert into public.sistemas_instalacion (
  tenant_id,
  instalacion_id,
  especialidad_clave,
  nombre,
  codigo,
  descripcion,
  criticidad,
  estado,
  created_by
)
select
  i.tenant_id,
  i.id,
  'general',
  'Sistema general',
  'GENERAL',
  'Sistema creado automáticamente al activar la clasificación multisector.',
  'media',
  'activo',
  i.created_by
from public.instalaciones i
where i.deleted_at is null
  and not exists (
    select 1
    from public.sistemas_instalacion s
    where s.tenant_id = i.tenant_id
      and s.instalacion_id = i.id
      and s.codigo = 'GENERAL'
      and s.deleted_at is null
  );

alter table public.activos
  add column sistema_id uuid,
  add column datos_tecnicos jsonb not null default '{}'::jsonb,
  add column normativa_aplicable text[] not null default '{}'::text[],
  add constraint activos_datos_tecnicos_object_check
    check (jsonb_typeof(datos_tecnicos) = 'object'),
  add constraint activos_tenant_id_sistema_id_fkey
    foreign key (tenant_id, sistema_id)
    references public.sistemas_instalacion(tenant_id, id) on delete set null;

update public.activos a
set sistema_id = s.id
from public.sistemas_instalacion s
where s.tenant_id = a.tenant_id
  and s.instalacion_id = a.instalacion_id
  and s.codigo = 'GENERAL'
  and s.deleted_at is null
  and a.sistema_id is null;

create index activos_sistema_idx
on public.activos (tenant_id, sistema_id)
where deleted_at is null;

alter table public.ordenes_trabajo
  add column sistema_id uuid,
  add column especialidad_clave text not null default 'general'
    references public.especialidades_tecnicas(clave) on update cascade on delete restrict,
  add column normativa_aplicable text[] not null default '{}'::text[],
  add constraint ordenes_trabajo_tenant_id_sistema_id_fkey
    foreign key (tenant_id, sistema_id)
    references public.sistemas_instalacion(tenant_id, id) on delete set null;

update public.ordenes_trabajo ot
set sistema_id = s.id
from public.sistemas_instalacion s
where s.tenant_id = ot.tenant_id
  and s.instalacion_id = ot.instalacion_id
  and s.codigo = 'GENERAL'
  and s.deleted_at is null
  and ot.sistema_id is null;

create index ordenes_trabajo_especialidad_idx
on public.ordenes_trabajo (tenant_id, especialidad_clave, estado, fecha_prevista);

create index ordenes_trabajo_sistema_idx
on public.ordenes_trabajo (tenant_id, sistema_id)
where deleted_at is null;

alter table public.checklist_plantillas
  add column especialidad_clave text not null default 'general'
    references public.especialidades_tecnicas(clave) on update cascade on delete restrict;

create index checklist_plantillas_especialidad_idx
on public.checklist_plantillas (tenant_id, especialidad_clave, estado);

create table public.tenant_member_especialidades (
  tenant_id uuid not null,
  user_id uuid not null,
  especialidad_clave text not null
    references public.especialidades_tecnicas(clave) on update cascade on delete restrict,
  nivel text not null default 'competente',
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (tenant_id, user_id, especialidad_clave),
  constraint tenant_member_especialidades_member_fkey
    foreign key (tenant_id, user_id)
    references public.tenant_members(tenant_id, user_id) on delete cascade,
  constraint tenant_member_especialidades_nivel_check
    check (nivel in ('apoyo', 'competente', 'especialista', 'responsable'))
);

create unique index tenant_member_especialidad_principal_uq
on public.tenant_member_especialidades (tenant_id, user_id)
where principal;

alter table public.tenant_member_especialidades enable row level security;

grant select, insert, update, delete on public.tenant_member_especialidades to authenticated;

create policy member_specialties_read
on public.tenant_member_especialidades
for select
to authenticated
using (public.has_tenant_access(tenant_id));

create policy member_specialties_manage
on public.tenant_member_especialidades
for all
to authenticated
using (public.can_manage_work_orders(tenant_id))
with check (public.can_manage_work_orders(tenant_id));

-- Preserve the legacy single-specialty value when it already exists.
insert into public.tenant_member_especialidades (
  tenant_id,
  user_id,
  especialidad_clave,
  nivel,
  principal
)
select
  tm.tenant_id,
  tm.user_id,
  case
    when lower(coalesce(tm.especialidad, '')) like '%foto%' then 'fotovoltaica'
    when lower(coalesce(tm.especialidad, '')) like '%elect%' then 'electricidad_bt'
    when lower(coalesce(tm.especialidad, '')) like '%clima%' then 'climatizacion'
    when lower(coalesce(tm.especialidad, '')) like '%frio%' or lower(coalesce(tm.especialidad, '')) like '%refrig%' then 'refrigeracion'
    when lower(coalesce(tm.especialidad, '')) like '%font%' then 'fontaneria_saneamiento'
    when lower(coalesce(tm.especialidad, '')) like '%pci%' or lower(coalesce(tm.especialidad, '')) like '%incend%' then 'pci'
    else 'general'
  end,
  'competente',
  true
from public.tenant_members tm
where tm.estado = 'activo'
  and tm.role in ('tecnico', 'tecnico_externo')
on conflict (tenant_id, user_id, especialidad_clave) do nothing;
