import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Eye,
  LoaderCircle,
  Plus,
  Power,
  Save,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  duplicateChecklistTemplate,
  listChecklistTemplates,
  saveChecklistTemplate,
  setChecklistTemplateActive,
} from '../api/checklistTemplateRepository';
import type {
  ChecklistTemplate,
  ChecklistTemplateDraft,
  ChecklistTemplatePoint,
  ChecklistTemplateResponseType,
  ChecklistTemplateSection,
} from '../types/checklistTemplate';
import { DemoBrandFooter } from '../../../components/ProductBrand';

type Props = { tenantId: string; canManage: boolean; client?: SupabaseClient };
type Editor = { templateId: string | null; draft: ChecklistTemplateDraft } | null;

const responseLabels: Record<ChecklistTemplateResponseType, string> = {
  si_no_na: 'Sí / No / No aplica',
  correcto_incorrecto: 'Correcto / Incorrecto',
  numero: 'Número y unidad',
  texto: 'Texto',
  seleccion: 'Selección',
};

let draftSequence = 0;
function draftId(prefix: string) {
  draftSequence += 1;
  return `${prefix}-${draftSequence}`;
}

function emptyPoint(): ChecklistTemplatePoint {
  return {
    id: draftId('point'),
    title: '',
    instructions: '',
    responseType: 'si_no_na',
    unit: '',
    options: [],
    required: true,
    negativeObservationRequired: false,
    photoRequired: false,
    critical: false,
    order: 10,
  };
}

function emptySection(): ChecklistTemplateSection {
  return { id: draftId('section'), title: 'Comprobaciones', description: '', order: 10, points: [emptyPoint()] };
}

function newDraft(tenantId: string): ChecklistTemplateDraft {
  return {
    tenantId,
    name: '',
    description: '',
    specialty: '',
    active: true,
    sections: [emptySection()],
  };
}

