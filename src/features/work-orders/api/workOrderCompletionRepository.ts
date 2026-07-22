import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkOrderRequirements } from '../types/workOrder';
import type { WorkOrderChecklistResponse } from './workOrderExecutionRepository';
import type { WorkOrderPhoto } from './workOrderPhotoRepository';

export type WorkOrderVisitSummary = {
  id: string;
  workOrderId: string;
  technicianId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  workDone: string | null;
  diagnosis: string | null;
  tests: string | null;
  recommendations: string | null;
  pendingWork: string | null;
};

export type WorkOrderCompletionSupport = {
  technicianSignatures: number;
  responsibleSignatures: number;
  reports: number;
  latestVisit: WorkOrderVisitSummary | null;
};

export type CompletionRequirement = {
  id: string;
  label: string;
  required: boolean;
  complete: boolean;
  available: boolean;
  detail: string;
};

type SignatureRow = { tipo?: string | null };
type ReportRow = { path?: string | null };
type VisitRow = {
  id?: string;
  ot_id?: string;
  tecnico_id?: string;
  estado?: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  trabajo_realizado?: string | null;
  diagnostico?: string | null;
  pruebas_realizadas?: string | null;
  recomendaciones?: string | null;
  trabajo_pendiente?: string | null;
};

function requireUuid(value: string) {
  if (!value?.trim()) throw new Error('No se ha indicado la OT para consultar su finalización.');
}

export function safeCompletionError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : '';
  if (/^(No se puede finalizar|Solo el técnico asignado|No existe una visita|La OT validada o cancelada)/i.test(message)) {
    return message;
  }
  return 'No se pudo finalizar la intervención. Revisa los requisitos y vuelve a intentarlo.';
}

function mapVisit(row: VisitRow | null | undefined): WorkOrderVisitSummary | null {
  if (!row) return null;
  if (!row.id || !row.ot_id || !row.tecnico_id || !row.estado) {
    throw new Error('La base de datos devolvió una intervención incompleta.');
  }
  return {
    id: String(row.id),
    workOrderId: String(row.ot_id),
    technicianId: String(row.tecnico_id),
    status: String(row.estado),
    startedAt: row.fecha_inicio ?? null,
    finishedAt: row.fecha_fin ?? null,
    workDone: row.trabajo_realizado?.trim() || null,
    diagnosis: row.diagnostico?.trim() || null,
    tests: row.pruebas_realizadas?.trim() || null,
    recommendations: row.recomendaciones?.trim() || null,
    pendingWork: row.trabajo_pendiente?.trim() || null,
  };
}

