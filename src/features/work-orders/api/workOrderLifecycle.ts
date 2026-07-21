import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkOrderStatus } from '../types/workOrder';

export type WorkOrderLifecycleStatus = WorkOrderStatus;

export type WorkOrderLifecycleResult = {
  id: string;
  estado: WorkOrderLifecycleStatus;
  updated_at?: string | null;
};

export type WorkOrderVisitResult = {
  id: string;
  ot_id: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

export type BlockWorkOrderInput = {
  workOrderId: string;
  reason: string;
};

export type FinalizeWorkOrderVisitInput = {
  visitId: string;
  result?: 'trabajo_completado' | 'pendiente_material' | 'pendiente_cliente' | 'necesita_otra_visita';
  workDone: string;
  diagnosis?: string;
  tests?: string;
  recommendations?: string;
  pendingWork?: string;
  closingReason?: string;
  nextAction?: string;
  finalAssetStatus?: string;
};

export type FinalizeActiveWorkOrderVisitInput = Omit<FinalizeWorkOrderVisitInput, 'visitId'> & {
  workOrderId: string;
};

type WorkOrderStatusRow = {
  estado?: string | null;
  configuracion?: unknown;
};

type ChecklistRow = {
  plantilla_item_id?: string | null;
  resultado?: string | null;
  obligatorio?: boolean | null;
};

const BLOCKABLE_STATUSES = ['EN_CURSO'] as const;
const RESUMABLE_STATUSES = ['BLOQUEADA'] as const;

function requireUuid(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function requireText(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function flag(configuration: Record<string, unknown>, key: string): boolean {
  return configuration[key] === true;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function mapWorkOrderResult(data: unknown): WorkOrderLifecycleResult {
  const row = data as { id?: string; estado?: WorkOrderLifecycleStatus; updated_at?: string | null } | null;
  if (!row?.id || !row.estado) throw new Error('La base de datos no devolvió la OT actualizada.');
  return { id: String(row.id), estado: row.estado, updated_at: row.updated_at ?? null };
}

function mapVisitResult(data: unknown): WorkOrderVisitResult {
  const row = data as {
    id?: string;
    ot_id?: string;
    estado?: string;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
  } | null;
  if (!row?.id || !row.ot_id || !row.estado) {
    throw new Error('La base de datos no devolvió la intervención actualizada.');
  }
  return {
    id: String(row.id),
    ot_id: String(row.ot_id),
    estado: String(row.estado),
    fecha_inicio: row.fecha_inicio ?? null,
    fecha_fin: row.fecha_fin ?? null,
  };
}

function buildClosePayload(input: Omit<FinalizeWorkOrderVisitInput, 'visitId'>) {
  return {
    resultado_cierre: input.result ?? 'trabajo_completado',
    trabajo_realizado: input.workDone.trim(),
    diagnostico: input.diagnosis?.trim() || null,
    pruebas_realizadas: input.tests?.trim() || null,
    recomendaciones: input.recommendations?.trim() || null,
    trabajo_pendiente: input.pendingWork?.trim() || null,
    motivo_cierre: input.closingReason?.trim() || null,
    proxima_accion: input.nextAction?.trim() || null,
    estado_final_activo: input.finalAssetStatus?.trim() || null,
  };
}

async function readWorkOrder(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderStatusRow> {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .select('estado,configuracion')
    .eq('id', workOrderId)
    .maybeSingle();

  if (error) throw error;

  const row = data as WorkOrderStatusRow | null;
  if (!row?.estado?.trim()) throw new Error('No se ha encontrado la OT o no tiene estado válido.');
  return row;
}

async function readWorkOrderStatus(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<string> {
  const row = await readWorkOrder(supabase, workOrderId);
  return String(row.estado).trim();
}

async function readChecklistRows(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<ChecklistRow[]> {
  const { data, error } = await supabase
    .from('ot_checklist_respuestas')
    .select('plantilla_item_id,resultado,obligatorio')
    .eq('ot_id', workOrderId);

  if (error) throw error;
  return (data ?? []) as unknown as ChecklistRow[];
}

function closureRequirementFailures(configuration: Record<string, unknown>, checklistRows: ChecklistRow[]): string[] {
  const failures: string[] = [];
  const requiresChecklist = flag(configuration, 'requiere_checklist');
  const requiresTechnicianSignature = flag(configuration, 'requiere_firma_tecnico');

  if (requiresChecklist) {
    if (checklistRows.length === 0) {
      failures.push('preparar el checklist');
    } else if (checklistRows.some((row) => row.obligatorio !== false && !hasText(row.resultado))) {
      failures.push('completar todos los puntos obligatorios del checklist');
    }
  }

  if (requiresTechnicianSignature) {
    const signatureDone = checklistRows.some(
      (row) => row.plantilla_item_id === 'firma_tecnico' && hasText(row.resultado),
    );
    if (!signatureDone) failures.push('registrar la firma del técnico');
  }

  return failures;
}

async function assertCanAcceptWorkOrder(
  supabase: SupabaseClient,
  workOrderId: string,
) {
  const status = await readWorkOrderStatus(supabase, workOrderId);
  if (status !== 'ASIGNADA') {
    throw new Error('Solo se puede aceptar una OT asignada y pendiente de aceptación.');
  }
}

async function assertCanStartWorkOrder(
  supabase: SupabaseClient,
  workOrderId: string,
) {
  const status = await readWorkOrderStatus(supabase, workOrderId);
  if (status === 'ASIGNADA') {
    throw new Error('Primero el técnico asignado debe aceptar la OT antes de iniciarla.');
  }
  if (status !== 'ACEPTADA') {
    throw new Error('Solo se puede iniciar una OT aceptada y pendiente de comenzar.');
  }
}

async function assertCanBlockWorkOrder(
  supabase: SupabaseClient,
  workOrderId: string,
) {
  const status = await readWorkOrderStatus(supabase, workOrderId);
  if (!BLOCKABLE_STATUSES.includes(status as (typeof BLOCKABLE_STATUSES)[number])) {
    throw new Error('Solo se puede pausar o dejar pendiente una OT que esté en curso.');
  }
}

async function assertCanResumeWorkOrder(
  supabase: SupabaseClient,
  workOrderId: string,
) {
  const status = await readWorkOrderStatus(supabase, workOrderId);
  if (!RESUMABLE_STATUSES.includes(status as (typeof RESUMABLE_STATUSES)[number])) {
    throw new Error('Solo se puede reanudar una OT bloqueada o pendiente.');
  }
}

async function assertCanFinishActiveVisit(
  supabase: SupabaseClient,
  workOrderId: string,
) {
  const row = await readWorkOrder(supabase, workOrderId);
  const status = String(row.estado).trim();
  if (status !== 'EN_CURSO') {
    throw new Error('Solo se puede finalizar una OT que esté en curso.');
  }

  const configuration = asRecord(row.configuracion);
  const checklistRows = await readChecklistRows(supabase, workOrderId);
  const failures = closureRequirementFailures(configuration, checklistRows);
  if (failures.length > 0) {
    throw new Error(`Antes de cerrar la OT debes ${failures.join(' y ')}.`);
  }
}

export async function acceptWorkOrder(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderLifecycleResult> {
  requireUuid(workOrderId, 'No se ha indicado la OT a aceptar.');
  await assertCanAcceptWorkOrder(supabase, workOrderId);

  const { data, error } = await supabase.rpc('accept_work_order', {
    work_order_uuid: workOrderId,
  });

  if (error) throw error;
  return mapWorkOrderResult(data);
}

export async function startWorkOrderVisit(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderVisitResult> {
  requireUuid(workOrderId, 'No se ha indicado la OT a iniciar.');
  await assertCanStartWorkOrder(supabase, workOrderId);

  const { data, error } = await supabase.rpc('start_work_order_visit', {
    work_order_uuid: workOrderId,
  });

  if (error) throw error;
  return mapVisitResult(data);
}

export async function blockWorkOrder(
  supabase: SupabaseClient,
  input: BlockWorkOrderInput,
): Promise<WorkOrderLifecycleResult> {
  requireUuid(input.workOrderId, 'No se ha indicado la OT a bloquear.');
  requireText(input.reason, 'Indica el motivo del bloqueo.');
  await assertCanBlockWorkOrder(supabase, input.workOrderId);

  const { data, error } = await supabase.rpc('block_work_order', {
    work_order_uuid: input.workOrderId,
    block_status: 'BLOQUEADA',
    reason_text: input.reason.trim(),
  });

  if (error) throw error;
  return mapWorkOrderResult(data);
}

export async function resumeWorkOrder(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderLifecycleResult> {
  requireUuid(workOrderId, 'No se ha indicado la OT a reanudar.');
  await assertCanResumeWorkOrder(supabase, workOrderId);

  const { data, error } = await supabase.rpc('resume_work_order', {
    work_order_uuid: workOrderId,
  });

  if (error) throw error;
  return mapWorkOrderResult(data);
}

export async function finalizeWorkOrderVisit(
  supabase: SupabaseClient,
  input: FinalizeWorkOrderVisitInput,
): Promise<WorkOrderVisitResult> {
  requireUuid(input.visitId, 'No se ha indicado la intervención a finalizar.');
  requireText(input.workDone, 'Indica el trabajo realizado antes de finalizar.');

  const { data, error } = await supabase.rpc('finalize_work_order_visit', {
    visit_uuid: input.visitId,
    payload_json: buildClosePayload(input),
  });

  if (error) throw error;
  return mapVisitResult(data);
}

export async function finalizeActiveWorkOrderVisit(
  supabase: SupabaseClient,
  input: FinalizeActiveWorkOrderVisitInput,
): Promise<WorkOrderVisitResult> {
  requireUuid(input.workOrderId, 'No se ha indicado la OT a finalizar.');
  requireText(input.workDone, 'Indica el trabajo realizado antes de finalizar.');
  await assertCanFinishActiveVisit(supabase, input.workOrderId);

  const { data, error } = await supabase.rpc('finalize_active_work_order_visit', {
    work_order_uuid: input.workOrderId,
    payload_json: buildClosePayload(input),
  });

  if (error) throw error;
  return mapVisitResult(data);
}
