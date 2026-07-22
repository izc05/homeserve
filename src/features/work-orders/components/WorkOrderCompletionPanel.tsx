import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import { finalizeActiveWorkOrderVisit } from '../api/workOrderLifecycle';
import { listWorkOrderChecklist } from '../api/workOrderExecutionRepository';
import { listWorkOrderPhotos } from '../api/workOrderPhotoRepository';
import {
  evaluateCompletionRequirements,
  loadWorkOrderCompletionSupport,
  safeCompletionError,
  type WorkOrderCompletionSupport,
} from '../api/workOrderCompletionRepository';

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

export default function WorkOrderCompletionPanel({ order, canComplete, onCompleted, client }: WorkOrderCompletionPanelProps) {
  const supabase = client ?? getSupabaseClient();
  const queryClient = useQueryClient();
  const submitGuard = useRef(false);
  const [workSummary, setWorkSummary] = useState('');
  const [confirmed, setConfirmed] = useState(false);
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

  const requirementItems = useMemo(() => evaluateCompletionRequirements(
    order.requirements,
    checklistQuery.data ?? [],
    photosQuery.data ?? [],
    supportQuery.data ?? emptySupport,
  ), [checklistQuery.data, order.requirements, photosQuery.data, supportQuery.data]);
  const pendingRequirements = requirementItems.filter((item) => item.required && !item.complete);
  const isLoading = checklistQuery.isLoading || photosQuery.isLoading || supportQuery.isLoading;
  const hasQueryError = Boolean(checklistQuery.error || photosQuery.error || supportQuery.error);
  const isActive = order.status === 'EN_CURSO' && canComplete;

  const mutation = useMutation({
    mutationFn: () => finalizeActiveWorkOrderVisit(supabase, {
      workOrderId: order.id,
      workDone: workSummary,
      result: 'trabajo_completado',
    }),
    onSuccess: async () => {
      setConfirmed(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-orders', order.tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-audit', order.tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-completion-support', order.id] }),
      ]);
      await onCompleted?.();
    },
    onSettled: () => {
      submitGuard.current = false;
    },
  });

  const submit = () => {
    if (submitGuard.current || mutation.isPending || !isActive || isLoading || hasQueryError) return;
    if (!workSummary.trim() || !confirmed || pendingRequirements.length > 0) return;
    submitGuard.current = true;
    mutation.mutate();
  };

  return <section className="execution-card completion-panel" aria-labelledby={`completion-title-${order.id}`}>
    <div className="execution-card-heading">
      <div className="execution-card-title"><span className="execution-card-icon" aria-hidden="true"><ClipboardCheck size={20} /></span><div><h2 id={`completion-title-${order.id}`}>Finalización técnica</h2><p>Comprueba la intervención y confirma el cierre técnico de forma explícita.</p></div></div>
      <span className="private-evidence-badge"><ShieldCheck size={14} aria-hidden="true" /> Cierre protegido</span>
    </div>

    {!isActive && <p className="read-only-note"><LockKeyhole size={16} /> La finalización solo está disponible para el técnico asignado mientras la OT está en curso.</p>}

    <div className="completion-requirements" aria-label="Requisitos de finalización">
      {requirementItems.map((item) => {
        const state = !item.required ? 'optional' : item.complete ? 'complete' : 'pending';
        return <div className={`completion-requirement is-${state}`} key={item.id}>
          <span aria-hidden="true">{state === 'complete' ? <CheckCircle2 size={19} /> : state === 'pending' ? <AlertTriangle size={19} /> : <Circle size={19} />}</span>
          <span><strong>{item.label}</strong><small>{item.required ? item.detail : 'No obligatorio'}</small>{item.required && !item.available && !item.complete && <small>No se puede registrar desde esta versión.</small>}</span>
          <b>{state === 'complete' ? 'Cumplido' : state === 'pending' ? 'Pendiente' : 'No obligatorio'}</b>
        </div>;
      })}
    </div>

    {isLoading && <div className="execution-loading"><LoaderCircle className="spin" size={20} /> Comprobando requisitos reales…</div>}
    {hasQueryError && <p className="execution-inline-error" role="alert"><AlertTriangle size={17} /> No se pudieron comprobar todos los requisitos. No se realizará el cierre.</p>}
    {!isLoading && !hasQueryError && pendingRequirements.length > 0 && <p className="completion-pending-note"><AlertTriangle size={17} /> Pendiente: {pendingRequirements.map((item) => item.label.toLowerCase()).join(', ')}.</p>}

    <label className="completion-summary-field" htmlFor={`completion-summary-${order.id}`}>
      <span>Resumen del trabajo <b aria-hidden="true">*</b></span>
      <textarea
        disabled={!isActive || mutation.isPending}
        id={`completion-summary-${order.id}`}
        maxLength={4000}
        onChange={(event) => setWorkSummary(event.target.value)}
        placeholder="Describe el trabajo realizado, el resultado y cualquier observación relevante."
        rows={5}
        value={workSummary}
      />
      <small>{workSummary.length} / 4000 · obligatorio</small>
    </label>

    <label className="completion-confirmation">
      <input checked={confirmed} disabled={!isActive || mutation.isPending} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
      <span>Confirmo que el resumen y las evidencias corresponden a la intervención realizada.</span>
    </label>

    {mutation.error && <p className="execution-inline-error" role="alert"><AlertTriangle size={17} /> {safeCompletionError(mutation.error)}</p>}
    {mutation.isSuccess && <p className="completion-success" role="status"><CheckCircle2 size={17} /> Intervención finalizada y enviada a revisión administrativa.</p>}

    <div className="completion-actions">
      <button
        className="primary-button"
        disabled={!isActive || isLoading || hasQueryError || pendingRequirements.length > 0 || !workSummary.trim() || !confirmed || mutation.isPending || mutation.isSuccess}
        onClick={submit}
        type="button"
      >
        {mutation.isPending ? <LoaderCircle className="spin" size={17} /> : <CheckCircle2 size={17} />} {mutation.isPending ? 'Finalizando…' : 'Finalizar intervención'}
      </button>
    </div>
  </section>;
}

