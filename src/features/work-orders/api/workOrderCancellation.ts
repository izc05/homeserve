import type { SupabaseClient } from '@supabase/supabase-js';

export type CancelledWorkOrder = {
  id: string;
  code: string | null;
  status: string;
  deletedAt: string | null;
};

type CancelledWorkOrderRow = {
  id?: string;
  codigo_ot?: string | null;
  estado?: string;
  deleted_at?: string | null;
};

function requireUuid(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function requireReason(value: string) {
  const reason = value?.trim() ?? '';
  if (reason.length < 5) {
    throw new Error('Indica un motivo de anulación claro, mínimo 5 caracteres.');
  }
  return reason;
}

function mapCancelledWorkOrder(data: unknown): CancelledWorkOrder {
  const row = data as CancelledWorkOrderRow | null;
  if (!row?.id || !row.estado) {
    throw new Error('La base de datos no devolvió la OT anulada.');
  }

  return {
    id: String(row.id),
    code: row.codigo_ot ?? null,
    status: String(row.estado),
    deletedAt: row.deleted_at ?? null,
  };
}

export async function cancelWorkOrder(
  supabase: SupabaseClient,
  input: { workOrderId: string; reason: string },
): Promise<CancelledWorkOrder> {
  requireUuid(input.workOrderId, 'No se ha indicado la OT a anular.');
  const reason = requireReason(input.reason);

  const { data, error } = await supabase.rpc('soft_delete_work_order', {
    work_order_uuid: input.workOrderId,
    reason_text: reason,
  });

  if (error) throw error;
  return mapCancelledWorkOrder(data);
}

export function canCancelWorkOrder(status: string): boolean {
  return !['FINALIZADA_TECNICO', 'VALIDADA', 'CANCELADA'].includes(status);
}
