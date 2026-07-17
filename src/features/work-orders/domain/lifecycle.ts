import type { WorkOrderStatus } from '../types/workOrder';

const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  BORRADOR: ['ASIGNADA', 'CANCELADA'],
  ASIGNADA: ['ACEPTADA', 'CANCELADA'],
  ACEPTADA: ['EN_CURSO', 'BLOQUEADA'],
  EN_CURSO: ['BLOQUEADA', 'FINALIZADA_TECNICO'],
  BLOQUEADA: ['EN_CURSO', 'CANCELADA'],
  FINALIZADA_TECNICO: ['VALIDADA', 'EN_CURSO'],
  VALIDADA: [],
  CANCELADA: [],
};

export function allowedNextStatuses(status: WorkOrderStatus): readonly WorkOrderStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

export function canTransitionWorkOrder(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertWorkOrderTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
  if (!canTransitionWorkOrder(from, to)) {
    throw new Error(`Transición de OT no permitida: ${from} → ${to}`);
  }
}

export function isWorkOrderReadOnly(status: WorkOrderStatus): boolean {
  return status === 'VALIDADA' || status === 'CANCELADA';
}
