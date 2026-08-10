import type { SupabaseClient } from '@supabase/supabase-js';

export type WorkOrderParticipantRole = 'responsable' | 'colaborador';
export type WorkOrderParticipantStatus = 'activo' | 'retirado';

export type WorkOrderParticipant = {
  id: string;
  workOrderId: string;
  technicianId: string;
  technicianName: string;
  role: WorkOrderParticipantRole;
  status: WorkOrderParticipantStatus;
  addedAt: string;
  removedAt: string | null;
  reason: string | null;
};

export type WorkOrderVisit = {
  id: string;
  workOrderId: string;
  technicianId: string;
  technicianName: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  workDone: string | null;
  diagnosis: string | null;
  tests: string | null;
  recommendations: string | null;
  pendingWork: string | null;
  closeReason: string | null;
  nextAction: string | null;
  result: string | null;
};

export type CloseMyVisitInput = {
  workOrderId: string;
  workDone: string;
  diagnosis?: string | null;
  tests?: string | null;
  recommendations?: string | null;
  pendingWork?: string | null;
  closeReason?: string | null;
  nextAction?: string | null;
  finalAssetStatus?: string | null;
  result?: 'trabajo_completado' | 'pendiente_material' | 'pendiente_cliente' | 'necesita_otra_visita';
};

export type HandoverWorkOrderInput = {
  workOrderId: string;
  nextTechnicianId: string;
  note: string;
  keepPreviousAsCollaborator: boolean;
};

type ParticipantRow = {
  id: string;
  ot_id: string;
  tecnico_id: string;
  rol: WorkOrderParticipantRole;
  estado: WorkOrderParticipantStatus;
  added_at: string;
  removed_at: string | null;
  motivo: string | null;
};

type VisitRow = {
  id: string;
  ot_id: string;
  tecnico_id: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  trabajo_realizado: string | null;
  diagnostico: string | null;
  pruebas_realizadas: string | null;
  recomendaciones: string | null;
  trabajo_pendiente: string | null;
  motivo_cierre: string | null;
  proxima_accion: string | null;
  resultado_cierre: string | null;
};

type ProfileRow = { id: string; nombre: string | null };

function requireId(value: string, label: string) {
  if (!value?.trim()) throw new Error(`No se ha indicado ${label}.`);
}