export async function loadWorkOrderCompletionSupport(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderCompletionSupport> {
  requireUuid(workOrderId);
  const [signaturesResult, reportsResult, visitsResult] = await Promise.all([
    supabase.from('ot_firmas').select('tipo').eq('ot_id', workOrderId),
    supabase.from('ot_informes').select('path').eq('ot_id', workOrderId),
    supabase
      .from('ot_visitas')
      .select('id,ot_id,tecnico_id,estado,fecha_inicio,fecha_fin,trabajo_realizado,diagnostico,pruebas_realizadas,recomendaciones,trabajo_pendiente')
      .eq('ot_id', workOrderId)
      .order('fecha_inicio', { ascending: false })
      .limit(1),
  ]);

  if (signaturesResult.error) throw signaturesResult.error;
  if (reportsResult.error) throw reportsResult.error;
  if (visitsResult.error) throw visitsResult.error;

  const signatures = (signaturesResult.data ?? []) as unknown as SignatureRow[];
  const reports = (reportsResult.data ?? []) as unknown as ReportRow[];
  const visits = (visitsResult.data ?? []) as unknown as VisitRow[];
  return {
    technicianSignatures: signatures.filter((row) => row.tipo === 'tecnico').length,
    responsibleSignatures: signatures.filter((row) => row.tipo === 'responsable').length,
    reports: reports.filter((row) => Boolean(row.path?.trim())).length,
    latestVisit: mapVisit(visits[0]),
  };
}

function hasChecklistResult(rows: WorkOrderChecklistResponse[], templateItemId: string) {
  return rows.some((row) => row.templateItemId === templateItemId && Boolean(row.result?.trim()));
}

export function evaluateCompletionRequirements(
  requirements: WorkOrderRequirements,
  checklist: WorkOrderChecklistResponse[],
  photos: WorkOrderPhoto[],
  support: WorkOrderCompletionSupport,
): CompletionRequirement[] {
  const requiredChecklist = checklist.filter((row) => row.required);
  const checklistComplete = checklist.length > 0
    && requiredChecklist.every((row) => Boolean(row.result?.trim()));
  const photoChecklistRows = checklist.filter((row) => row.requiresPhoto);
  const checklistPhotosComplete = photoChecklistRows.every((row) =>
    photos.some((photo) => photo.checklistResponseId === row.id),
  );
  const initialPhotos = photos.filter((photo) => photo.category === 'initial').length;
  const finalPhotos = photos.filter((photo) => photo.category === 'final').length;

  return [
    {
      id: 'checklist',
      label: 'Checklist',
      required: requirements.checklist,
      complete: checklistComplete,
      available: true,
      detail: checklist.length
        ? `${checklist.filter((row) => Boolean(row.result?.trim())).length} de ${checklist.length} puntos completados`
        : 'Todavía no se ha preparado',
    },
    {
      id: 'checklist-photos',
      label: 'Fotos vinculadas al checklist',
      required: photoChecklistRows.length > 0,
      complete: checklistPhotosComplete,
      available: true,
      detail: photoChecklistRows.length > 0
        ? `${photoChecklistRows.filter((row) => photos.some((photo) => photo.checklistResponseId === row.id)).length} de ${photoChecklistRows.length} vinculadas`
        : 'No obligatorio',
    },
    {
      id: 'initial-photos',
      label: 'Fotografías iniciales',
      required: requirements.initialPhotos,
      complete: initialPhotos > 0,
      available: true,
      detail: `${initialPhotos} registrada${initialPhotos === 1 ? '' : 's'}`,
    },
    {
      id: 'final-photos',
      label: 'Fotografías finales',
      required: requirements.finalPhotos,
      complete: finalPhotos > 0,
      available: true,
      detail: `${finalPhotos} registrada${finalPhotos === 1 ? '' : 's'}`,
    },
    {
      id: 'measurements',
      label: 'Mediciones',
      required: requirements.measurements,
      complete: hasChecklistResult(checklist, 'mediciones'),
      available: true,
      detail: hasChecklistResult(checklist, 'mediciones') ? 'Registradas en checklist' : 'Sin registrar',
    },
    {
      id: 'materials',
      label: 'Materiales',
      required: requirements.materials,
      complete: hasChecklistResult(checklist, 'materiales'),
      available: true,
      detail: hasChecklistResult(checklist, 'materiales') ? 'Registrados en checklist' : 'Sin registrar',
    },
    {
      id: 'functional-test',
      label: 'Prueba funcional',
      required: requirements.finalFunctionalTest,
      complete: hasChecklistResult(checklist, 'prueba_funcional'),
      available: true,
      detail: hasChecklistResult(checklist, 'prueba_funcional') ? 'Registrada en checklist' : 'Sin registrar',
    },
    {
      id: 'technician-signature',
      label: 'Firma del técnico',
      required: requirements.technicianSignature,
      complete: support.technicianSignatures > 0,
      available: support.technicianSignatures > 0,
      detail: support.technicianSignatures > 0 ? 'Registrada' : 'No disponible en esta versión',
    },
    {
      id: 'responsible-signature',
      label: 'Firma del responsable',
      required: requirements.responsibleSignature,
      complete: support.responsibleSignatures > 0,
      available: support.responsibleSignatures > 0,
      detail: support.responsibleSignatures > 0 ? 'Registrada' : 'No disponible en esta versión',
    },
    {
      id: 'report',
      label: 'Informe técnico',
      required: requirements.report,
      complete: support.reports > 0,
      available: support.reports > 0,
      detail: support.reports > 0 ? `${support.reports} registrado${support.reports === 1 ? '' : 's'}` : 'No disponible en esta versión',
    },
  ];
}
