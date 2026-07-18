import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import type { WorkOrderPriority, WorkOrderType } from '../types/workOrder';
import {
  DEMO_SECOND_TECHNICIAN_ID,
  DEMO_TECHNICIAN_ID,
  nextDemoOrderCode,
} from './demoWorkOrders';

export type DemoCreateAssetSeed = {
  assetId: string;
  assetName: string;
  assetType: string | null;
  assetReference: string | null;
  assetCriticality: string | null;
  assetStatus: string | null;
  siteId: string;
  siteName: string;
  locationId: string | null;
  locationName: string | null;
};

export type DemoCreateInstallationSeed = {
  siteId: string;
  siteName: string;
  locationId: string | null;
  locationName: string | null;
};

type DemoCreateWorkOrderProps = {
  tenantId: string;
  orders: WorkOrderListItem[];
  initialAsset?: DemoCreateAssetSeed | null;
  initialInstallation?: DemoCreateInstallationSeed | null;
  onCancel: () => void;
  onCreate: (order: WorkOrderListItem) => void;
};

const typeOptions: Array<{ value: WorkOrderType; label: string }> = [
  { value: 'averia', label: 'Avería' },
  { value: 'mantenimiento_preventivo', label: 'Mantenimiento preventivo' },
  { value: 'mantenimiento_correctivo', label: 'Mantenimiento correctivo' },
  { value: 'revision', label: 'Revisión' },
  { value: 'inspeccion', label: 'Inspección' },
  { value: 'instalacion', label: 'Instalación' },
  { value: 'sustitucion', label: 'Sustitución' },
  { value: 'medicion', label: 'Medición' },
  { value: 'urgencia', label: 'Urgencia' },
  { value: 'otro', label: 'Otro' },
];

const priorityOptions: Array<{ value: WorkOrderPriority; label: string }> = [
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critica', label: 'Crítica' },
];

const technicianOptions = [
  { value: '', label: 'Sin asignar · guardar borrador', name: null },
  { value: DEMO_TECHNICIAN_ID, label: 'Carlos Martínez', name: 'Carlos Martínez' },
  { value: DEMO_SECOND_TECHNICIAN_ID, label: 'Miguel López', name: 'Miguel López' },
] as const;

const requirementOptions: Array<{ key: keyof WorkOrderListItem['requirements']; label: string }> = [
  { key: 'checklist', label: 'Checklist' },
  { key: 'initialPhotos', label: 'Fotos iniciales' },
  { key: 'finalPhotos', label: 'Fotos finales' },
  { key: 'measurements', label: 'Mediciones' },
  { key: 'materials', label: 'Materiales' },
  { key: 'technicianSignature', label: 'Firma técnico' },
  { key: 'responsibleSignature', label: 'Firma responsable' },
  { key: 'finalFunctionalTest', label: 'Prueba final' },
  { key: 'report', label: 'Informe' },
  { key: 'administrativeReview', label: 'Validación responsable' },
];

function newDemoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function toLocalDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultDateTime(hours = 2): string {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toLocalDateTime(date);
}

function seedTitle(asset: DemoCreateAssetSeed | null | undefined, installation: DemoCreateInstallationSeed | null | undefined): string {
  if (asset) return `Revisar ${asset.assetName}`;
  if (installation) return `Intervención en ${installation.locationName ?? installation.siteName}`;
  return '';
}

function seedDescription(asset: DemoCreateAssetSeed | null | undefined, installation: DemoCreateInstallationSeed | null | undefined): string {
  if (asset) return `Intervención creada desde la ficha del equipo ${asset.assetName}.`;
  if (installation) return `Orden creada desde la instalación ${installation.siteName}${installation.locationName ? ` · ${installation.locationName}` : ''}.`;
  return '';
}

function seedInstructions(asset: DemoCreateAssetSeed | null | undefined, installation: DemoCreateInstallationSeed | null | undefined): string {
  if (asset) return `Revisar estado del equipo ${asset.assetName} y dejar evidencia de la intervención.`;
  if (installation) return `Intervenir en ${installation.siteName} y documentar el trabajo realizado.`;
  return '';
}

function seedExpectedResult(asset: DemoCreateAssetSeed | null | undefined, installation: DemoCreateInstallationSeed | null | undefined): string {
  if (asset) return 'Equipo revisado, OT documentada y trazabilidad actualizada.';
  if (installation) return 'Trabajo completado y documentado en la instalación.';
  return '';
}

