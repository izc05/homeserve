import type { SupabaseClient } from '@supabase/supabase-js';

export type AssetMaintenanceHistory = {
  id: string;
  tenantId: string;
  assetId: string;
  workOrderId: string | null;
  scheduledMaintenanceId: string | null;
  planId: string | null;
  date: string;
  type: string | null;
  title: string;
  description: string | null;
  technicianId: string | null;
  finalStatus: string | null;
  nextAction: string | null;
  origin: string | null;
  startAt: string | null;
  finishAt: string | null;
  plannedWork: string | null;
  workDone: string | null;
  result: string | null;
  finalAssetStatus: string | null;
  nextDate: string | null;
  notes: string | null;
  createdAt: string | null;
};

type AssetMaintenanceHistoryRow = {
  id?: string;
  tenant_id?: string;
  activo_id?: string;
  ot_id?: string | null;
  mantenimiento_programado_id?: string | null;
  plan_id?: string | null;
  fecha?: string;
  tipo?: string | null;
  titulo?: string;
  descripcion?: string | null;
  tecnico_id?: string | null;
  estado_final?: string | null;
  proxima_accion?: string | null;
  origen?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  trabajo_previsto?: string | null;
  trabajo_realizado?: string | null;
  resultado?: string | null;
  estado_activo_final?: string | null;
  proxima_fecha?: string | null;
  observaciones?: string | null;
  created_at?: string | null;
};

function requireUuid(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function mapHistory(row: AssetMaintenanceHistoryRow): AssetMaintenanceHistory {
  if (!row.id || !row.tenant_id || !row.activo_id || !row.fecha || !row.titulo) {
    throw new Error('La base de datos devolvió un histórico de activo incompleto.');
  }

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    assetId: String(row.activo_id),
    workOrderId: row.ot_id ?? null,
    scheduledMaintenanceId: row.mantenimiento_programado_id ?? null,
    planId: row.plan_id ?? null,
    date: String(row.fecha),
    type: row.tipo ?? null,
    title: String(row.titulo),
    description: row.descripcion ?? null,
    technicianId: row.tecnico_id ?? null,
    finalStatus: row.estado_final ?? null,
    nextAction: row.proxima_accion ?? null,
    origin: row.origen ?? null,
    startAt: row.fecha_inicio ?? null,
    finishAt: row.fecha_fin ?? null,
    plannedWork: row.trabajo_previsto ?? null,
    workDone: row.trabajo_realizado ?? null,
    result: row.resultado ?? null,
    finalAssetStatus: row.estado_activo_final ?? null,
    nextDate: row.proxima_fecha ?? null,
    notes: row.observaciones ?? null,
    createdAt: row.created_at ?? null,
  };
}

const HISTORY_COLUMNS = 'id,tenant_id,activo_id,ot_id,mantenimiento_programado_id,plan_id,fecha,tipo,titulo,descripcion,tecnico_id,estado_final,proxima_accion,origen,fecha_inicio,fecha_fin,trabajo_previsto,trabajo_realizado,resultado,estado_activo_final,proxima_fecha,observaciones,created_at';

export async function listAssetMaintenanceHistory(
  supabase: SupabaseClient,
  input: { tenantId: string; assetId?: string | null; workOrderId?: string | null; limit?: number },
): Promise<AssetMaintenanceHistory[]> {
  requireUuid(input.tenantId, 'Selecciona una organización para consultar el histórico.');

  let query = supabase
    .from('historial_mantenimiento')
    .select(HISTORY_COLUMNS)
    .eq('tenant_id', input.tenantId)
    .is('deleted_at', null)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 50);

  if (input.assetId) query = query.eq('activo_id', input.assetId);
  if (input.workOrderId) query = query.eq('ot_id', input.workOrderId);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as AssetMaintenanceHistoryRow[]).map(mapHistory);
}

export async function listWorkOrderAssetHistory(
  supabase: SupabaseClient,
  input: { tenantId: string; workOrderId: string },
): Promise<AssetMaintenanceHistory[]> {
  requireUuid(input.workOrderId, 'No se ha indicado la OT para consultar el histórico.');
  return listAssetMaintenanceHistory(supabase, {
    tenantId: input.tenantId,
    workOrderId: input.workOrderId,
    limit: 10,
  });
}