function nullable(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

async function profileNames(supabase: SupabaseClient, ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from('profiles')
    .select('id,nombre')
    .in('id', uniqueIds);
  if (error) throw error;

  return new Map(
    ((data ?? []) as unknown as ProfileRow[]).map((row) => [
      String(row.id),
      String(row.nombre || 'Técnico sin nombre'),
    ]),
  );
}

export async function listWorkOrderParticipants(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderParticipant[]> {
  requireId(workOrderId, 'la OT');

  const { data, error } = await supabase
    .from('ot_participantes')
    .select('id,ot_id,tecnico_id,rol,estado,added_at,removed_at,motivo')
    .eq('ot_id', workOrderId)
    .order('added_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as ParticipantRow[];
  const names = await profileNames(supabase, rows.map((row) => String(row.tecnico_id)));

  return rows.map((row) => ({
    id: String(row.id),
    workOrderId: String(row.ot_id),
    technicianId: String(row.tecnico_id),
    technicianName: names.get(String(row.tecnico_id)) ?? 'Técnico sin nombre',
    role: row.rol,
    status: row.estado,
    addedAt: String(row.added_at),
    removedAt: row.removed_at ? String(row.removed_at) : null,
    reason: nullable(row.motivo),
  }));
}

export async function listWorkOrderVisits(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderVisit[]> {
  requireId(workOrderId, 'la OT');

  const { data, error } = await supabase
    .from('ot_visitas')
    .select('id,ot_id,tecnico_id,estado,fecha_inicio,fecha_fin,trabajo_realizado,diagnostico,pruebas_realizadas,recomendaciones,trabajo_pendiente,motivo_cierre,proxima_accion,resultado_cierre')
    .eq('ot_id', workOrderId)
    .order('fecha_inicio', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as VisitRow[];
  const names = await profileNames(supabase, rows.map((row) => String(row.tecnico_id)));

  return rows.map((row) => ({
    id: String(row.id),
    workOrderId: String(row.ot_id),
    technicianId: String(row.tecnico_id),
    technicianName: names.get(String(row.tecnico_id)) ?? 'Técnico sin nombre',
    status: String(row.estado),
    startedAt: row.fecha_inicio ? String(row.fecha_inicio) : null,
    finishedAt: row.fecha_fin ? String(row.fecha_fin) : null,
    workDone: nullable(row.trabajo_realizado),
    diagnosis: nullable(row.diagnostico),
    tests: nullable(row.pruebas_realizadas),
    recommendations: nullable(row.recomendaciones),
    pendingWork: nullable(row.trabajo_pendiente),
    closeReason: nullable(row.motivo_cierre),
    nextAction: nullable(row.proxima_accion),
    result: nullable(row.resultado_cierre),
  }));
}

export async function setWorkOrderCollaborator(
  supabase: SupabaseClient,
  input: { workOrderId: string; technicianId: string; enabled: boolean; reason?: string | null },
) {
  requireId(input.workOrderId, 'la OT');
  requireId(input.technicianId, 'el técnico');

  const { data, error } = await supabase.rpc('set_work_order_collaborator', {
    work_order_uuid: input.workOrderId,
    technician_uuid: input.technicianId,
    enabled: input.enabled,
    reason_text: nullable(input.reason),
  });
  if (error) throw error;
  return data;
}

export async function closeMyWorkOrderVisit(
  supabase: SupabaseClient,
  input: CloseMyVisitInput,
) {
  requireId(input.workOrderId, 'la OT');
  if (!input.workDone.trim()) throw new Error('Indica el trabajo realizado antes de cerrar la visita.');

  const { data, error } = await supabase.rpc('close_my_work_order_visit', {
    work_order_uuid: input.workOrderId,
    payload_json: {
      trabajo_realizado: input.workDone.trim(),
      diagnostico: nullable(input.diagnosis),
      pruebas_realizadas: nullable(input.tests),
      recomendaciones: nullable(input.recommendations),
      trabajo_pendiente: nullable(input.pendingWork),
      motivo_cierre: nullable(input.closeReason),
      proxima_accion: nullable(input.nextAction),
      estado_final_activo: nullable(input.finalAssetStatus),
      resultado_cierre: input.result ?? 'trabajo_completado',
    },
  });
  if (error) throw error;
  return data;
}

export async function finalizeWorkOrderTechnical(
  supabase: SupabaseClient,
  workOrderId: string,
  summary: string,
) {
  requireId(workOrderId, 'la OT');
  if (!summary.trim()) throw new Error('Indica el resumen técnico final de la OT.');

  const { data, error } = await supabase.rpc('finalize_work_order_technical', {
    work_order_uuid: workOrderId,
    summary_text: summary.trim(),
  });
  if (error) throw error;
  return data;
}

export async function handoverWorkOrderResponsibility(
  supabase: SupabaseClient,
  input: HandoverWorkOrderInput,
) {
  requireId(input.workOrderId, 'la OT');
  requireId(input.nextTechnicianId, 'el técnico entrante');
  if (input.note.trim().length < 5) throw new Error('Indica una nota de relevo de al menos 5 caracteres.');

  const { data, error } = await supabase.rpc('handover_work_order_responsibility', {
    work_order_uuid: input.workOrderId,
    next_technician_uuid: input.nextTechnicianId,
    note_text: input.note.trim(),
    keep_previous_as_collaborator: input.keepPreviousAsCollaborator,
  });
  if (error) throw error;
  return data;
}

export function activeParticipantRole(
  participants: WorkOrderParticipant[],
  technicianId: string,
): WorkOrderParticipantRole | null {
  return participants.find((participant) =>
    participant.technicianId === technicianId && participant.status === 'activo')?.role ?? null;
}
