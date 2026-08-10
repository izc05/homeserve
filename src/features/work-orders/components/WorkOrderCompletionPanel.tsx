import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import { listWorkOrderChecklist } from '../api/workOrderExecutionRepository';
import { listWorkOrderPhotos } from '../api/workOrderPhotoRepository';
import {
  evaluateCompletionRequirements,
  loadWorkOrderCompletionSupport,
  safeCompletionError,
  type WorkOrderCompletionSupport,
} from '../api/workOrderCompletionRepository';
import {
  activeParticipantRole,
  closeMyWorkOrderVisit,
  finalizeWorkOrderTechnical,
  listWorkOrderParticipants,
  listWorkOrderVisits,
} from '../api/workOrderTeamRepository';

export type WorkOrderCompletionPanelProps = {
  order: WorkOrderListItem;
  canComplete: boolean;
  onCompleted?: () => void | Promise<void>;
  client?: SupabaseClient;
};

const emptySupport: WorkOrderCompletionSupport = {
  technicianSignatures: 0,
  responsibleSignatures: 0,
  reports: 0,
  latestVisit: null,
};

function workOrderTeamError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : '';
  if (/^(No se puede finalizar|Solo el técnico responsable|Solo un técnico participante|No tienes una visita|Indica el trabajo realizado|Resultado de cierre)/i.test(message)) return message;
  return safeCompletionError(error);
}

