import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatedWorkOrder } from './workOrderCommands';

export type ScheduledMaintenanceStatus =
  | 'borrador'
  | 'programado'
  | 'proximo'
  | 'vencido'
  | 'ot_generada'
  | 'asignado'
  | 'en_curso'
  | 'pendiente_material'
  | 'pendiente_cliente'
  | 'pausado'
  | 'completado'
  | 'cancelado'
  | 'no_aplica';

export type ScheduledMaintenance = {
  id: string;
  tenantId: string;
  planId: string | null;
  installationId: string;
  locationId: string | null;
  assetId: string;
  workOrderId: string | null;
  title: string;
  description: string | null;
  type: string;
  status: ScheduledMaintenanceStatus;
  priority: string | null;
  scheduledDate: string | null;
  dueDate: string | null;
  assignedTo: string | null;
  origin: string | null;
  createdAt: string;
  updatedAt: string;
};

type ScheduledMaintenanceRow = {
  id?: string;
  tenant_id?: string;
  plan_id?: string | null;
  instalacion_id?: string;
  ubicacion_id?: string | null;
  activo_id?: string;
  ot_id?: string | null;
  titulo?: string;
  descripcion?: string | null;
  tipo?: string;
  estado?: ScheduledMaintenanceStatus;
  prioridad?: string | null;
  fecha_programada?: string | null;
  fecha_limite?: string | null;
  assigned_to?: string | null;
  origen?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CreatedWorkOrderRow = {
  id?: string;
  codigo_ot?: string | null;
  estado?: string | null;
};

function requireUuid(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function mapScheduledMaintenance(row: ScheduledMaintenanceRow): ScheduledMaintenance {
  if (!row.id || !row.tenant_id || !row.instalacion_id || !row.activo_id || !row.titulo || !row.tipo || !row.estado) {
    throw new Error('La base de datos devolvió una planificación incompleta.');
  }

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    planId: row.plan_id ?? null,
    installationId: String(row.instalacion_id),
    locationId: row.ubicacion_id ?? null,
    assetId: String(row.activo_id),
    workOrderId: row.ot_id ?? null,
    title: String(row.titulo),
    description: row.descripcion ?? null,
    type: String(row.tipo),
    status: row.estado,
    priority: row.prioridad ?? null,
    scheduledDate: row.fecha_programada ?? null,
    dueDate: row.fecha_limite ?? null,
    assignedTo: row.assigned_to ?? null,
    origin: row.origen ?? null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

function mapCreatedWorkOrder(row: CreatedWorkOrderRow | null): CreatedWorkOrder {
  if (!row?.id || !row.codigo_ot || !row.estado) {
    throw new Error('La base de datos no devolvió la OT generada desde planificación.');
  }

  return {
    id: String(row.id),
    code: String(row.codigo_ot),
    status: String(row.estado),
  };
}

export async function listScheduledMaintenances(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<ScheduledMaintenance[]> {
  requireUuid(tenantId, 'Selecciona una organización para consultar la planificación.');

  const { data, error } = await supabase
    .from('mantenimientos_programados')
    .select('id,tenant_id,plan_id,instalacion_id,ubicacion_id,activo_id,ot_id,titulo,descripcion,tipo,estado,prioridad,fecha_programada,fecha_limite,assigned_to,origen,created_at,updated_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('fecha_programada', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ScheduledMaintenanceRow[]).map(mapScheduledMaintenance);
}

export async function generateWorkOrderFromScheduledMaintenance(
  supabase: SupabaseClient,
  input: { scheduledMaintenanceId: string; technicianId?: string | null },
): Promise<CreatedWorkOrder> {
  requireUuid(input.scheduledMaintenanceId, 'No se ha indicado el mantenimiento programado.');

  const { data, error } = await supabase.rpc('create_work_order_from_scheduled_maintenance', {
    scheduled_maintenance_uuid: input.scheduledMaintenanceId,
    technician_uuid: input.technicianId || null,
  });

  if (error) throw error;
  return mapCreatedWorkOrder(data as CreatedWorkOrderRow | null);
}

export function canGenerateWorkOrderFromScheduledMaintenance(status: ScheduledMaintenanceStatus, workOrderId?: string | null) {
  return !workOrderId && !['completado', 'cancelado', 'no_aplica', 'ot_generada'].includes(status);
}
