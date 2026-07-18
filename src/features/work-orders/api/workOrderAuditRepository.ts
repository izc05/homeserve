import type { SupabaseClient } from '@supabase/supabase-js';

export type WorkOrderAuditEvent = {
  id: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AuditLogRow = {
  id: string;
  tenant_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  metadata: unknown;
  created_at: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapAuditRow(row: AuditLogRow): WorkOrderAuditEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: row.entity_id ? String(row.entity_id) : null,
    userId: row.user_id ? String(row.user_id) : null,
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at),
  };
}

export async function listWorkOrderAuditEvents(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 80,
): Promise<WorkOrderAuditEvent[]> {
  if (!tenantId.trim()) throw new Error('Se necesita una organización activa para consultar auditoría.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 300) {
    throw new Error('El límite de auditoría debe estar entre 1 y 300.');
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,tenant_id,action,entity_type,entity_id,user_id,metadata,created_at')
    .eq('tenant_id', tenantId)
    .in('entity_type', ['ordenes_trabajo', 'work_order', 'ot_visitas'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as unknown as AuditLogRow[]).map(mapAuditRow);
}

export function humanAuditAction(action: string): string {
  const labels: Record<string, string> = {
    accept_work_order: 'OT aceptada',
    start_work_order_visit: 'Intervención iniciada',
    finalize_work_order_visit: 'Intervención finalizada',
    block_work_order: 'OT bloqueada / pendiente',
    resume_work_order: 'OT reanudada',
    review_work_order: 'Revisión administrativa',
    annul_work_order: 'OT anulada',
    create_work_order: 'OT creada',
    update_work_order: 'OT actualizada',
  };

  return labels[action] ?? action.replaceAll('_', ' ');
}
