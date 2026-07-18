import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import type { WorkOrderPriority, WorkOrderStatus, WorkOrderType } from '../types/workOrder';
import { DEMO_SECOND_TECHNICIAN_ID, DEMO_TECHNICIAN_ID } from './demoWorkOrders';

type DemoEditWorkOrderProps = {
  order: WorkOrderListItem;
  onCancel: () => void;
  onSave: (changes: Partial<WorkOrderListItem>) => void;
};

const technicians = [
  { id: '', name: null, label: 'Sin asignar' },
  { id: DEMO_TECHNICIAN_ID, name: 'Carlos Martínez', label: 'Carlos Martínez' },
  { id: DEMO_SECOND_TECHNICIAN_ID, name: 'Miguel López', label: 'Miguel López' },
] as const;

const types: Array<{ value: WorkOrderType; label: string }> = [
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

const priorities: Array<{ value: WorkOrderPriority; label: string }> = [
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critica', label: 'Crítica' },
];

const statuses: Array<{ value: WorkOrderStatus; label: string }> = [
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'ASIGNADA', label: 'Asignada' },
  { value: 'ACEPTADA', label: 'Aceptada' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'BLOQUEADA', label: 'Bloqueada' },
  { value: 'FINALIZADA_TECNICO', label: 'Pendiente validación' },
  { value: 'VALIDADA', label: 'Validada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

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

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function nullable(value: string): string | null {
  return value.trim() || null;
}

export default function DemoEditWorkOrder({ order, onCancel, onSave }: DemoEditWorkOrderProps) {
  const [title, setTitle] = useState(order.title);
  const [description, setDescription] = useState(order.description ?? '');
  const [type, setType] = useState<WorkOrderType>(order.type);
  const [priority, setPriority] = useState<WorkOrderPriority>(order.priority);
  const [status, setStatus] = useState<WorkOrderStatus>(order.status);
  const [technicianId, setTechnicianId] = useState(order.assignedTo ?? '');
  const [location, setLocation] = useState(order.locationName ?? '');
  const [plannedAt, setPlannedAt] = useState(toLocalDateTime(order.plannedAt));
  const [dueAt, setDueAt] = useState(toLocalDateTime(order.dueAt));
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(order.estimatedMinutes ?? ''));
  const [instructions, setInstructions] = useState(order.instructions ?? '');
  const [safetyNotes, setSafetyNotes] = useState(order.safetyNotes ?? '');
  const [expectedResult, setExpectedResult] = useState(order.expectedResult ?? '');
  const [requirements, setRequirements] = useState(order.requirements);
  const [error, setError] = useState('');

  const technician = useMemo(
    () => technicians.find((item) => item.id === technicianId) ?? technicians[0],
    [technicianId],
  );

  const changedCount = useMemo(() => {
    const values = [
      title.trim() !== order.title,
      (description.trim() || null) !== order.description,
      type !== order.type,
      priority !== order.priority,
      status !== order.status,
      technicianId !== (order.assignedTo ?? ''),
      (location.trim() || 'Sin ubicación') !== (order.locationName ?? 'Sin ubicación'),
      (plannedAt ? new Date(plannedAt).toISOString() : null) !== order.plannedAt,
      (dueAt ? new Date(dueAt).toISOString() : null) !== order.dueAt,
      (estimatedMinutes ? Number(estimatedMinutes) : null) !== order.estimatedMinutes,
      (instructions.trim() || null) !== order.instructions,
      (safetyNotes.trim() || null) !== order.safetyNotes,
      (expectedResult.trim() || null) !== order.expectedResult,
      JSON.stringify(requirements) !== JSON.stringify(order.requirements),
    ];
    return values.filter(Boolean).length;
  }, [description, dueAt, estimatedMinutes, expectedResult, instructions, location, order, plannedAt, priority, requirements, safetyNotes, status, technicianId, title, type]);

  const resetForm = () => {
    setTitle(order.title);
    setDescription(order.description ?? '');
    setType(order.type);
    setPriority(order.priority);
    setStatus(order.status);
    setTechnicianId(order.assignedTo ?? '');
    setLocation(order.locationName ?? '');
    setPlannedAt(toLocalDateTime(order.plannedAt));
    setDueAt(toLocalDateTime(order.dueAt));
    setEstimatedMinutes(String(order.estimatedMinutes ?? ''));
    setInstructions(order.instructions ?? '');
    setSafetyNotes(order.safetyNotes ?? '');
    setExpectedResult(order.expectedResult ?? '');
    setRequirements(order.requirements);
    setError('');
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (normalizedTitle.length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }

    const minutes = estimatedMinutes.trim() ? Number(estimatedMinutes) : null;
    if (minutes !== null && (!Number.isFinite(minutes) || minutes < 1)) {
      setError('La duración estimada debe ser mayor que 0 minutos.');
      return;
    }

    if (status === 'BORRADOR' && technician.id) {
      setError('Para dejar una OT como borrador, selecciona “Sin asignar” como técnico.');
      return;
    }

    const plannedDate = plannedAt ? new Date(plannedAt) : null;
    const dueDate = dueAt ? new Date(dueAt) : null;
    if (plannedDate && dueDate && dueDate.getTime() < plannedDate.getTime()) {
      setError('La fecha límite no puede ser anterior a la fecha prevista.');
      return;
    }

    onSave({
      title: normalizedTitle,
      description: nullable(description),
      type,
      priority,
      status,
      assignedTo: technician.id || null,
      assignedToName: technician.name,
      locationName: location.trim() || 'Sin ubicación',
      plannedAt: plannedDate ? plannedDate.toISOString() : null,
      dueAt: dueDate ? dueDate.toISOString() : null,
      estimatedMinutes: minutes,
      instructions: nullable(instructions),
      safetyNotes: nullable(safetyNotes),
      expectedResult: nullable(expectedResult),
      requirements,
      blockReason: status === 'BLOQUEADA' ? (order.blockReason ?? 'OTRO') : order.blockReason,
      blockNotes: status === 'BLOQUEADA' ? (order.blockNotes ?? 'Bloqueo actualizado desde edición demo.') : order.blockNotes,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <section className="demo-create-page">
      <div className="page-heading page-heading-row">
        <div><span className="section-kicker">Edición local</span><h1>Editar {order.code}</h1><p>Ahora también puedes modificar estado, fechas límite, instrucciones, riesgos y requisitos.</p></div>
        <button className="secondary-button" onClick={onCancel} type="button"><ArrowLeft size={17} /> Volver</button>
      </div>
      <form className="panel demo-create-form" onSubmit={submit}>
        <div className="demo-form-banner"><ShieldCheck size={21} /><span><strong>Modo demo persistente</strong><small>{changedCount} cambios pendientes · se guardan únicamente en este navegador.</small></span></div>
        <div className="demo-form-toolbar"><button className="filter-button" onClick={resetForm} type="button"><RotateCcw size={15} /> Restaurar original</button><span><ClipboardList size={15} /> Estado actual: {statuses.find((item) => item.value === order.status)?.label ?? order.status}</span></div>
        <div className="demo-form-grid">
          <label className="demo-field demo-field-wide">Título<input onChange={(event) => setTitle(event.target.value)} value={title} /></label>
          <label className="demo-field">Tipo<select onChange={(event) => setType(event.target.value as WorkOrderType)} value={type}>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="demo-field">Prioridad<select onChange={(event) => setPriority(event.target.value as WorkOrderPriority)} value={priority}>{priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="demo-field">Estado<select onChange={(event) => setStatus(event.target.value as WorkOrderStatus)} value={status}>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="demo-field">Técnico<select onChange={(event) => setTechnicianId(event.target.value)} value={technicianId}>{technicians.map((item) => <option key={item.id || 'empty'} value={item.id}>{item.label}</option>)}</select></label>
          <label className="demo-field">Fecha prevista<input onChange={(event) => setPlannedAt(event.target.value)} type="datetime-local" value={plannedAt} /></label>
          <label className="demo-field">Fecha límite<input onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} /></label>
          <label className="demo-field">Duración estimada<div className="demo-number-field"><input min="1" onChange={(event) => setEstimatedMinutes(event.target.value)} type="number" value={estimatedMinutes} /><span>min</span></div></label>
          <label className="demo-field demo-field-wide">Ubicación<input onChange={(event) => setLocation(event.target.value)} value={location} /></label>
          {order.assetName && <div className="demo-field demo-field-wide readonly-summary"><strong>Equipo vinculado</strong><span>{order.assetName} · {order.assetReference ?? 'Sin referencia'} · {order.assetType ?? 'Tipo no indicado'}</span></div>}
          <label className="demo-field demo-field-wide">Descripción<textarea onChange={(event) => setDescription(event.target.value)} rows={4} value={description} /></label>
          <label className="demo-field demo-field-wide">Instrucciones al técnico<textarea onChange={(event) => setInstructions(event.target.value)} placeholder="Indicaciones, acceso, prioridad del trabajo..." rows={3} value={instructions} /></label>
          <label className="demo-field demo-field-wide">Riesgos y seguridad<textarea onChange={(event) => setSafetyNotes(event.target.value)} placeholder="EPIs, consignación, zonas críticas..." rows={3} value={safetyNotes} /></label>
          <label className="demo-field demo-field-wide">Resultado esperado<textarea onChange={(event) => setExpectedResult(event.target.value)} placeholder="Qué debe quedar comprobado al finalizar" rows={3} value={expectedResult} /></label>
        </div>
        <div className="demo-requirements-edit-grid">
          {requirementOptions.map((item) => <label key={item.key}><input checked={Boolean(requirements[item.key])} onChange={() => setRequirements((current) => ({ ...current, [item.key]: !current[item.key] }))} type="checkbox" /><span>{requirements[item.key] ? <CheckCircle2 size={15} /> : <ClipboardList size={15} />} {item.label}</span></label>)}
        </div>
        {error && <p className="demo-form-error">{error}</p>}
        <div className="demo-form-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="secondary-button" onClick={resetForm} type="button"><RotateCcw size={16} /> Restaurar</button><button className="primary-button" type="submit"><Save size={18} /> Guardar cambios</button></div>
      </form>
    </section>
  );
}