export default function WorkOrderCompletionPanel({ order, canComplete, onCompleted, client }: WorkOrderCompletionPanelProps) {
  const supabase = client ?? getSupabaseClient();
  const queryClient = useQueryClient();
  const [visitSummary, setVisitSummary] = useState('');
  const [visitResult, setVisitResult] = useState<'trabajo_completado' | 'pendiente_material' | 'pendiente_cliente' | 'necesita_otra_visita'>('trabajo_completado');
  const [finalSummary, setFinalSummary] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const viewerQuery = useQuery({
    queryKey: ['work-order-current-user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user?.id ?? null;
    },
  });
  const participantsQuery = useQuery({
    queryKey: ['work-order-participants', order.id],
    queryFn: () => listWorkOrderParticipants(supabase, order.id),
    enabled: Boolean(order.id),
  });
  const visitsQuery = useQuery({
    queryKey: ['work-order-visits', order.id],
    queryFn: () => listWorkOrderVisits(supabase, order.id),
    enabled: Boolean(order.id),
  });
  const checklistQuery = useQuery({
    queryKey: ['work-order-checklist', order.id],
    queryFn: () => listWorkOrderChecklist(supabase, order.id),
    enabled: Boolean(order.id),
  });
  const photosQuery = useQuery({
    queryKey: ['work-order-photos', order.id],
    queryFn: () => listWorkOrderPhotos(supabase, order.id),
    enabled: Boolean(order.id),
  });
  const supportQuery = useQuery({
    queryKey: ['work-order-completion-support', order.id],
    queryFn: () => loadWorkOrderCompletionSupport(supabase, order.id),
    enabled: Boolean(order.id),
  });

  const viewerId = viewerQuery.data ?? null;
  const participantRole = viewerId ? activeParticipantRole(participantsQuery.data ?? [], viewerId) : null;
  const visits = visitsQuery.data ?? [];
  const activeVisits = visits.filter((visit) => visit.status === 'EN_CURSO');
  const ownActiveVisit = viewerId
    ? activeVisits.find((visit) => visit.technicianId === viewerId) ?? null
    : null;
  const canCloseOwnVisit = Boolean(participantRole && ownActiveVisit && ['EN_CURSO', 'BLOQUEADA'].includes(order.status));
  const isResponsible = participantRole === 'responsable' || (canComplete && order.assignedTo === viewerId);

  const requirementItems = useMemo(() => evaluateCompletionRequirements(
    order.requirements,
    checklistQuery.data ?? [],
    photosQuery.data ?? [],
    supportQuery.data ?? emptySupport,
  ), [checklistQuery.data, order.requirements, photosQuery.data, supportQuery.data]);
  const pendingRequirements = requirementItems.filter((item) => item.required && !item.complete);
  const requirementsLoading = checklistQuery.isLoading || photosQuery.isLoading || supportQuery.isLoading;
  const requirementsError = Boolean(checklistQuery.error || photosQuery.error || supportQuery.error);
  const canFinalizeOrder = Boolean(isResponsible && order.status === 'EN_CURSO' && activeVisits.length === 0);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['work-orders', order.tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-audit', order.tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-visits', order.id] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-completion-support', order.id] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-participants', order.id] }),
    ]);
  };

  const closeVisitMutation = useMutation({
    mutationFn: () => closeMyWorkOrderVisit(supabase, {
      workOrderId: order.id,
      workDone: visitSummary,
      result: visitResult,
    }),
    onSuccess: async () => {
      setVisitSummary('');
      await invalidate();
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeWorkOrderTechnical(supabase, order.id, finalSummary),
    onSuccess: async () => {
      setConfirmed(false);
      await invalidate();
      await onCompleted?.();
    },
  });

  return <div className="administrative-evidence-stack">
    <section className="execution-card completion-panel" aria-labelledby={`visit-close-title-${order.id}`}>
      <div className="execution-card-heading">
        <div className="execution-card-title"><span className="execution-card-icon" aria-hidden="true"><Clock3 size={20} /></span><div><h2 id={`visit-close-title-${order.id}`}>Mi visita</h2><p>Cierra únicamente tu intervención. La OT seguirá abierta hasta el cierre del responsable.</p></div></div>
        <span className="private-evidence-badge"><UsersRound size={14} aria-hidden="true" /> {participantRole === 'responsable' ? 'Responsable' : participantRole === 'colaborador' ? 'Colaborador' : 'Consulta'}</span>
      </div>

      {!canCloseOwnVisit && <p className="read-only-note"><LockKeyhole size={16} /> {participantRole ? 'No tienes una visita activa que cerrar en este momento.' : 'Debes ser participante activo de la OT para cerrar una visita.'}</p>}
      {ownActiveVisit && <p className="read-only-note"><UserRound size={16} /> Visita iniciada {ownActiveVisit.startedAt ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ownActiveVisit.startedAt)) : 'sin fecha disponible'}.</p>}

      <label className="completion-summary-field" htmlFor={`visit-summary-${order.id}`}>
        <span>Trabajo realizado en esta visita <b aria-hidden="true">*</b></span>
        <textarea disabled={!canCloseOwnVisit || closeVisitMutation.isPending} id={`visit-summary-${order.id}`} maxLength={4000} onChange={(event) => setVisitSummary(event.target.value)} placeholder="Describe qué has hecho en esta intervención." rows={4} value={visitSummary} />
      </label>
      <label className="completion-summary-field" htmlFor={`visit-result-${order.id}`}>
        <span>Resultado de mi visita</span>
        <select disabled={!canCloseOwnVisit || closeVisitMutation.isPending} id={`visit-result-${order.id}`} onChange={(event) => setVisitResult(event.target.value as typeof visitResult)} value={visitResult}>
          <option value="trabajo_completado">Trabajo completado</option>
          <option value="necesita_otra_visita">Necesita otra visita</option>
          <option value="pendiente_material">Pendiente de material</option>
          <option value="pendiente_cliente">Pendiente del cliente</option>
        </select>
      </label>
      {closeVisitMutation.error && <p className="execution-inline-error"><AlertTriangle size={17} /> {workOrderTeamError(closeVisitMutation.error)}</p>}
      {closeVisitMutation.isSuccess && <p className="completion-success"><CheckCircle2 size={17} /> Tu visita ha quedado cerrada. La OT permanece disponible para el equipo.</p>}
      <div className="completion-actions"><button className="secondary-button" disabled={!canCloseOwnVisit || !visitSummary.trim() || closeVisitMutation.isPending} onClick={() => closeVisitMutation.mutate()} type="button">{closeVisitMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <CheckCircle2 size={17} />} {closeVisitMutation.isPending ? 'Cerrando visita…' : 'Cerrar mi visita'}</button></div>
    </section>

    {isResponsible && <section className="execution-card completion-panel" aria-labelledby={`completion-title-${order.id}`}>
      <div className="execution-card-heading">
        <div className="execution-card-title"><span className="execution-card-icon" aria-hidden="true"><ClipboardCheck size={20} /></span><div><h2 id={`completion-title-${order.id}`}>Finalizar OT</h2><p>Acción global del responsable. Comprueba todas las visitas y requisitos antes de enviar a revisión.</p></div></div>
        <span className="private-evidence-badge"><ShieldCheck size={14} aria-hidden="true" /> Responsable</span>
      </div>

      {activeVisits.length > 0 && <p className="completion-pending-note"><AlertTriangle size={17} /> Quedan {activeVisits.length} visita{activeVisits.length === 1 ? '' : 's'} en curso. Deben cerrarse antes de finalizar la OT.</p>}

      <div className="completion-requirements" aria-label="Requisitos de finalización">
        {requirementItems.map((item) => {
          const state = !item.required ? 'optional' : item.complete ? 'complete' : 'pending';
          return <div className={`completion-requirement is-${state}`} key={item.id}>
            <span aria-hidden="true">{state === 'complete' ? <CheckCircle2 size={19} /> : state === 'pending' ? <AlertTriangle size={19} /> : <Circle size={19} />}</span>
            <span><strong>{item.label}</strong><small>{item.required ? item.detail : 'No obligatorio'}</small></span>
            <b>{state === 'complete' ? 'Cumplido' : state === 'pending' ? 'Pendiente' : 'No obligatorio'}</b>
          </div>;
        })}
      </div>

      {requirementsLoading && <div className="execution-loading"><LoaderCircle className="spin" size={20} /> Comprobando requisitos reales…</div>}
      {requirementsError && <p className="execution-inline-error"><AlertTriangle size={17} /> No se pudieron comprobar todos los requisitos.</p>}
      {!requirementsLoading && !requirementsError && pendingRequirements.length > 0 && <p className="completion-pending-note"><AlertTriangle size={17} /> Pendiente: {pendingRequirements.map((item) => item.label.toLowerCase()).join(', ')}.</p>}

      <label className="completion-summary-field" htmlFor={`completion-summary-${order.id}`}>
        <span>Resumen técnico global <b aria-hidden="true">*</b></span>
        <textarea disabled={!canFinalizeOrder || finalizeMutation.isPending} id={`completion-summary-${order.id}`} maxLength={4000} onChange={(event) => setFinalSummary(event.target.value)} placeholder="Resume el resultado final de todas las intervenciones realizadas." rows={5} value={finalSummary} />
      </label>
      <label className="completion-confirmation"><input checked={confirmed} disabled={!canFinalizeOrder || finalizeMutation.isPending} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" /><span>Confirmo que todas las visitas están cerradas y la OT está preparada para revisión administrativa.</span></label>

      {finalizeMutation.error && <p className="execution-inline-error"><AlertTriangle size={17} /> {workOrderTeamError(finalizeMutation.error)}</p>}
      {finalizeMutation.isSuccess && <p className="completion-success"><CheckCircle2 size={17} /> OT finalizada técnicamente y enviada a revisión administrativa.</p>}
      <div className="completion-actions"><button className="primary-button" disabled={!canFinalizeOrder || requirementsLoading || requirementsError || pendingRequirements.length > 0 || !finalSummary.trim() || !confirmed || finalizeMutation.isPending} onClick={() => finalizeMutation.mutate()} type="button">{finalizeMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <CheckCircle2 size={17} />} {finalizeMutation.isPending ? 'Finalizando OT…' : 'Finalizar OT'}</button></div>
    </section>}
  </div>;
}

