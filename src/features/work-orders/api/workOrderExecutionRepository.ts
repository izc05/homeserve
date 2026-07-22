import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureWorkOrderDefaultChecklist } from './workOrderEvidenceActions';

export type ChecklistResponseType = 'ok_ko_na' | 'texto' | 'medicion';

export type WorkOrderChecklistResponse = {
  id: string;
  tenantId: string;
  workOrderId: string;
  templateItemId: string | null;
  order: number;
  point: string;
  description: string | null;
  required: boolean;
  requiresPhoto: boolean;
  result: string | null;
  responseType: ChecklistResponseType;
  observations: string | null;
  completedBy: string | null;
  completedAt: string | null;
};

type ChecklistRow = {
  id?: string;
  tenant_id?: string;
  ot_id?: string;
  plantilla_item_id?: string | null;
  orden?: number | null;
  punto?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  obligatorio?: boolean | null;
  requiere_foto?: boolean | null;
  resultado?: string | null;
  tipo_respuesta?: string | null;
  observaciones?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
};

const CHECKLIST_COLUMNS = [
  'id',
  'tenant_id',
  'ot_id',
  'plantilla_item_id',
  'orden',
  'punto',
  'titulo',
  'descripcion',
  'obligatorio',
  'requiere_foto',
  'resultado',
  'tipo_respuesta',
  'observaciones',
  'completed_by',
  'completed_at',
].join(',');

function requireUuid(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function responseType(value: string | null | undefined): ChecklistResponseType {
  if (value === 'ok_ko_na' || value === 'texto' || value === 'medicion') return value;
  throw new Error('La respuesta del checklist utiliza un tipo no soportado.');
}

function mapChecklistRow(row: ChecklistRow): WorkOrderChecklistResponse {
  if (!row.id || !row.tenant_id || !row.ot_id) {
    throw new Error('La base de datos devolvió un punto de checklist incompleto.');
  }

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    workOrderId: String(row.ot_id),
    templateItemId: row.plantilla_item_id ?? null,
    order: Number(row.orden ?? 0),
    point: String(row.punto || row.titulo || 'Punto sin título'),
    description: row.descripcion?.trim() || null,
    required: row.obligatorio !== false,
    requiresPhoto: row.requiere_foto === true,
    result: row.resultado?.trim() || null,
    responseType: responseType(row.tipo_respuesta),
    observations: row.observaciones?.trim() || null,
    completedBy: row.completed_by ?? null,
    completedAt: row.completed_at ?? null,
  };
}

export function checklistProgress(rows: WorkOrderChecklistResponse[]) {
  return {
    completed: rows.filter((row) => Boolean(row.result?.trim())).length,
    total: rows.length,
  };
}

export async function listWorkOrderChecklist(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderChecklistResponse[]> {
  requireUuid(workOrderId, 'No se ha indicado la OT para consultar el checklist.');

  const { data, error } = await supabase
    .from('ot_checklist_respuestas')
    .select(CHECKLIST_COLUMNS)
    .eq('ot_id', workOrderId)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as ChecklistRow[]).map(mapChecklistRow);
}

export async function prepareWorkOrderChecklist(
  supabase: SupabaseClient,
  workOrderId: string,
) {
  return ensureWorkOrderDefaultChecklist(supabase, workOrderId);
}

export async function saveWorkOrderChecklistResponse(
  supabase: SupabaseClient,
  input: {
    responseId: string;
    result: string | null;
    observations?: string | null;
  },
): Promise<WorkOrderChecklistResponse> {
  requireUuid(input.responseId, 'No se ha indicado el punto de checklist a guardar.');

  const { data, error } = await supabase.rpc('save_work_order_checklist_response', {
    checklist_response_uuid: input.responseId,
    result_text: input.result?.trim() || null,
    observations_text: input.observations?.trim() || null,
  });

  if (error) throw error;
  return mapChecklistRow((data ?? {}) as ChecklistRow);
}
