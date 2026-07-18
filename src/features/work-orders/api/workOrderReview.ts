import type { SupabaseClient } from '@supabase/supabase-js';

export type WorkOrderReviewDecision = 'validada' | 'correccion_solicitada';

export type WorkOrderReviewResult = {
  id: string;
  estado: string;
  revision_admin_estado: string | null;
  updated_at?: string | null;
};

function requireUuid(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function requireText(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function mapReviewResult(data: unknown): WorkOrderReviewResult {
  const row = data as {
    id?: string;
    estado?: string;
    revision_admin_estado?: string | null;
    updated_at?: string | null;
  } | null;

  if (!row?.id || !row.estado) {
    throw new Error('La base de datos no devolvió la revisión actualizada.');
  }

  return {
    id: String(row.id),
    estado: String(row.estado),
    revision_admin_estado: row.revision_admin_estado ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function reviewWorkOrder(
  supabase: SupabaseClient,
  input: {
    workOrderId: string;
    decision: WorkOrderReviewDecision;
    notes: string;
  },
): Promise<WorkOrderReviewResult> {
  requireUuid(input.workOrderId, 'No se ha indicado la OT a revisar.');
  requireText(input.notes, 'Indica una nota de revisión.');

  const { data, error } = await supabase.rpc('review_work_order', {
    work_order_uuid: input.workOrderId,
    decision_text: input.decision,
    notes_text: input.notes.trim(),
  });

  if (error) throw error;
  return mapReviewResult(data);
}
