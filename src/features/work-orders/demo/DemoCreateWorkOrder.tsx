import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, Plus, ShieldCheck } from 'lucide-react';
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

export default function DemoCreateWorkOrder({ tenantId, orders, initialAsset, initialInstallation, onCancel, onCreate }: DemoCreateWorkOrderProps) {
  const contextSite = initialAsset ?? initialInstallation;
  const hasContext = Boolean(initialAsset || initialInstallation);
  const [title, setTitle] = useState(seedTitle(initialAsset, initialInstallation));
  const [description, setDescription] = useState(seedDescription(initialAsset, initialInstallation));
  const [type, setType] = useState<WorkOrderType>(hasContext ? 'revision' : 'averia');
  const [priority, setPriority] = useState<WorkOrderPriority>(initialAsset?.assetCriticality === 'critica' ? 'alta' : 'normal');
  const [technicianId, setTechnicianId] = useState('');
  const [location, setLocation] = useState(contextSite?.locationName ?? 'Planta 2 · Área asistencial');
  const [plannedAt, setPlannedAt] = useState('2026-07-21T08:00');
  const [estimatedMinutes, setEstimatedMinutes] = useState('60');
  const [error, setError] = useState('');

  const technician = useMemo(
    () => technicianOptions.find((option) => option.value === technicianId) ?? technicianOptions[0],
    [technicianId],
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (normalizedTitle.length < 3) {
      setError('Escribe un título de al menos 3 caracteres.');
      return;
    }

    const now = new Date().toISOString();
    const assigned = Boolean(technicianId);
    const order: WorkOrderListItem = {
      id: `demo-${crypto.randomUUID()}`,
      tenantId,
      code: nextDemoOrderCode(orders),
      title: normalizedTitle,
      description: description.trim() || null,
      type,
      priority,
      status: assigned ? 'ASIGNADA' : 'BORRADOR',
      siteId: contextSite?.siteId ?? 'demo-site-pts',
      locationId: contextSite?.locationId ?? 'demo-location-new',
      assetId: initialAsset?.assetId ?? null,
      assignedTo: technicianId || null,
      createdBy: 'demo-admin',
      plannedAt: plannedAt ? new Date(plannedAt).toISOString() : null,
      dueAt: null,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      instructions: initialAsset ? `Revisar estado del equipo ${initialAsset.assetName} y dejar evidencia de la intervención.` : initialInstallation ? `Intervenir en ${initialInstallation.siteName} y documentar el trabajo realizado.` : null,
      safetyNotes: null,
      expectedResult: initialAsset ? 'Equipo revisado, OT documentada y trazabilidad actualizada.' : initialInstallation ? 'Trabajo completado y documentado en la instalación.' : null,
      requirements: {
        checklist: true,
        initialPhotos: true,
        finalPhotos: true,
        measurements: Boolean(initialAsset),
        materials: false,
        technicianSignature: true,
        responsibleSignature: false,
        finalFunctionalTest: true,
        report: true,
        administrativeReview: true,
      },
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
            <textarea onChange={(event) => setDescription(event.target.value)} placeholder="Describe el problema, alcance o trabajo solicitado" rows={5} value={description} />
          </label>
        </div>

        {error && <p className="demo-form-error">{error}</p>}

        <div className="demo-form-actions">
          <button className="secondary-button" onClick={onCancel} type="button">Cancelar</button>
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
