import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import ChecklistPointPhotos from './ChecklistPointPhotos';

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
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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
      numericValue: row.responseType === 'numero' && draft.result.trim() ? Number(draft.result) : null,
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

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const progress = checklistProgress(rows);
  const sections = useMemo(() => {
    const grouped = new Map<string, { id: string; title: string; order: number; rows: WorkOrderChecklistResponse[] }>();
    rows.forEach((row) => {
      const id = row.sectionId || `legacy-${row.sectionTitle}`;
      const section = grouped.get(id) ?? { id, title: row.sectionTitle, order: row.sectionOrder, rows: [] };
      section.rows.push(row);
      grouped.set(id, section);
    });
    return [...grouped.values()].sort((a, b) => a.order - b.order);
  }, [rows]);

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
        <strong>{progress.completed} / {progress.total}</strong><span>completados · {progress.conforming} conformes</span>
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

    {rows.length > 0 && <div className="checklist-sections">
      {sections.map((section) => {
        const collapsed = collapsedSections[section.id] === true;
        const sectionCompleted = section.rows.filter((row) => Boolean(row.result)).length;
        return <section className="checklist-section" key={section.id}>
          <button aria-expanded={!collapsed} className="checklist-section-toggle" onClick={() => setCollapsedSections((current) => ({ ...current, [section.id]: !collapsed }))} type="button"><span><strong>{section.title}</strong><small>{sectionCompleted} / {section.rows.length} completados</small></span>{collapsed ? <ChevronDown size={19} /> : <ChevronUp size={19} />}</button>
          {!collapsed && <div className="checklist-items">{section.rows.map((row) => {
        const draft = drafts[row.id] ?? initialDraft(row);
        const state = states[row.id] ?? 'pending';
        const busy = saveMutation.isPending;
        const label = stateLabel(state, Boolean(row.result));
        const negative = ['ko', 'no', 'incorrecto'].includes(draft.result.toLowerCase());
        const choices = row.responseType === 'ok_ko_na'
          ? [['ok', 'OK'], ['ko', 'KO'], ['na', 'No aplica']] as const
          : row.responseType === 'si_no_na'
            ? [['si', 'Sí'], ['no', 'No'], ['na', 'No aplica']] as const
            : row.responseType === 'correcto_incorrecto'
              ? [['correcto', 'Correcto'], ['incorrecto', 'Incorrecto']] as const
              : null;
        return <article className={`checklist-item ${negative ? 'is-negative' : ''}`} key={row.id}>
          <div className="checklist-item-heading">
            <span className="checklist-item-order">{row.order}</span>
            <div><h3>{row.point}</h3>{row.instructions && <p>{row.instructions}</p>}</div>
            <span className={`checklist-save-state is-${state}`} aria-live="polite">
              {state === 'saving' ? <LoaderCircle className="spin" size={14} /> : state === 'error' ? <AlertTriangle size={14} /> : label === 'Guardado' ? <CheckCircle2 size={14} /> : null}
              {label}
            </span>
          </div>

          <div className="checklist-item-flags">
            <span>{row.required ? 'Obligatorio' : 'Opcional'}</span>
            {row.requiresPhoto && <span><Camera size={14} aria-hidden="true" /> Requiere fotografía</span>}
            {row.negativeObservationRequired && <span><AlertTriangle size={14} aria-hidden="true" /> Observación ante negativo</span>}
            {row.critical && <span><AlertTriangle size={14} aria-hidden="true" /> Punto crítico</span>}
          </div>

          {choices ? <fieldset className="checklist-choice-group" disabled={!canEdit || busy}>
            <legend>Resultado</legend>
            {choices.map((choice) => { const [value, labelText] = choice; return <button className={draft.result === value ? 'is-selected' : ''} aria-pressed={draft.result === value} key={value} onClick={() => updateDraft(row.id, { result: value })} type="button">{labelText}</button>; })}
          </fieldset> : row.responseType === 'seleccion' ? <label className="execution-field"><span>Selecciona una respuesta</span><select disabled={!canEdit || busy} onChange={(event) => updateDraft(row.id, { result: event.target.value })} value={draft.result}><option value="">Pendiente</option>{row.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label> : row.responseType === 'numero' ? <label className="execution-field"><span>Medición {row.unit ? `(${row.unit})` : ''}</span><input disabled={!canEdit || busy} inputMode="decimal" onChange={(event) => updateDraft(row.id, { result: event.target.value })} step="any" type="number" value={draft.result} /></label> : <label className="execution-field"><span>{row.responseType === 'medicion' ? 'Medición o valor' : 'Respuesta'}</span><textarea disabled={!canEdit || busy} onChange={(event) => updateDraft(row.id, { result: event.target.value })} rows={2} value={draft.result} /></label>}

          <label className="execution-field">
            <span>Observaciones <small>{negative && row.negativeObservationRequired ? '(obligatorias)' : '(opcional)'}</small></span>
            <textarea disabled={!canEdit || busy} onChange={(event) => updateDraft(row.id, { observations: event.target.value })} rows={2} value={draft.observations} />
          </label>

          <ChecklistPointPhotos tenantId={row.tenantId} workOrderId={row.workOrderId} responseId={row.id} required={row.requiresPhoto} canEdit={canEdit} client={client} />

          {canEdit && <div className="checklist-item-actions">
            <button className="secondary-button" disabled={busy || (!draft.result && !draft.observations)} onClick={() => updateDraft(row.id, { result: '', observations: '' })} type="button"><RotateCcw size={16} /> Dejar pendiente</button>
            <button className="primary-button" disabled={busy || (negative && row.negativeObservationRequired && !draft.observations.trim())} onClick={() => saveMutation.mutate({ row, draft })} type="button">{state === 'saving' ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Guardar punto</button>
          </div>}
          {errors[row.id] && <p className="execution-inline-error" role="alert">{errors[row.id]}</p>}
        </article>;
      })}</div>}
        </section>;
      })}
    </div>}

    {!canEdit && rows.length > 0 && <p className="execution-readonly-note">El checklist está en modo consulta. Solo el técnico asignado puede editarlo mientras la OT está en curso.</p>}
  </section>;
}
