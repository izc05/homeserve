import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkOrder } from '../types/workOrder';
import { mapLegacyWorkOrder, type LegacyWorkOrderRow } from './workOrderMapper';

export type WorkOrderListItem = WorkOrder & {
  clientId?: string | null;
  clientName?: string | null;
  siteName: string;
  siteAddress?: string | null;
  siteContactName?: string | null;
  siteContactPhone?: string | null;
  siteContactEmail?: string | null;
  locationName: string | null;
  assignedToName: string | null;
  assetName: string | null;
  assetType: string | null;
  assetReference: string | null;
  assetCriticality: string | null;
  assetStatus: string | null;
};

const WORK_ORDER_COLUMNS = [
  'id',
  'tenant_id',
  'codigo_ot',
  'cliente_id',
  'instalacion_id',
  'ubicacion_id',
  'activo_id',
  'titulo',
  'descripcion',
  'tipo',
  'prioridad',
  'estado',
  'assigned_to',
  'fecha_prevista',
  'fecha_limite',
  'created_by',
  'created_at',
  'updated_at',
  'tipo_ot',
  'tiempo_estimado_min',
  'duracion_estimada_minutos',
  'instrucciones_tecnico',
  'riesgos_precauciones',
  'resultado_esperado',
  'configuracion',
].join(',');

type NamedRow = { id: string; nombre: string | null };
type InstallationRow = NamedRow & {
  direccion: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
};
type WorkOrderRepositoryRow = LegacyWorkOrderRow & { cliente_id: string | null };
type AssetRow = {
  id: string;
  nombre: string | null;
  tipo: string | null;
  referencia: string | null;
  criticidad: string | null;
  estado: string | null;
};

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function loadNames(
  supabase: SupabaseClient,
  table: 'clientes' | 'ubicaciones' | 'profiles',
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from(table).select('id,nombre').in('id', ids);
  if (error) throw error;

  return new Map(
    ((data ?? []) as unknown as NamedRow[]).map((row) => [
      String(row.id),
      String(row.nombre || 'Sin nombre'),
    ]),
  );
}

async function loadInstallations(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, InstallationRow>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('instalaciones')
    .select('id,nombre,direccion,contacto_nombre,contacto_telefono,contacto_email')
    .in('id', ids);
  if (error) throw error;

  return new Map(
    ((data ?? []) as unknown as InstallationRow[]).map((row) => [String(row.id), row]),
  );
}

async function loadAssets(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, AssetRow>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('activos')
    .select('id,nombre,tipo,referencia,criticidad,estado')
    .in('id', ids);
  if (error) throw error;

  return new Map(
    ((data ?? []) as unknown as AssetRow[]).map((row) => [String(row.id), row]),
  );
}

export async function listAccessibleWorkOrders(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 100,
): Promise<WorkOrderListItem[]> {
  if (!tenantId.trim()) throw new Error('Se necesita una organización activa para consultar OT.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error('El límite de OT debe estar entre 1 y 500.');
  }

  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .select(WORK_ORDER_COLUMNS)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('fecha_prevista', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as unknown as WorkOrderRepositoryRow[];
  const [clientNames, installations, locationNames, technicianNames, assets] = await Promise.all([
    loadNames(supabase, 'clientes', unique(rows.map((row) => row.cliente_id))),
    loadInstallations(supabase, unique(rows.map((row) => row.instalacion_id))),
    loadNames(supabase, 'ubicaciones', unique(rows.map((row) => row.ubicacion_id))),
    loadNames(supabase, 'profiles', unique(rows.map((row) => row.assigned_to))),
    loadAssets(supabase, unique(rows.map((row) => row.activo_id))),
  ]);

  return rows.map((row) => {
    const asset = row.activo_id ? assets.get(row.activo_id) ?? null : null;
    const installation = installations.get(row.instalacion_id) ?? null;

    return {
      ...mapLegacyWorkOrder(row),
      clientId: row.cliente_id,
      clientName: row.cliente_id ? clientNames.get(row.cliente_id) ?? 'Cliente sin nombre' : null,
      siteName: installation?.nombre?.trim() || 'Instalación sin nombre',
      siteAddress: installation?.direccion?.trim() || null,
      siteContactName: installation?.contacto_nombre?.trim() || null,
      siteContactPhone: installation?.contacto_telefono?.trim() || null,
      siteContactEmail: installation?.contacto_email?.trim() || null,
      locationName: row.ubicacion_id
        ? locationNames.get(row.ubicacion_id) ?? 'Ubicación sin nombre'
        : null,
      assignedToName: row.assigned_to
        ? technicianNames.get(row.assigned_to) ?? 'Técnico sin nombre'
        : null,
      assetName: asset?.nombre ?? null,
      assetType: asset?.tipo ?? null,
      assetReference: asset?.referencia ?? null,
      assetCriticality: asset?.criticidad ?? null,
      assetStatus: asset?.estado ?? null,
    };
  });
}