export function WorkOrderVisitSummaryPanel({ workOrderId, displayDate, client }: { workOrderId: string; displayDate: (value: string | null) => string; client?: SupabaseClient }) {
  const supabase = client ?? getSupabaseClient();
  const query = useQuery({
    queryKey: ['work-order-completion-support', workOrderId],
    queryFn: () => loadWorkOrderCompletionSupport(supabase, workOrderId),
    enabled: Boolean(workOrderId),
  });
  const visit = query.data?.latestVisit ?? null;

  return <section className="execution-card visit-summary-panel" aria-labelledby={`visit-summary-title-${workOrderId}`}>
    <div className="execution-card-heading"><div className="execution-card-title"><span className="execution-card-icon" aria-hidden="true"><ClipboardCheck size={20} /></span><div><h2 id={`visit-summary-title-${workOrderId}`}>Resumen técnico</h2><p>Resultado real guardado en la última intervención.</p></div></div></div>
    {query.isLoading && <div className="execution-loading"><LoaderCircle className="spin" size={20} /> Cargando intervención…</div>}
    {query.error && <p className="execution-inline-error" role="alert"><AlertTriangle size={17} /> No se pudo cargar el resumen técnico.</p>}
    {!query.isLoading && !query.error && !visit && <div className="execution-empty-state"><ClipboardCheck size={21} /><strong>Sin resumen técnico</strong><p>El resumen aparecerá cuando exista una intervención registrada.</p></div>}
    {visit && <dl className="visit-summary-grid">
      <div><dt>Inicio</dt><dd>{displayDate(visit.startedAt)}</dd></div>
      <div><dt>Finalización</dt><dd>{visit.finishedAt ? displayDate(visit.finishedAt) : 'Intervención en curso'}</dd></div>
      <div className="visit-summary-wide"><dt>Trabajo realizado</dt><dd>{visit.workDone || 'Pendiente de completar'}</dd></div>
      <div><dt>Diagnóstico</dt><dd>{visit.diagnosis || 'Sin diagnóstico adicional'}</dd></div>
      <div><dt>Pruebas</dt><dd>{visit.tests || 'Sin pruebas adicionales'}</dd></div>
      <div><dt>Recomendaciones</dt><dd>{visit.recommendations || 'Sin recomendaciones'}</dd></div>
      <div><dt>Trabajo pendiente</dt><dd>{visit.pendingWork || 'Sin trabajo pendiente'}</dd></div>
    </dl>}
  </section>;
}
