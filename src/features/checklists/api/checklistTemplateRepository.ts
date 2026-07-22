import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChecklistTemplate,
  ChecklistTemplateDraft,
  ChecklistTemplatePoint,
  ChecklistTemplateResponseType,
  ChecklistTemplateSection,
} from '../types/checklistTemplate';

type PointRow = {
  id?: string;
  titulo?: string;
  instrucciones?: string | null;
  tipo_respuesta?: string;
  unidad?: string | null;
  opciones?: unknown;
  obligatorio?: boolean;
  observacion_negativa_obligatoria?: boolean;
  requiere_foto?: boolean;
  punto_critico?: boolean;
  orden?: number;
};

type SectionRow = {
  id?: string;
  titulo?: string;
  descripcion?: string | null;
  orden?: number;
  checklist_plantilla_puntos?: PointRow[] | null;
};

type TemplateRow = {
  id?: string;
  tenant_id?: string;
  nombre?: string;
  descripcion?: string | null;
  especialidad?: string | null;
  version?: number;
  estado?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  created_by_profile?: { nombre?: string | null } | null;
  updated_by_profile?: { nombre?: string | null } | null;
  checklist_plantilla_secciones?: SectionRow[] | null;
};

const TEMPLATE_SELECT = `
  id,tenant_id,nombre,descripcion,especialidad,version,estado,
  created_by,updated_by,created_at,updated_at,
  created_by_profile:profiles!checklist_plantillas_created_by_fkey(nombre),
  updated_by_profile:profiles!checklist_plantillas_updated_by_fkey(nombre),
  checklist_plantilla_secciones(
    id,titulo,descripcion,orden,
    checklist_plantilla_puntos(
      id,titulo,instrucciones,tipo_respuesta,unidad,opciones,obligatorio,
      observacion_negativa_obligatoria,requiere_foto,punto_critico,orden
    )
  )
`;

const RESPONSE_TYPES = new Set<ChecklistTemplateResponseType>([
  'si_no_na',
  'correcto_incorrecto',
  'numero',
  'texto',
  'seleccion',
]);

function required(value: string | null | undefined, message: string) {
  if (!value?.trim()) throw new Error(message);
  return value;
}

function mapPoint(row: PointRow): ChecklistTemplatePoint {
  const responseType = String(row.tipo_respuesta || '') as ChecklistTemplateResponseType;
  if (!row.id || !RESPONSE_TYPES.has(responseType)) {
    throw new Error('La base de datos devolvió un punto de plantilla no válido.');
  }
  return {
    id: row.id,
    title: String(row.titulo || 'Punto sin título'),
    instructions: String(row.instrucciones || ''),
    responseType,
    unit: String(row.unidad || ''),
    options: Array.isArray(row.opciones) ? row.opciones.map(String) : [],
    required: row.obligatorio !== false,
    negativeObservationRequired: row.observacion_negativa_obligatoria === true,
    photoRequired: row.requiere_foto === true,
    critical: row.punto_critico === true,
    order: Number(row.orden ?? 0),
  };
}

function mapSection(row: SectionRow): ChecklistTemplateSection {
  if (!row.id) throw new Error('La base de datos devolvió una sección de plantilla incompleta.');
  return {
    id: row.id,
    title: String(row.titulo || 'Sección sin título'),
    description: String(row.descripcion || ''),
    order: Number(row.orden ?? 0),
    points: [...(row.checklist_plantilla_puntos ?? [])]
      .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
      .map(mapPoint),
  };
}

export function mapChecklistTemplate(row: TemplateRow): ChecklistTemplate {
  if (!row.id || !row.tenant_id || !row.created_by || !row.updated_by) {
    throw new Error('La base de datos devolvió una plantilla incompleta.');
  }
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: String(row.nombre || 'Plantilla sin nombre'),
    description: String(row.descripcion || ''),
    specialty: String(row.especialidad || ''),
    version: Number(row.version ?? 1),
    active: row.estado === 'activo',
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdByName: row.created_by_profile?.nombre?.trim() || null,
    updatedByName: row.updated_by_profile?.nombre?.trim() || null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    sections: [...(row.checklist_plantilla_secciones ?? [])]
      .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
      .map(mapSection),
  };
}

export async function listChecklistTemplates(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<ChecklistTemplate[]> {
  required(tenantId, 'No se ha indicado la organización de las plantillas.');
  const { data, error } = await supabase
    .from('checklist_plantillas')
    .select(TEMPLATE_SELECT)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as TemplateRow[]).map(mapChecklistTemplate);
}

function payload(draft: ChecklistTemplateDraft) {
  return {
    tenantId: draft.tenantId,
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    specialty: draft.specialty.trim() || null,
    active: draft.active,
    sections: draft.sections.map((section) => ({
      title: section.title.trim(),
      description: section.description.trim() || null,
      points: section.points.map((point) => ({
        title: point.title.trim(),
        instructions: point.instructions.trim() || null,
        responseType: point.responseType,
        unit: point.responseType === 'numero' ? point.unit.trim() || null : null,
        options: point.responseType === 'seleccion' ? point.options.map((option) => option.trim()).filter(Boolean) : [],
        required: point.required,
        negativeObservationRequired: point.negativeObservationRequired,
        photoRequired: point.photoRequired,
        critical: point.critical,
      })),
    })),
  };
}

export async function saveChecklistTemplate(
  supabase: SupabaseClient,
  draft: ChecklistTemplateDraft,
  templateId?: string | null,
) {
  required(draft.tenantId, 'No se ha indicado la organización de la plantilla.');
  required(draft.name, 'Indica un nombre para la plantilla.');
  if (draft.sections.length === 0 || draft.sections.some((section) => !section.title.trim() || section.points.length === 0)) {
    throw new Error('Cada plantilla necesita al menos una sección con puntos.');
  }
  const { data, error } = await supabase.rpc('save_checklist_template', {
    payload_json: payload(draft),
    template_uuid: templateId ?? null,
  });
  if (error) throw error;
  return data as TemplateRow;
}

export async function duplicateChecklistTemplate(supabase: SupabaseClient, templateId: string) {
  required(templateId, 'No se ha indicado la plantilla a duplicar.');
  const { data, error } = await supabase.rpc('duplicate_checklist_template', { template_uuid: templateId });
  if (error) throw error;
  return data as TemplateRow;
}

export async function setChecklistTemplateActive(
  supabase: SupabaseClient,
  templateId: string,
  active: boolean,
) {
  required(templateId, 'No se ha indicado la plantilla a actualizar.');
  const { data, error } = await supabase.rpc('set_checklist_template_active', {
    template_uuid: templateId,
    active_value: active,
  });
  if (error) throw error;
  return data as TemplateRow;
}

export async function prepareChecklistFromTemplate(
  supabase: SupabaseClient,
  workOrderId: string,
  templateId: string,
) {
  required(workOrderId, 'No se ha indicado la OT que se va a preparar.');
  required(templateId, 'Selecciona una plantilla de checklist.');
  const { data, error } = await supabase.rpc('prepare_work_order_checklist', {
    work_order_uuid: workOrderId,
    template_uuid: templateId,
  });
  if (error) throw error;
  return data as { work_order_id: string; template_id: string; template_version: number; created_items: number };
}
