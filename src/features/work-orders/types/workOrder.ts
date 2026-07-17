export const WORK_ORDER_STATUSES = [
  'BORRADOR',
  'ASIGNADA',
  'ACEPTADA',
  'EN_CURSO',
  'BLOQUEADA',
  'FINALIZADA_TECNICO',
  'VALIDADA',
  'CANCELADA',
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_PRIORITIES = ['baja', 'normal', 'alta', 'urgente', 'critica'] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export const WORK_ORDER_BLOCK_REASONS = [
  'MATERIAL',
  'ACCESO',
  'RESPONSABLE',
  'EMPRESA_EXTERNA',
  'SEGURIDAD',
  'OTRO',
] as const;

export type WorkOrderBlockReason = (typeof WORK_ORDER_BLOCK_REASONS)[number];

export const WORK_ORDER_TYPES = [
  'averia',
  'mantenimiento_preventivo',
  'mantenimiento_correctivo',
  'revision',
  'inspeccion',
  'instalacion',
  'sustitucion',
  'medicion',
  'urgencia',
  'otro',
] as const;

export type WorkOrderType = (typeof WORK_ORDER_TYPES)[number];

export interface WorkOrderRequirements {
  checklist: boolean;
  initialPhotos: boolean;
  finalPhotos: boolean;
  measurements: boolean;
  materials: boolean;
  technicianSignature: boolean;
  responsibleSignature: boolean;
  finalFunctionalTest: boolean;
  report: boolean;
  administrativeReview: boolean;
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  code: string;
  title: string;
  description: string | null;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  siteId: string;
  locationId: string | null;
  assetId: string | null;
  assignedTo: string | null;
  createdBy: string;
  plannedAt: string | null;
  dueAt: string | null;
  estimatedMinutes: number | null;
  instructions: string | null;
  safetyNotes: string | null;
  expectedResult: string | null;
  requirements: WorkOrderRequirements;
  blockReason: WorkOrderBlockReason | null;
  blockNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