export function WorkOrderVisitSummaryPanel({ workOrderId, displayDate, client }: { workOrderId: string; displayDate: (value: string | null) => string; client?: SupabaseClient }) {
  const supabase = client ?? getSupabaseClient();
  const query = useQuery({
    queryKey: ['work-order-visits', workOrderId],
    queryFn: () => listWorkOrderVisits(supabase, workOrderId),
    enabled: Boolean(workOrderId),
  });
  const visits = query.data ?? [];

  return <section className="execution-card visit-summary-panel" aria-labelledby={`visit-summary-title-${workOrderId}`}>
    <div className="execution-card-heading"><div className="execution-card-title"><span className="execution-card-icon" aria-hidden="true"><ClipboardCheck size={20} /></span><div><h2 id={`visit-summary-title-${workOrderId}`}>Visitas e intervenciones</h2><p>Histórico técnico de todos los participantes de la OT.</p></div></div><span className="source-badge">{visits.length}</span></div>
    {query.isLoading && <div className="execution-loading"><LoaderCircle className="spin" size={20} /> Cargando visitas…</div>}
    {query.error && <p className="execution-inline-error"><AlertTriangle size={17} /> No se pudo cargar el histórico de visitas.</p>}
    {!query.isLoading && !query.error && visits.length === 0 && <div className="execution-empty-state"><ClipboardCheck size={21} /><strong>Sin visitas registradas</strong><p>Las intervenciones aparecerán aquí cuando el equipo empiece a trabajar.</p></div>}
    {visits.length > 0 && <div className="day-plan-list">{visits.map((visit) => <div key={visit.id}><UserRound size={18} /><span><strong>{visit.technicianName}</strong><small>{displayDate(visit.startedAt)} → {visit.finishedAt ? displayDate(visit.finishedAt) : 'En curso'}{visit.workDone ? ` · ${visit.workDone}` : ''}</small></span><span className="source-badge">{visit.status === 'EN_CURSO' ? 'En curso' : 'Finalizada'}</span></div>)}</div>}
  </section>;
}
