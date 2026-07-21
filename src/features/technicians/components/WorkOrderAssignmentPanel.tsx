import { AlertTriangle, LoaderCircle, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import { canAssignWorkOrder } from '../../work-orders/api/workOrderAssignment';
import type { TechnicianOption } from '../../work-orders/api/workOrderCommands';

type Props = {
  order: WorkOrderListItem;
  technicians: TechnicianOption[];
  busy: boolean;
  onAssign: (technicianId: string, reason: string | null) => void;
};

export default function WorkOrderAssignmentPanel({ order, technicians, busy, onAssign }: Props) {
  const [technicianId, setTechnicianId] = useState(order.assignedTo ?? '');
  const [reason, setReason] = useState('');
  useEffect(() => setTechnicianId(order.assignedTo ?? ''), [order.assignedTo]);
  if (!canAssignWorkOrder(order.status)) return null;
  return <article className="panel assignment-panel">
    <div className="panel-heading"><div><h2>Asignación</h2><p>Disponible hasta que el técnico acepte la OT.</p></div><span className="source-badge">RPC segura</span></div>
    {technicians.length === 0 ? <p className="read-only-note"><AlertTriangle size={16} /> No hay técnicos activos disponibles para asignar.</p> : <div className="assignment-controls">
      <label>Técnico<select onChange={(event) => setTechnicianId(event.target.value)} value={technicianId}><option value="">Seleccionar técnico</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}{technician.role === 'tecnico_externo' ? ' · Externo' : ''}</option>)}</select></label>
      {order.assignedTo && <label>Motivo de reasignación<input onChange={(event) => setReason(event.target.value)} placeholder="Indica el motivo" value={reason} /></label>}
      <button className="primary-button" disabled={busy || !technicianId || (Boolean(order.assignedTo && order.assignedTo !== technicianId) && !reason.trim())} onClick={() => onAssign(technicianId, reason.trim() || null)} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}{order.assignedTo ? 'Actualizar asignación' : 'Asignar y enviar'}</button>
    </div>}
  </article>;
}
