import { useMemo, useState } from 'react';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import type { WorkOrderPriority, WorkOrderType } from '../types/workOrder';
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

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function DemoEditWorkOrder({ order, onCancel, onSave }: DemoEditWorkOrderProps) {
  const [title, setTitle] = useState(order.title);
  const [description, setDescription] = useState(order.description ?? '');
  const [type, setType] = useState<WorkOrderType>(order.type);
  const [priority, setPriority] = useState<WorkOrderPriority>(order.priority);
  const [technicianId, setTechnicianId] = useState(order.assignedTo ?? '');
  const [location, setLocation] = useState(order.locationName ?? '');
  const [plannedAt, setPlannedAt] = useState(toLocalDateTime(order.plannedAt));
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(order.estimatedMinutes ?? ''));
  const [error, setError] = useState('');

  const technician = useMemo(
    () => technicians.find((item) => item.id === technicianId) ?? technicians[0],
    [technicianId],
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim().length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      type,
      priority,
      assignedTo: technician.id || null,
      assignedToName: technician.name,
      status: technician.id && order.status === 'BORRADOR' ? 'ASIGNADA' : order.status,
      locationName: location.trim() || 'Sin ubicación',
      plannedAt: plannedAt ? new Date(plannedAt).toISOString() : null,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <section className="demo-create-page">
      <div className="page-heading page-heading-row">
        <div><span className="section-kicker">Edición local</span><h1>Editar {order.code}</h1><p>Los cambios se guardan únicamente en este navegador.</p></div>
        <button className="secondary-button" onClick={onCancel} type="button"><ArrowLeft size={17} /> Volver</button>
      </div>
      <form className="panel demo-create-form" onSubmit={submit}>
        <div className="demo-form-banner"><ShieldCheck size={21} /><span><strong>Modo demo persistente</strong><small>No se enviará información a Supabase.</small></span></div>
        <div className="demo-form-grid">
          <label className="demo-field demo-field-wide">Título<input onChange={(event) => setTitle(event.target.value)} value={title} /></label>
          <label className="demo-field">Tipo<select onChange={(event) => setType(event.target.value as WorkOrderType)} value={type}>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="demo-field">Prioridad<select onChange={(event) => setPriority(event.target.value as WorkOrderPriority)} value={priority}>{priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="demo-field">Técnico<select onChange={(event) => setTechnicianId(event.target.value)} value={technicianId}>{technicians.map((item) => <option key={item.id || 'empty'} value={item.id}>{item.label}</option>)}</select></label>
          <label className="demo-field">Fecha prevista<input onChange={(event) => setPlannedAt(event.target.value)} type="datetime-local" value={plannedAt} /></label>
          <label className="demo-field">Duración estimada<div className="demo-number-field"><input min="1" onChange={(event) => setEstimatedMinutes(event.target.value)} type="number" value={estimatedMinutes} /><span>min</span></div></label>
          <label className="demo-field demo-field-wide">Ubicación<input onChange={(event) => setLocation(event.target.value)} value={location} /></label>
          <label className="demo-field demo-field-wide">Descripción<textarea onChange={(event) => setDescription(event.target.value)} rows={5} value={description} /></label>
        </div>
        {error && <p className="demo-form-error">{error}</p>}
        <div className="demo-form-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="primary-button" type="submit"><Save size={18} /> Guardar cambios</button></div>
      </form>
    </section>
  );
}
