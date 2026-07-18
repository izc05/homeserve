import type { SupabaseClient } from '@supabase/supabase-js';

export type ChecklistPreparationResult = {
  workOrderId: string;
  createdItems: number;
  totalItems: number;
  completedItems: number;
};

export type RegisteredWorkOrderReport = {
  id: string;
  tenantId: string;
  workOrderId: string;
  filename: string;
  bucket: string | null;
  path: string | null;
  createdAt: string;
};

type ChecklistRpcResult = {
  work_order_id?: string;
  created_items?: number;
  total_items?: number;
  completed_items?: number;
};

type ReportRow = {
  id?: string;
  tenant_id?: string;
  ot_id?: string;
  filename?: string;
  bucket?: string | null;
  path?: string | null;
  created_at?: string;
};

function requireUuid(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function mapChecklistResult(data: unknown): ChecklistPreparationResult {
  const row = (data ?? {}) as ChecklistRpcResult;
  if (!row.work_order_id) throw new Error('La base de datos no devolvió el checklist preparado.');
  return {
    workOrderId: String(row.work_order_id),
    createdItems: Number(row.created_items ?? 0),
    totalItems: Number(row.total_items ?? 0),
    completedItems: Number(row.completed_items ?? 0),
  };
}

function mapReportRow(data: unknown): RegisteredWorkOrderReport {
  const row = data as ReportRow | null;
  if (!row?.id || !row.ot_id || !row.tenant_id || !row.filename) {
    throw new Error('La base de datos no devolvió el informe registrado.');
  }
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    workOrderId: String(row.ot_id),
    filename: String(row.filename),
    bucket: row.bucket ?? null,
    path: row.path ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function ensureWorkOrderDefaultChecklist(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<ChecklistPreparationResult> {
  requireUuid(workOrderId, 'No se ha indicado la OT para preparar el checklist.');

  const { data, error } = await supabase.rpc('ensure_work_order_default_checklist', {
    work_order_uuid: workOrderId,
  });

  if (error) throw error;
  return mapChecklistResult(data);
}

export async function registerWorkOrderReport(
  supabase: SupabaseClient,
  input: { workOrderId: string; filename?: string | null },
): Promise<RegisteredWorkOrderReport> {
  requireUuid(input.workOrderId, 'No se ha indicado la OT para registrar el informe.');

  const { data, error } = await supabase.rpc('register_work_order_report', {
    work_order_uuid: input.workOrderId,
    filename_text: input.filename?.trim() || null,
  });

  if (error) throw error;
  return mapReportRow(data);
}