function editDraft(template: ChecklistTemplate): ChecklistTemplateDraft {
  return {
    tenantId: template.tenantId,
    name: template.name,
    description: template.description,
    specialty: template.specialty,
    active: template.active,
    sections: template.sections.map((section) => ({ ...section, points: section.points.map((point) => ({ ...point })) })),
  };
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function displayDate(value: string) {
  if (!value) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function TemplatePreview({ draft }: { draft: ChecklistTemplateDraft }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const total = draft.sections.reduce((count, section) => count + section.points.length, 0);
  return <section className="template-preview" aria-label="Previsualización técnica">
    <div className="template-preview-heading"><div><span className="section-kicker">Vista técnica</span><h2>{draft.name || 'Plantilla sin nombre'}</h2></div><span className="source-badge">{total} puntos</span></div>
    {draft.sections.map((section) => {
      const expanded = open[section.id] !== false;
      return <article className="template-preview-section" key={section.id}>
        <button aria-expanded={expanded} className="template-preview-toggle" onClick={() => setOpen((current) => ({ ...current, [section.id]: !expanded }))} type="button">
          <span><strong>{section.title || 'Sección sin título'}</strong><small>{section.points.length} puntos</small></span>{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {expanded && <div className="template-preview-points">{section.points.map((point, index) => <div key={point.id}><span>{index + 1}</span><p><strong>{point.title || 'Punto sin título'}</strong><small>{responseLabels[point.responseType]}{point.unit ? ` · ${point.unit}` : ''}</small></p><div>{point.required && <i>Obligatorio</i>}{point.photoRequired && <i>Foto</i>}{point.critical && <i>Crítico</i>}</div></div>)}</div>}
      </article>;
    })}
  </section>;
}

export default function ChecklistTemplatesWorkspace({ tenantId, canManage, client }: Props) {
  const queryClient = useQueryClient();
  const supabase = client ?? getSupabaseClient();
  const queryKey = useMemo(() => ['checklist-templates', tenantId], [tenantId]);
  const [editor, setEditor] = useState<Editor>(null);
  const [preview, setPreview] = useState(false);

  const query = useQuery({
    queryKey,
    queryFn: () => listChecklistTemplates(supabase, tenantId),
    enabled: Boolean(tenantId && canManage),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const saveMutation = useMutation({
    mutationFn: ({ draft, templateId }: NonNullable<Editor>) => saveChecklistTemplate(supabase, draft, templateId),
    onSuccess: async () => { await refresh(); setEditor(null); setPreview(false); },
  });
  const duplicateMutation = useMutation({
    mutationFn: (templateId: string) => duplicateChecklistTemplate(supabase, templateId),
    onSuccess: refresh,
  });
  const activeMutation = useMutation({
    mutationFn: ({ templateId, active }: { templateId: string; active: boolean }) => setChecklistTemplateActive(supabase, templateId, active),
    onSuccess: refresh,
  });

  const updateDraft = (update: (draft: ChecklistTemplateDraft) => ChecklistTemplateDraft) => {
    setEditor((current) => current ? { ...current, draft: update(current.draft) } : current);
  };
  const updateSection = (sectionIndex: number, update: (section: ChecklistTemplateSection) => ChecklistTemplateSection) => updateDraft((draft) => ({
    ...draft,
    sections: draft.sections.map((section, index) => index === sectionIndex ? update(section) : section),
  }));
  const updatePoint = (sectionIndex: number, pointIndex: number, update: (point: ChecklistTemplatePoint) => ChecklistTemplatePoint) => updateSection(sectionIndex, (section) => ({
    ...section,
    points: section.points.map((point, index) => index === pointIndex ? update(point) : point),
  }));

  if (!canManage) return <section className="panel data-state error-state"><Settings2 size={28} /><strong>Configuración no disponible</strong><p>Solo un responsable puede administrar plantillas.</p></section>;

  const templates = query.data ?? [];
  return <section className="checklist-templates-workspace">
    <header className="checklist-template-header"><div><span className="section-kicker">Configuración operativa</span><h1>Plantillas de checklist</h1><p>Define controles reutilizables sin alterar las intervenciones históricas.</p></div><button className="primary-button" onClick={() => setEditor({ templateId: null, draft: newDraft(tenantId) })} type="button"><Plus size={18} /> Nueva plantilla</button></header>

    {query.isLoading && <section className="panel data-state"><LoaderCircle className="spin" size={26} /><strong>Cargando plantillas…</strong></section>}
    {query.error && <section className="panel data-state error-state" role="alert"><AlertTriangle size={26} /><strong>No se pudieron cargar las plantillas</strong><p>{errorText(query.error, 'Comprueba la conexión y vuelve a intentarlo.')}</p><button className="secondary-button" onClick={() => void query.refetch()} type="button">Reintentar</button></section>}

    {!query.isLoading && !query.error && templates.length === 0 && !editor && <section className="panel checklist-template-empty"><ClipboardCheck size={32} /><strong>No hay plantillas todavía</strong><p>Crea una plantilla para preparar checklist versionados por tipo de trabajo.</p><button className="primary-button" onClick={() => setEditor({ templateId: null, draft: newDraft(tenantId) })} type="button"><Plus size={17} /> Crear primera plantilla</button></section>}

    {templates.length > 0 && <div className="checklist-template-list" aria-label="Plantillas disponibles">{templates.map((template) => <article className="checklist-template-card" key={template.id}>
      <div className="checklist-template-card-copy"><span className={template.active ? 'template-status active' : 'template-status inactive'}>{template.active ? <CheckCircle2 size={14} /> : <Power size={14} />}{template.active ? 'Activa' : 'Inactiva'}</span><h2>{template.name}</h2><p>{template.description || 'Sin descripción registrada.'}</p><div><span>v{template.version}</span><span>{template.specialty || 'Sin especialidad'}</span><span>{template.sections.length} secciones</span><span>{template.sections.reduce((count, section) => count + section.points.length, 0)} puntos</span></div><small className="checklist-template-author">Actualizada {displayDate(template.updatedAt)} · {template.updatedByName || 'Autor disponible solo por identificador'}</small></div>
      <div className="checklist-template-card-actions"><button className="secondary-button" onClick={() => { setEditor({ templateId: template.id, draft: editDraft(template) }); setPreview(false); }} type="button"><Settings2 size={16} /> Editar</button><button className="secondary-button" disabled={duplicateMutation.isPending} onClick={() => duplicateMutation.mutate(template.id)} type="button"><Copy size={16} /> Duplicar</button><button className="secondary-button" disabled={activeMutation.isPending} onClick={() => { const action = template.active ? 'desactivar' : 'activar'; if (window.confirm(`¿Quieres ${action} “${template.name}”?`)) activeMutation.mutate({ templateId: template.id, active: !template.active }); }} type="button"><Power size={16} /> {template.active ? 'Desactivar' : 'Activar'}</button></div>
    </article>)}</div>}

    {editor && <section className="template-editor-shell">
      <div className="template-editor-heading"><div><span className="section-kicker">{editor.templateId ? 'Editar plantilla' : 'Nueva plantilla'}</span><h2>{editor.draft.name || 'Plantilla sin nombre'}</h2></div><div><button className="secondary-button" aria-pressed={preview} onClick={() => setPreview((value) => !value)} type="button"><Eye size={17} /> {preview ? 'Ocultar vista técnica' : 'Previsualizar'}</button><button aria-label="Cerrar editor" className="icon-button" onClick={() => setEditor(null)} type="button"><X size={19} /></button></div></div>
      {preview ? <TemplatePreview draft={editor.draft} /> : <div className="template-editor-form">
        <div className="template-editor-basics"><label><span>Nombre</span><input maxLength={160} onChange={(event) => updateDraft((draft) => ({ ...draft, name: event.target.value }))} value={editor.draft.name} /></label><label><span>Especialidad o tipo de trabajo</span><input maxLength={120} onChange={(event) => updateDraft((draft) => ({ ...draft, specialty: event.target.value }))} value={editor.draft.specialty} /></label><label className="full"><span>Descripción</span><textarea maxLength={500} onChange={(event) => updateDraft((draft) => ({ ...draft, description: event.target.value }))} rows={3} value={editor.draft.description} /></label></div>
        <div className="template-sections">{editor.draft.sections.map((section, sectionIndex) => <article className="template-section-editor" key={section.id}>
          <header><span>Sección {sectionIndex + 1}</span><label><span className="visually-hidden">Título de sección</span><input aria-label={`Título de sección ${sectionIndex + 1}`} onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, title: event.target.value }))} value={section.title} /></label><div><button aria-label={`Subir sección ${sectionIndex + 1}`} className="icon-button" disabled={sectionIndex === 0} onClick={() => updateDraft((draft) => ({ ...draft, sections: move(draft.sections, sectionIndex, -1) }))} type="button"><ArrowUp size={16} /></button><button aria-label={`Bajar sección ${sectionIndex + 1}`} className="icon-button" disabled={sectionIndex === editor.draft.sections.length - 1} onClick={() => updateDraft((draft) => ({ ...draft, sections: move(draft.sections, sectionIndex, 1) }))} type="button"><ArrowDown size={16} /></button><button aria-label={`Eliminar sección ${sectionIndex + 1}`} className="icon-button" disabled={editor.draft.sections.length === 1} onClick={() => updateDraft((draft) => ({ ...draft, sections: draft.sections.filter((_, index) => index !== sectionIndex) }))} type="button"><Trash2 size={16} /></button></div></header>
          <label className="template-section-description"><span>Descripción de sección</span><input onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, description: event.target.value }))} value={section.description} /></label>
          <div className="template-points">{section.points.map((point, pointIndex) => <fieldset className="template-point-editor" key={point.id}><legend>Punto {pointIndex + 1}</legend><div className="template-point-grid"><label className="full"><span>Título</span><input maxLength={200} onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, title: event.target.value }))} value={point.title} /></label><label className="full"><span>Instrucciones</span><textarea maxLength={1000} onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, instructions: event.target.value }))} rows={2} value={point.instructions} /></label><label><span>Tipo de respuesta</span><select onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, responseType: event.target.value as ChecklistTemplateResponseType, options: event.target.value === 'seleccion' ? current.options : [], unit: event.target.value === 'numero' ? current.unit : '' }))} value={point.responseType}>{Object.entries(responseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{point.responseType === 'numero' && <label><span>Unidad</span><input maxLength={40} onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, unit: event.target.value }))} placeholder="V, bar, °C…" value={point.unit} /></label>}{point.responseType === 'seleccion' && <label className="full"><span>Opciones separadas por coma</span><input onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, options: event.target.value.split(',') }))} value={point.options.join(', ')} /></label>}</div><div className="template-point-flags"><label><input checked={point.required} onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, required: event.target.checked }))} type="checkbox" /> Obligatorio</label><label><input checked={point.negativeObservationRequired} onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, negativeObservationRequired: event.target.checked }))} type="checkbox" /> Observación ante negativo</label><label><input checked={point.photoRequired} onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, photoRequired: event.target.checked }))} type="checkbox" /> Fotografía obligatoria</label><label><input checked={point.critical} onChange={(event) => updatePoint(sectionIndex, pointIndex, (current) => ({ ...current, critical: event.target.checked }))} type="checkbox" /> Punto crítico</label></div><div className="template-point-actions"><button aria-label={`Subir punto ${pointIndex + 1}`} className="icon-button" disabled={pointIndex === 0} onClick={() => updateSection(sectionIndex, (current) => ({ ...current, points: move(current.points, pointIndex, -1) }))} type="button"><ArrowUp size={16} /></button><button aria-label={`Bajar punto ${pointIndex + 1}`} className="icon-button" disabled={pointIndex === section.points.length - 1} onClick={() => updateSection(sectionIndex, (current) => ({ ...current, points: move(current.points, pointIndex, 1) }))} type="button"><ArrowDown size={16} /></button><button className="secondary-button" disabled={section.points.length === 1} onClick={() => updateSection(sectionIndex, (current) => ({ ...current, points: current.points.filter((_, index) => index !== pointIndex) }))} type="button"><Trash2 size={16} /> Eliminar punto</button></div></fieldset>)}</div>
          <button className="secondary-button" onClick={() => updateSection(sectionIndex, (current) => ({ ...current, points: [...current.points, emptyPoint()] }))} type="button"><Plus size={16} /> Añadir punto</button>
        </article>)}</div>
        <button className="secondary-button" onClick={() => updateDraft((draft) => ({ ...draft, sections: [...draft.sections, emptySection()] }))} type="button"><Plus size={16} /> Añadir sección</button>
      </div>}
      {saveMutation.error && <p className="form-global-error" role="alert"><AlertTriangle size={16} /> {errorText(saveMutation.error, 'No se pudo guardar la plantilla.')}</p>}
      <footer className="template-editor-actions"><button className="secondary-button" onClick={() => setEditor(null)} type="button">Cancelar</button><button className="primary-button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(editor)} type="button">{saveMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />} Guardar plantilla</button></footer>
    </section>}

    {(duplicateMutation.error || activeMutation.error) && <p className="form-global-error" role="alert"><AlertTriangle size={16} /> {errorText(duplicateMutation.error || activeMutation.error, 'No se pudo completar la acción.')}</p>}
    <DemoBrandFooter className="checklist-template-footer" />
  </section>;
}
