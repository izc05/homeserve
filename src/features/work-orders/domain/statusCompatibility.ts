import { WORK_ORDER_STATUSES, type WorkOrderBlockReason, type WorkOrderStatus } from '../types/workOrder';

export const LEGACY_WORK_ORDER_STATUSES = [
  'BORRADOR',
  'NUEVA',
  'ASIGNADA',
  'ACEPTADA',
  'EN_CURSO',
  'PAUSADA',
  'PENDIENTE_MATERIAL',
  'PENDIENTE_CLIENTE',
  'FINALIZADA',
  'FIRMADA',
  'INFORME_GENERADO',
  'VALIDADA',
  'CERRADA',
  'CANCELADA',
] as const;

export type LegacyWorkOrderStatus = (typeof LEGACY_WORK_ORDER_STATUSES)[number];

const STATUS_MAP: Record<LegacyWorkOrderStatus, WorkOrderStatus> = {
  BORRADOR: 'BORRADOR',
  NUEVA: 'BORRADOR',
  ASIGNADA: 'ASIGNADA',
  ACEPTADA: 'ACEPTADA',
  EN_CURSO: 'EN_CURSO',
  PAUSADA: 'BLOQUEADA',
  PENDIENTE_MATERIAL: 'BLOQUEADA',
  PENDIENTE_CLIENTE: 'BLOQUEADA',
  FINALIZADA: 'FINALIZADA_TECNICO',
  FIRMADA: 'FINALIZADA_TECNICO',
  INFORME_GENERADO: 'FINALIZADA_TECNICO',
  VALIDADA: 'VALIDADA',
  CERRADA: 'VALIDADA',
  CANCELADA: 'CANCELADA',
};

const BLOCK_REASON_MAP: Partial<Record<LegacyWorkOrderStatus, WorkOrderBlockReason>> = {
  PAUSADA: 'OTRO',
  PENDIENTE_MATERIAL: 'MATERIAL',
  PENDIENTE_CLIENTE: 'RESPONSABLE',
};

export function isLegacyWorkOrderStatus(value: string): value is LegacyWorkOrderStatus {
  return (LEGACY_WORK_ORDER_STATUSES as readonly string[]).includes(value);
}

function isCanonicalWorkOrderStatus(value: string): value is WorkOrderStatus {
  return (WORK_ORDER_STATUSES as readonly string[]).includes(value);
}

export function normalizeWorkOrderStatus(value: string): WorkOrderStatus {
  if (isCanonicalWorkOrderStatus(value)) return value;

  if (!isLegacyWorkOrderStatus(value)) {
    throw new Error(`Estado de OT heredado no reconocido: ${value}`);
  }

  return STATUS_MAP[value];
}

export function inferBlockReasonFromLegacyStatus(value: string): WorkOrderBlockReason | null {
  if (isCanonicalWorkOrderStatus(value)) return null;

  if (!isLegacyWorkOrderStatus(value)) {
    throw new Error(`Estado de OT heredado no reconocido: ${value}`);
  }

  return BLOCK_REASON_MAP[value] ?? null;
}