function defaultRequirements(hasAssetContext: boolean): WorkOrderListItem['requirements'] {
  return {
    checklist: true,
    initialPhotos: true,
    finalPhotos: true,
    measurements: hasAssetContext,
    materials: false,
    technicianSignature: true,
    responsibleSignature: false,
    finalFunctionalTest: true,
    report: true,
    administrativeReview: true,
  };
}

function nullable(value: string): string | null {
  return value.trim() || null;
}

export default function DemoCreateWorkOrder({ tenantId, orders, initialAsset, initialInstallation, onCancel, onCreate }: DemoCreateWorkOrderProps) {
  const contextSite = initialAsset ?? initialInstallation;
  const hasContext = Boolean(initialAsset || initialInstallation);
  const initialRequirements = defaultRequirements(Boolean(initialAsset));
  const [title, setTitle] = useState(seedTitle(initialAsset, initialInstallation));
  const [description, setDescription] = useState(seedDescription(initialAsset, initialInstallation));
  const [type, setType] = useState<WorkOrderType>(hasContext ? 'revision' : 'averia');
  const [priority, setPriority] = useState<WorkOrderPriority>(initialAsset?.assetCriticality === 'critica' ? 'alta' : 'normal');
  const [technicianId, setTechnicianId] = useState('');
  const [location, setLocation] = useState(contextSite?.locationName ?? 'Planta 2 · Área asistencial');
  const [plannedAt, setPlannedAt] = useState(defaultDateTime(2));
  const [dueAt, setDueAt] = useState(defaultDateTime(26));
  const [estimatedMinutes, setEstimatedMinutes] = useState('60');
  const [instructions, setInstructions] = useState(seedInstructions(initialAsset, initialInstallation));
  const [safetyNotes, setSafetyNotes] = useState('');
  const [expectedResult, setExpectedResult] = useState(seedExpectedResult(initialAsset, initialInstallation));
  const [requirements, setRequirements] = useState<WorkOrderListItem['requirements']>(initialRequirements);
  const [error, setError] = useState('');

  const technician = useMemo(
    () => technicianOptions.find((option) => option.value === technicianId) ?? technicianOptions[0],
    [technicianId],
  );

  const applyTemplate = (template: 'draft' | 'assigned' | 'urgent') => {
    setError('');
    if (template === 'draft') {
      setTechnicianId('');
      setPriority(initialAsset?.assetCriticality === 'critica' ? 'alta' : 'normal');
      setType(hasContext ? 'revision' : 'averia');
      setPlannedAt('');
      setDueAt('');
    }
    if (template === 'assigned') {
      setTechnicianId(DEMO_TECHNICIAN_ID);
      setPriority(initialAsset?.assetCriticality === 'critica' ? 'alta' : 'normal');
      setPlannedAt(defaultDateTime(2));
      setDueAt(defaultDateTime(26));
    }
    if (template === 'urgent') {
      setTechnicianId(DEMO_TECHNICIAN_ID);
      setType('urgencia');
      setPriority('urgente');
      setPlannedAt(defaultDateTime(1));
      setDueAt(defaultDateTime(8));
      setRequirements((current) => ({ ...current, checklist: true, initialPhotos: true, finalPhotos: true, technicianSignature: true, report: true }));
    }
  };

  const resetForm = () => {
    setTitle(seedTitle(initialAsset, initialInstallation));
    setDescription(seedDescription(initialAsset, initialInstallation));
    setType(hasContext ? 'revision' : 'averia');
    setPriority(initialAsset?.assetCriticality === 'critica' ? 'alta' : 'normal');
    setTechnicianId('');
    setLocation(contextSite?.locationName ?? 'Planta 2 · Área asistencial');
    setPlannedAt(defaultDateTime(2));
    setDueAt(defaultDateTime(26));
    setEstimatedMinutes('60');
    setInstructions(seedInstructions(initialAsset, initialInstallation));
    setSafetyNotes('');
    setExpectedResult(seedExpectedResult(initialAsset, initialInstallation));
    setRequirements(defaultRequirements(Boolean(initialAsset)));
    setError('');
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (normalizedTitle.length < 3) {
      setError('Escribe un título de al menos 3 caracteres.');
      return;
    }

    const minutes = estimatedMinutes.trim() ? Number(estimatedMinutes) : null;
    if (minutes !== null && (!Number.isFinite(minutes) || minutes < 1)) {
      setError('La duración estimada debe ser mayor que 0 minutos.');
      return;
    }

    const plannedDate = plannedAt ? new Date(plannedAt) : null;
    const dueDate = dueAt ? new Date(dueAt) : null;
    if (plannedDate && Number.isNaN(plannedDate.getTime())) {
      setError('La fecha prevista no es válida.');
      return;
    }
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      setError('La fecha límite no es válida.');
      return;
    }
    if (plannedDate && dueDate && dueDate.getTime() < plannedDate.getTime()) {
      setError('La fecha límite no puede ser anterior a la fecha prevista.');
      return;
    }

    const now = new Date().toISOString();
    const assigned = Boolean(technicianId);
    const order: WorkOrderListItem = {
      id: `demo-${newDemoId()}`,
      tenantId,
      code: nextDemoOrderCode(orders),
      title: normalizedTitle,
      description: nullable(description),
      type,
      priority,
      status: assigned ? 'ASIGNADA' : 'BORRADOR',
      siteId: contextSite?.siteId ?? 'demo-site-pts',
      locationId: contextSite?.locationId ?? 'demo-location-new',
      assetId: initialAsset?.assetId ?? null,
      assignedTo: technicianId || null,
      createdBy: 'demo-admin',
      plannedAt: plannedDate ? plannedDate.toISOString() : null,
      dueAt: dueDate ? dueDate.toISOString() : null,
      estimatedMinutes: minutes,
      instructions: nullable(instructions),
      safetyNotes: nullable(safetyNotes),
      expectedResult: nullable(expectedResult),
      requirements,
      blockReason: null,
      blockNotes: null,
      createdAt: now,
      updatedAt: now,
      siteName: contextSite?.siteName ?? 'Hospital Universitario PTS',
      locationName: location.trim() || contextSite?.locationName || 'Sin ubicación',
      assignedToName: technician.name,
      assetName: initialAsset?.assetName ?? null,
      assetType: initialAsset?.assetType ?? null,
      assetReference: initialAsset?.assetReference ?? null,
      assetCriticality: initialAsset?.assetCriticality ?? null,
      assetStatus: initialAsset?.assetStatus ?? null,
    };

    onCreate(order);
  };

  const titleText = initialAsset ? 'Nueva OT del equipo' : initialInstallation ? 'Nueva OT de instalación' : 'Nueva orden de trabajo';
  const subtitleText = initialAsset ? `${initialAsset.assetName} · ${initialAsset.locationName ?? 'Sin ubicación'}` : initialInstallation ? `${initialInstallation.siteName}${initialInstallation.locationName ? ` · ${initialInstallation.locationName}` : ''}` : 'La OT se añadirá solo a esta sesión de demostración.';

  return (
    <section className="demo-create-page">
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Simulación local</span>
          <h1>{titleText}</h1>
          <p>{subtitleText}</p>
        </div>
        <button className="secondary-button" onClick={onCancel} type="button"><ArrowLeft size={17} /> Volver</button>
      </div>

      <form className="panel demo-create-form" onSubmit={submit}>
        <div className="demo-form-banner">
          <ShieldCheck size={21} />
          <span><strong>{initialAsset ? 'Equipo vinculado' : initialInstallation ? 'Instalación vinculada' : 'Sin escritura en Supabase'}</strong><small>{initialAsset ? 'La nueva OT queda conectada al activo seleccionado.' : initialInstallation ? 'La nueva OT queda conectada a la instalación seleccionada.' : 'Puedes probar el flujo completo con tranquilidad.'}</small></span>
        </div>
        <div className="demo-form-toolbar">
          <button className="filter-button" onClick={() => applyTemplate('draft')} type="button"><ClipboardList size={15} /> Borrador</button>
          <button className="filter-button" onClick={() => applyTemplate('assigned')} type="button"><CheckCircle2 size={15} /> Asignar a Carlos</button>
          <button className="filter-button" onClick={() => applyTemplate('urgent')} type="button"><CalendarDays size={15} /> Urgente hoy</button>
          <button className="filter-button" onClick={resetForm} type="button"><RotateCcw size={15} /> Restaurar</button>
          <span><ClipboardList size={15} /> {technicianId ? 'Se creará asignada' : 'Se guardará como borrador'}</span>
        </div>

        <div className="demo-form-grid">
          <label className="demo-field demo-field-wide">
            Título de la intervención
            <input onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Revisar alumbrado de emergencia" value={title} />
          </label>
          <label className="demo-field">
            Tipo
            <select onChange={(event) => setType(event.target.value as WorkOrderType)} value={type}>
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="demo-field">
            Prioridad
            <select onChange={(event) => setPriority(event.target.value as WorkOrderPriority)} value={priority}>
              {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="demo-field">
            Técnico
            <select onChange={(event) => setTechnicianId(event.target.value)} value={technicianId}>
              {technicianOptions.map((option) => <option key={option.value || 'draft'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="demo-field">
            Fecha prevista
            <input onChange={(event) => setPlannedAt(event.target.value)} type="datetime-local" value={plannedAt} />
          </label>
          <label className="demo-field">
            Fecha límite
            <input onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} />
          </label>
          <label className="demo-field">
            Duración estimada
            <div className="demo-number-field"><input min="1" onChange={(event) => setEstimatedMinutes(event.target.value)} type="number" value={estimatedMinutes} /><span>min</span></div>
          </label>
          <label className="demo-field demo-field-wide">
            Ubicación
            <input onChange={(event) => setLocation(event.target.value)} value={location} />
          </label>
          {initialAsset && <div className="demo-field demo-field-wide readonly-summary"><strong>Equipo vinculado</strong><span>{initialAsset.assetName} · {initialAsset.assetReference ?? 'Sin referencia'} · {initialAsset.assetType ?? 'Tipo no indicado'}</span></div>}
          {initialInstallation && !initialAsset && <div className="demo-field demo-field-wide readonly-summary"><strong>Instalación vinculada</strong><span>{initialInstallation.siteName}{initialInstallation.locationName ? ` · ${initialInstallation.locationName}` : ''}</span></div>}
          <label className="demo-field demo-field-wide">
            Descripción
            <textarea onChange={(event) => setDescription(event.target.value)} placeholder="Describe el problema, alcance o trabajo solicitado" rows={4} value={description} />
          </label>
          <label className="demo-field demo-field-wide">
            Instrucciones al técnico
            <textarea onChange={(event) => setInstructions(event.target.value)} placeholder="Acceso, prioridad, material necesario o indicaciones de trabajo" rows={3} value={instructions} />
          </label>
          <label className="demo-field demo-field-wide">
            Riesgos y seguridad
            <textarea onChange={(event) => setSafetyNotes(event.target.value)} placeholder="EPIs, consignación, zona crítica, presencia de usuarios..." rows={3} value={safetyNotes} />
          </label>
          <label className="demo-field demo-field-wide">
            Resultado esperado
            <textarea onChange={(event) => setExpectedResult(event.target.value)} placeholder="Qué debe quedar comprobado o documentado al cerrar la OT" rows={3} value={expectedResult} />
          </label>
        </div>

        <div className="demo-requirements-edit-grid">
          {requirementOptions.map((item) => <label key={item.key}><input checked={Boolean(requirements[item.key])} onChange={() => setRequirements((current) => ({ ...current, [item.key]: !current[item.key] }))} type="checkbox" /><span>{requirements[item.key] ? <CheckCircle2 size={15} /> : <ClipboardList size={15} />} {item.label}</span></label>)}
        </div>

        {error && <p className="demo-form-error">{error}</p>}

        <div className="demo-form-actions">
          <button className="secondary-button" onClick={onCancel} type="button">Cancelar</button>
          <button className="secondary-button" onClick={resetForm} type="button"><RotateCcw size={16} /> Restaurar</button>
          <button className="primary-button" type="submit">
            {technicianId ? <CheckCircle2 size={18} /> : <ClipboardList size={18} />}
            {technicianId ? 'Crear y asignar' : 'Guardar borrador'}
          </button>
        </div>
      </form>

      <div className="demo-create-hint"><Plus size={17} /> La nueva OT aparecerá inmediatamente en dashboard, listado, planificación y módulos vinculados.</div>
    </section>
  );
}
