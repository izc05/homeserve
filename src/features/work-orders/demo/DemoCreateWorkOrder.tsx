import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, Plus, ShieldCheck } from 'lucide-react';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import type { WorkOrderPriority, WorkOrderType } from '../types/workOrder';
import {
  DEMO_SECOND_TECHNICIAN_ID,
  DEMO_TECHNICIAN_ID,
  nextDemoOrderCode,
} from './demoWorkOrders';

type DemoCreateWorkOrderProps = {
  tenantId: string;
  orders: WorkOrderListItem[];
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

export default function DemoCreateWorkOrder({ tenantId, orders, onCancel, onCreate }: DemoCreateWorkOrderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkOrderType>('averia');
  const [priority, setPriority] = useState<WorkOrderPriority>('normal');
  const [technicianId, setTechnicianId] = useState('');
  const [location, setLocation] = useState('Planta 2 · Área asistencial');
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
      siteId: 'demo-site-pts',
      locationId: 'demo-location-new',
      assetId: null,
      assignedTo: technicianId || null,
      createdBy: 'demo-admin',
      plannedAt: plannedAt ? new Date(plannedAt).toISOString() : null,
      dueAt: null,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      instructions: null,
      safetyNotes: null,
      expectedResult: null,
      requirements: {
        checklist: true,
        initialPhotos: true,
        finalPhotos: true,
        measurements: false,
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
      siteName: 'Hospital Universitario PTS',
      locationName: location.trim() || 'Sin ubicación',
      assignedToName: technician.name,
    };

    onCreate(order);
  };

  return (
    <section className="demo-create-page">
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Simulación local</span>
          <h1>Nueva orden de trabajo</h1>
          <p>La OT se añadirá solo a esta sesión de demostración.</p>
        </div>
        <button className="secondary-button" onClick={onCancel} type="button"><ArrowLeft size={17} /> Volver</button>
      </div>

      <form className="panel demo-create-form" onSubmit={submit}>
        <div className="demo-form-banner">
          <ShieldCheck size={21} />
          <span><strong>Sin escritura en Supabase</strong><small>Puedes probar el flujo completo con tranquilidad.</small></span>
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

      <div className="demo-create-hint"><Plus size={17} /> La nueva OT aparecerá inmediatamente en dashboard, listado y planificación.</div>
    </section>
  );
}
