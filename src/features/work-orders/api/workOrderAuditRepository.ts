import type { SupabaseClient } from '@supabase/supabase-js';

export type WorkOrderAuditEvent = {
  id: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  actorName: string | null;
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

type ProfileRow = {
  id: string;
  nombre: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapAuditRow(row: AuditLogRow, actorName: string | null): WorkOrderAuditEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: row.entity_id ? String(row.entity_id) : null,
    userId: row.user_id ? String(row.user_id) : null,
    actorName,
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at),
  };
}

async function loadActorNames(
  supabase: SupabaseClient,
  userIds: Array<string | null>,
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from('profiles').select('id,nombre').in('id', ids);
  if (error) throw error;

  return new Map(
    ((data ?? []) as unknown as ProfileRow[]).map((profile) => [
      String(profile.id),
      profile.nombre?.trim() || 'Usuario sin nombre',
    ]),
  );
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

  const rows = (data ?? []) as unknown as AuditLogRow[];
  const actorNames = await loadActorNames(supabase, rows.map((row) => row.user_id));
  return rows.map((row) => mapAuditRow(row, row.user_id ? actorNames.get(row.user_id) ?? null : null));
}

export function humanAuditAction(action: string): string {
  const labels: Record<string, string> = {
    accept_work_order: 'OT aceptada',
    start_work_order_visit: 'Intervención iniciada',
    finalize_work_order_visit: 'Intervención finalizada',
    finalize_active_work_order_visit: 'Intervención finalizada',
    block_work_order: 'OT bloqueada / pendiente',
    resume_work_order: 'OT reanudada',
    review_work_order: 'Revisión administrativa',
    annul_work_order: 'OT anulada',
    soft_delete_work_order: 'OT anulada',
    create_work_order: 'OT creada',
    update_work_order: 'OT actualizada',
    ensure_work_order_default_checklist: 'Checklist preparado',
    register_work_order_report: 'Informe registrado',
  };

  return labels[action] ?? action.replaceAll('_', ' ');
}
