import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, LoaderCircle, Play, ShieldCheck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import { groupTechnicianOrders, type TechnicianMobileAction, type TechnicianOrderGroup } from '../technicianMobile';

const groupLabels: Record<TechnicianOrderGroup, string> = {
  pendientes: 'Pendientes', hoy: 'Hoy', urgentes: 'Urgentes', en_curso: 'En curso', bloqueadas: 'Bloqueadas', historial: 'Historial',
};

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Sin fecha';
}

type Props = {
  orders: WorkOrderListItem[];
  viewerId: string;
  busyOrderId: string | null;
  notice: { kind: 'success' | 'error'; text: string } | null;
  open: (id: string) => void;
  runAction: (action: TechnicianMobileAction, order: WorkOrderListItem) => void;
};

export default function TechnicianMobileWorkspace({ orders, viewerId, busyOrderId, notice, open, runAction }: Props) {
  const [group, setGroup] = useState<TechnicianOrderGroup>('pendientes');
  const groups = useMemo(() => groupTechnicianOrders(orders, viewerId), [orders, viewerId]);
  const visible = groups[group];
  return <section className="technician-mobile-workspace">
    <div className="page-heading"><span className="section-kicker">Zona técnica</span><h1>Mis OT</h1><p>Trabajos asignados a tu cuenta, protegidos por permisos del servidor.</p></div>
    {notice && <p className={notice.kind === 'error' ? 'form-global-error' : 'technician-success'}>{notice.kind === 'error' ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}{notice.text}</p>}
    <div className="technician-mobile-metrics">
      <button onClick={() => setGroup('pendientes')} type="button"><Clock3 size={18} /><strong>{groups.pendientes.length}</strong><span>Pendientes</span></button>
      <button onClick={() => setGroup('hoy')} type="button"><CalendarDays size={18} /><strong>{groups.hoy.length}</strong><span>Hoy</span></button>
      <button onClick={() => setGroup('urgentes')} type="button"><AlertTriangle size={18} /><strong>{groups.urgentes.length}</strong><span>Urgentes</span></button>
      <button onClick={() => setGroup('en_curso')} type="button"><Wrench size={18} /><strong>{groups.en_curso.length}</strong><span>En curso</span></button>
    </div>
    <div className="technician-group-tabs">{(Object.keys(groupLabels) as TechnicianOrderGroup[]).map((key) => <button className={group === key ? 'active' : ''} onClick={() => setGroup(key)} type="button" key={key}>{groupLabels[key]} <b>{groups[key].length}</b></button>)}</div>
    <div className="technician-order-cards">
      {visible.length === 0 ? <div className="panel client-empty-state"><ShieldCheck size={28} /><strong>No hay OT en esta vista</strong><p>Los cambios aparecerán aquí cuando Supabase confirme el nuevo estado.</p></div> : visible.map((order) => {
        const busy = busyOrderId === order.id;
        return <article className="technician-order-card" key={order.id}>
          <button className="technician-order-main" onClick={() => open(order.id)} type="button">
            <span><strong>{order.code}</strong><i className={`priority-badge priority-${order.priority === 'normal' ? 'media' : order.priority}`}>{order.priority === 'normal' ? 'media' : order.priority}</i></span>
            <h2>{order.title}</h2>
            <p>{order.clientName || 'Cliente'} · {order.siteName}{order.locationName ? ` · ${order.locationName}` : ''}</p>
            <small>{dateLabel(order.plannedAt)} · {order.status.replaceAll('_', ' ')}</small>
          </button>
          {order.status === 'ASIGNADA' && <button className="primary-button" disabled={busy} onClick={() => runAction('accept', order)} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <CheckCircle2 size={17} />} Aceptar</button>}
          {order.status === 'ACEPTADA' && <button className="primary-button" disabled={busy} onClick={() => runAction('start', order)} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />} Iniciar intervención</button>}
          {order.status === 'EN_CURSO' && <button className="primary-button" disabled={busy} onClick={() => open(order.id)} type="button"><Wrench size={17} /> Abrir ejecución</button>}
        </article>;
      })}
    </div>
  </section>;
}
