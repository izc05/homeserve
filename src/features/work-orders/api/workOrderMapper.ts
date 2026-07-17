import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_TYPES,
  type WorkOrder,
  type WorkOrderPriority,
  type WorkOrderRequirements,
  type WorkOrderType,
} from '../types/workOrder';
import {
  inferBlockReasonFromLegacyStatus,
  normalizeWorkOrderStatus,
} from '../domain/statusCompatibility';

export type LegacyWorkOrderRow = {
  id: string;
  tenant_id: string;
  codigo_ot: string | null;
  instalacion_id: string;
  ubicacion_id: string | null;
  activo_id: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  prioridad: string;
  estado: string;
  assigned_to: string | null;
  fecha_prevista: string | null;
  fecha_limite: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tipo_ot: string | null;
  tiempo_estimado_min: number | null;
  duracion_estimada_minutos: number | null;
  instrucciones_tecnico: string | null;
  riesgos_precauciones: string | null;
  resultado_esperado: string | null;
  configuracion: unknown;
};

type JsonRecord = Record<string, unknown>;

const LEGACY_TYPE_MAP: Record<string, WorkOrderType> = {
  averia: 'averia',
  mantenimiento_preventivo: 'mantenimiento_preventivo',
  mantenimiento_correctivo: 'mantenimiento_correctivo',
  reparacion: 'mantenimiento_correctivo',
  revision: 'revision',
  inspeccion: 'inspeccion',
  instalacion: 'instalacion',
  sustitucion: 'sustitucion',
  medicion: 'medicion',
  urgencia: 'urgencia',
  otro: 'otro',
};

const LEGACY_PRIORITY_MAP: Record<string, WorkOrderPriority> = {
  baja: 'baja',
  media: 'normal',
  normal: 'normal',
  alta: 'alta',
  urgente: 'urgente',
  critica: 'critica',
};

function requireText(value: string | null, field: string): string {
  if (!value?.trim()) throw new Error(`La OT heredada no contiene ${field}`);
  return value;
}

function normalizeWorkOrderType(value: string): WorkOrderType {
  const normalized = LEGACY_TYPE_MAP[value.toLowerCase()];
  if (!normalized || !WORK_ORDER_TYPES.includes(normalized)) {
    throw new Error(`Tipo de OT heredado no reconocido: ${value}`);
  }
  return normalized;
}

function normalizeWorkOrderPriority(value: string): WorkOrderPriority {
  const normalized = LEGACY_PRIORITY_MAP[value.toLowerCase()];
  if (!normalized || !WORK_ORDER_PRIORITIES.includes(normalized)) {
    throw new Error(`Prioridad de OT heredada no reconocida: ${value}`);
  }
  return normalized;
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function flag(configuration: JsonRecord, key: string): boolean {
  return configuration[key] === true;
}

function mapRequirements(configurationValue: unknown): WorkOrderRequirements {
  const configuration = asRecord(configurationValue);
  return {
    checklist: flag(configuration, 'requiere_checklist'),
    initialPhotos: flag(configuration, 'requiere_fotos_iniciales'),
    finalPhotos: flag(configuration, 'requiere_fotos_finales'),
    measurements: flag(configuration, 'requiere_mediciones'),
    materials: flag(configuration, 'requiere_materiales'),
    technicianSignature: flag(configuration, 'requiere_firma_tecnico'),
    responsibleSignature: flag(configuration, 'requiere_firma_cliente'),
    finalFunctionalTest: flag(configuration, 'requiere_prueba_funcional'),
    report: flag(configuration, 'requiere_informe'),
    administrativeReview: flag(configuration, 'requiere_revision_admin'),
  };
}

export function mapLegacyWorkOrder(row: LegacyWorkOrderRow): WorkOrder {
  const typeValue = row.tipo_ot?.trim() || row.tipo.trim();

  return {
    id: requireText(row.id, 'id'),
    tenantId: requireText(row.tenant_id, 'tenant_id'),
    code: requireText(row.codigo_ot, 'codigo_ot'),
    title: requireText(row.titulo, 'titulo'),
    description: row.descripcion,
    type: normalizeWorkOrderType(typeValue),
    priority: normalizeWorkOrderPriority(row.prioridad),
    status: normalizeWorkOrderStatus(row.estado),
    siteId: requireText(row.instalacion_id, 'instalacion_id'),
    locationId: row.ubicacion_id,
    assetId: row.activo_id,
    assignedTo: row.assigned_to,
    createdBy: requireText(row.created_by, 'created_by'),
    plannedAt: row.fecha_prevista,
    dueAt: row.fecha_limite,
    estimatedMinutes: row.duracion_estimada_minutos ?? row.tiempo_estimado_min,
    instructions: row.instrucciones_tecnico,
    safetyNotes: row.riesgos_precauciones,
    expectedResult: row.resultado_esperado,
    requirements: mapRequirements(row.configuracion),
    blockReason: inferBlockReasonFromLegacyStatus(row.estado),
    blockNotes: null,
    createdAt: requireText(row.created_at, 'created_at'),
    updatedAt: requireText(row.updated_at, 'updated_at'),
  };
}
