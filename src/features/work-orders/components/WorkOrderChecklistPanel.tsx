import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  RotateCcw,
  Save,
} from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  checklistProgress,
  listWorkOrderChecklist,
  prepareWorkOrderChecklist,
  saveWorkOrderChecklistResponse,
  type WorkOrderChecklistResponse,
} from '../api/workOrderExecutionRepository';

type SaveState = 'pending' | 'saving' | 'saved' | 'error';
type Draft = { result: string; observations: string };

export type WorkOrderChecklistPanelProps = {
  workOrderId: string;
  canEdit: boolean;
  client?: SupabaseClient;
  heading?: ReactNode;
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function initialDraft(row: WorkOrderChecklistResponse): Draft {
  return { result: row.result ?? '', observations: row.observations ?? '' };
}

function stateLabel(state: SaveState, hasResult: boolean) {
  if (state === 'saving') return 'Guardando';
  if (state === 'saved' || (state === 'pending' && hasResult)) return 'Guardado';
  if (state === 'error') return 'Error';
  return 'Pendiente';
}

export default function WorkOrderChecklistPanel({
  workOrderId,
  canEdit,
  client,
  heading = 'Checklist de intervención',
}: WorkOrderChecklistPanelProps) {
  const supabase = client ?? getSupabaseClient();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['work-order-checklist', workOrderId], [workOrderId]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey,
    queryFn: () => listWorkOrderChecklist(supabase, workOrderId),
    enabled: Boolean(workOrderId),
  });

  useEffect(() => {
    if (!query.data) return;
    setDrafts((current) => Object.fromEntries(query.data.map((row) => [row.id, current[row.id] ?? initialDraft(row)])));
  }, [query.data]);

  const prepareMutation = useMutation({
    mutationFn: () => prepareWorkOrderChecklist(supabase, workOrderId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey }),
  });

  const saveMutation = useMutation({
    mutationFn: ({ row, draft }: { row: WorkOrderChecklistResponse; draft: Draft }) => saveWorkOrderChecklistResponse(supabase, {
      responseId: row.id,
      result: draft.result,
      observations: draft.observations,
    }),
    onMutate: ({ row }) => {
      setStates((current) => ({ ...current, [row.id]: 'saving' }));
      setErrors((current) => ({ ...current, [row.id]: '' }));
    },
    onSuccess: async (saved) => {
      setDrafts((current) => ({ ...current, [saved.id]: initialDraft(saved) }));
      setStates((current) => ({ ...current, [saved.id]: 'saved' }));
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error, { row }) => {
      setStates((current) => ({ ...current, [row.id]: 'error' }));
      setErrors((current) => ({ ...current, [row.id]: errorMessage(error, 'No se pudo guardar este punto.') }));
    },
  });

  const rows = query.data ?? [];
  const progress = checklistProgress(rows);

  const updateDraft = (id: string, next: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { result: '', observations: '' }), ...next },
    }));
    setStates((current) => ({ ...current, [id]: 'pending' }));
    setErrors((current) => ({ ...current, [id]: '' }));
  };

  return <section className="execution-card checklist-panel" aria-labelledby={`checklist-title-${workOrderId}`}>
    <div className="execution-card-heading">
      <div className="execution-card-title">
        <span className="execution-card-icon" aria-hidden="true"><ClipboardCheck size={20} /></span>
        <div><h2 id={`checklist-title-${workOrderId}`}>{heading}</h2><p>Respuestas reales guardadas en la orden de trabajo.</p></div>
      </div>
      <div className="checklist-progress-copy" aria-label={`${progress.completed} de ${progress.total} puntos completados`}>
        <strong>{progress.completed} / {progress.total}</strong><span>completados</span>
      </div>
    </div>

    <div className="checklist-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total || 1} aria-valuenow={progress.completed}>
      <span style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} />
    </div>

    {query.isLoading && <div className="execution-loading"><LoaderCircle className="spin" size={21} /><span>Cargando checklist…</span></div>}
    {query.error && <div className="execution-error" role="alert"><AlertTriangle size={18} /><span>{errorMessage(query.error, 'No se pudo cargar el checklist.')}</span><button className="secondary-button" onClick={() => void query.refetch()} type="button">Reintentar</button></div>}

    {!query.isLoading && !query.error && rows.length === 0 && <div className="execution-empty-state">
      <ClipboardCheck size={22} aria-hidden="true" />
      <strong>Checklist todavía no preparado</strong>
      <p>Se crearán únicamente los puntos definidos por la configuración real de esta OT.</p>
      {canEdit && <button className="primary-button" disabled={prepareMutation.isPending} onClick={() => prepareMutation.mutate()} type="button">
        {prepareMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Preparar checklist
      </button>}
      {prepareMutation.error && <p className="execution-inline-error" role="alert">{errorMessage(prepareMutation.error, 'No se pudo preparar el checklist.')}</p>}
    </div>}

    {rows.length > 0 && <div className="checklist-items">
      {rows.map((row) => {
        const draft = drafts[row.id] ?? initialDraft(row);
        const state = states[row.id] ?? 'pending';
        const busy = saveMutation.isPending;
        const label = stateLabel(state, Boolean(row.result));
        return <article className="checklist-item" key={row.id}>
          <div className="checklist-item-heading">
            <span className="checklist-item-order">{row.order}</span>
            <div><h3>{row.point}</h3>{row.description && <p>{row.description}</p>}</div>
            <span className={`checklist-save-state is-${state}`} aria-live="polite">
              {state === 'saving' ? <LoaderCircle className="spin" size={14} /> : state === 'error' ? <AlertTriangle size={14} /> : label === 'Guardado' ? <CheckCircle2 size={14} /> : null}
              {label}
            </span>
          </div>

          <div className="checklist-item-flags">
            <span>{row.required ? 'Obligatorio' : 'Opcional'}</span>
            {row.requiresPhoto && <span><Camera size={14} aria-hidden="true" /> Requiere fotografía</span>}
          </div>

          {row.responseType === 'ok_ko_na' ? <fieldset className="checklist-choice-group" disabled={!canEdit || busy}>
            <legend>Resultado</legend>
            {([['ok', 'OK'], ['ko', 'KO'], ['na', 'No aplica']] as const).map(([value, labelText]) => <button className={draft.result === value ? 'is-selected' : ''} aria-pressed={draft.result === value} key={value} onClick={() => updateDraft(row.id, { result: value })} type="button">{labelText}</button>)}
          </fieldset> : <label className="execution-field">
            <span>{row.responseType === 'medicion' ? 'Medición o valor' : 'Respuesta'}</span>
            <textarea disabled={!canEdit || busy} onChange={(event) => updateDraft(row.id, { result: event.target.value })} rows={2} value={draft.result} />
          </label>}

          <label className="execution-field">
            <span>Observaciones <small>(opcional)</small></span>
            <textarea disabled={!canEdit || busy} onChange={(event) => updateDraft(row.id, { observations: event.target.value })} rows={2} value={draft.observations} />
          </label>

          {canEdit && <div className="checklist-item-actions">
            <button className="secondary-button" disabled={busy || (!draft.result && !draft.observations)} onClick={() => updateDraft(row.id, { result: '', observations: '' })} type="button"><RotateCcw size={16} /> Dejar pendiente</button>
            <button className="primary-button" disabled={busy} onClick={() => saveMutation.mutate({ row, draft })} type="button">{state === 'saving' ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Guardar punto</button>
          </div>}
          {errors[row.id] && <p className="execution-inline-error" role="alert">{errors[row.id]}</p>}
        </article>;
      })}
    </div>}

    {!canEdit && rows.length > 0 && <p className="execution-readonly-note">El checklist está en modo consulta. Solo el técnico asignado puede editarlo mientras la OT está en curso.</p>}
  </section>;
}
