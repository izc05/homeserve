import type { SupabaseClient } from '@supabase/supabase-js';

export type AssignWorkOrderInput = {
  workOrderId: string;
  technicianId: string;
  plannedAt: string | null;
  reason: string | null;
};

export type AssignedWorkOrder = {
  id: string;
  code: string;
  status: string;
  assignedTo: string;
};

type AssignedWorkOrderRow = {
  id: string;
  codigo_ot: string;
  estado: string;
  assigned_to: string;
};

export function toAssignWorkOrderRpcArgs(input: AssignWorkOrderInput): Record<string, unknown> {
  return {
    work_order_uuid: input.workOrderId,
    technician_uuid: input.technicianId,
    planned_at_value: input.plannedAt,
    reassignment_reason_text: input.reason?.trim() || null,
  };
}

export async function assignWorkOrder(
  supabase: SupabaseClient,
  input: AssignWorkOrderInput,
): Promise<AssignedWorkOrder> {
  const { data, error } = await supabase.rpc(
    'assign_work_order',
    toAssignWorkOrderRpcArgs(input),
  );

  if (error) throw error;

  const row = data as unknown as AssignedWorkOrderRow | null;
  if (!row?.id || !row.codigo_ot || !row.assigned_to) {
    throw new Error('La base de datos no devolvió la asignación actualizada.');
  }

  return {
    id: String(row.id),
    code: String(row.codigo_ot),
    status: String(row.estado),
    assignedTo: String(row.assigned_to),
  };
}
