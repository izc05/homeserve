import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkOrder } from '../types/workOrder';
import { mapLegacyWorkOrder, type LegacyWorkOrderRow } from './workOrderMapper';

export type WorkOrderListItem = WorkOrder & {
  siteName: string;
  locationName: string | null;
  assignedToName: string | null;
};

const WORK_ORDER_COLUMNS = [
  'id',
  'tenant_id',
  'codigo_ot',
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

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function loadNames(
  supabase: SupabaseClient,
  table: 'instalaciones' | 'ubicaciones' | 'profiles',
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

  const rows = (data ?? []) as unknown as LegacyWorkOrderRow[];
  const [siteNames, locationNames, technicianNames] = await Promise.all([
    loadNames(supabase, 'instalaciones', unique(rows.map((row) => row.instalacion_id))),
    loadNames(supabase, 'ubicaciones', unique(rows.map((row) => row.ubicacion_id))),
    loadNames(supabase, 'profiles', unique(rows.map((row) => row.assigned_to))),
  ]);

  return rows.map((row) => ({
    ...mapLegacyWorkOrder(row),
    siteName: siteNames.get(row.instalacion_id) ?? 'Instalación sin nombre',
    locationName: row.ubicacion_id
      ? locationNames.get(row.ubicacion_id) ?? 'Ubicación sin nombre'
      : null,
    assignedToName: row.assigned_to
      ? technicianNames.get(row.assigned_to) ?? 'Técnico sin nombre'
      : null,
  }));
}
