import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Clock3,
  Flag,
  Inbox,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import type { WorkOrderPriority, WorkOrderStatus } from '../../work-orders/types/workOrder';
import { groupTechnicianOrders, type TechnicianMobileAction, type TechnicianOrderGroup } from '../technicianMobile';

const groupLabels: Record<TechnicianOrderGroup, string> = {
  pendientes: 'Pendientes',
  hoy: 'Hoy',
  urgentes: 'Urgentes',
  en_curso: 'En curso',
  bloqueadas: 'Bloqueadas',
  historial: 'Historial',
};

const statusLabels: Record<WorkOrderStatus, string> = {
  BORRADOR: 'Borrador',
  ASIGNADA: 'Asignada',
  ACEPTADA: 'Aceptada',
  EN_CURSO: 'En curso',
  BLOQUEADA: 'Bloqueada',
  FINALIZADA_TECNICO: 'Pendiente de validación',
  VALIDADA: 'Validada',
  CANCELADA: 'Cancelada',
};

const priorityLabels: Record<WorkOrderPriority, string> = {
  baja: 'Baja',
  normal: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
  critica: 'Crítica',
};

const groupKeys = Object.keys(groupLabels) as TechnicianOrderGroup[];

function dateLabel(value: string | null) {
  if (!value) return 'Sin fecha prevista';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha prevista';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function statusIcon(status: WorkOrderStatus) {
  if (status === 'EN_CURSO' || status === 'ACEPTADA') return <CirclePlay size={15} aria-hidden="true" />;
  if (status === 'VALIDADA' || status === 'FINALIZADA_TECNICO') return <CheckCircle2 size={15} aria-hidden="true" />;
  if (status === 'BLOQUEADA' || status === 'CANCELADA') return <AlertTriangle size={15} aria-hidden="true" />;
  return <Clock3 size={15} aria-hidden="true" />;
}

function priorityClass(priority: WorkOrderPriority) {
  return priority === 'normal' ? 'media' : priority;
}

type Props = {
  orders: WorkOrderListItem[];
  viewerId: string;
  viewerName?: string;
  busyOrderId: string | null;
  notice: { kind: 'success' | 'error'; text: string } | null;
  open: (id: string) => void;
  runAction: (action: TechnicianMobileAction, order: WorkOrderListItem) => void;
};

export default function TechnicianMobileWorkspace({ orders, viewerId, viewerName, busyOrderId, notice, open, runAction }: Props) {
  const [group, setGroup] = useState<TechnicianOrderGroup>('pendientes');
  const groups = useMemo(() => groupTechnicianOrders(orders, viewerId), [orders, viewerId]);
  // listAccessibleWorkOrders keeps the repository ordering (planned_at, then created_at).
  // We deliberately call this “En foco”, not “Siguiente”, because no scheduling priority is invented here.
  const ownOrders = useMemo(() => orders.filter((order) => order.assignedTo === viewerId), [orders, viewerId]);
  const focusOrder = ownOrders[0] ?? null;
  const visible = groups[group];

  const renderAction = (order: WorkOrderListItem) => {
    const busy = busyOrderId === order.id;
    if (order.status === 'ASIGNADA') return <button className="primary-button technician-order-action" disabled={busy} onClick={() => runAction('accept', order)} type="button">{busy ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />} Aceptar</button>;
    if (order.status === 'ACEPTADA') return <button className="primary-button technician-order-action" disabled={busy} onClick={() => runAction('start', order)} type="button">{busy ? <LoaderCircle className="spin" size={16} /> : <CirclePlay size={16} />} Iniciar intervención</button>;
    if (order.status === 'EN_CURSO') return <button className="primary-button technician-order-action" disabled={busy} onClick={() => open(order.id)} type="button"><Wrench size={16} /> Abrir ejecución</button>;
    return null;
  };

  const renderOrderMeta = (order: WorkOrderListItem) => <>
    <span className="technician-order-meta-item"><MapPin size={14} aria-hidden="true" />{order.siteName || 'Instalación sin nombre'}{order.locationName ? ` · ${order.locationName}` : ''}</span>
    {!order.locationName && <span className="technician-order-meta-item technician-order-meta-empty"><MapPin size={14} aria-hidden="true" />Ubicación no disponible</span>}
    {order.clientName ? <span className="technician-order-meta-item"><UserRound size={14} aria-hidden="true" />{order.clientName}</span> : <span className="technician-order-meta-item technician-order-meta-empty"><UserRound size={14} aria-hidden="true" />Cliente no disponible</span>}
    <span className="technician-order-meta-item"><CalendarClock size={14} aria-hidden="true" />{dateLabel(order.plannedAt)}</span>
  </>;

  return <section className="technician-premium-page">
    <header className="technician-premium-header">
      <div className="technician-premium-header-inner">
        <div>
          <span className="technician-premium-kicker">Zona técnica</span>
          <h1>Mis OT</h1>
          <p>Tu cola operativa, con las órdenes que el servidor ha asignado a esta cuenta.</p>
        </div>
        {viewerName?.trim() && <div className="technician-premium-identity"><span className="technician-premium-avatar"><UserRound size={18} aria-hidden="true" /></span><span><small>Sesión activa</small><strong>{viewerName}</strong></span></div>}
      </div>
    </header>

    <div className="technician-premium-content">
      {notice && <p className={notice.kind === 'error' ? 'form-global-error' : 'technician-success'}>{notice.kind === 'error' ? <AlertTriangle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}{notice.text}</p>}

      <section className="technician-premium-kpis" aria-label="Indicadores de Mis OT">
        {([
          ['pendientes', Clock3, 'Pendientes'],
          ['hoy', CalendarDays, 'Hoy'],
          ['urgentes', AlertTriangle, 'Urgentes'],
          ['en_curso', Wrench, 'En curso'],
        ] as const).map(([key, Icon, label]) => <button className={`technician-premium-kpi ${group === key ? 'is-active' : ''}`} aria-pressed={group === key} key={key} onClick={() => setGroup(key)} type="button"><span className="technician-premium-kpi-icon"><Icon size={20} aria-hidden="true" /></span><span><strong>{groups[key].length}</strong><small>{label}</small></span><ChevronRight className="technician-premium-kpi-arrow" size={17} aria-hidden="true" /></button>)}
      </section>

      <section className="technician-premium-filters" aria-labelledby="technician-filters-title">
        <div className="technician-premium-section-heading"><div><span className="technician-premium-kicker">Filtros</span><h2 id="technician-filters-title">Todas tus OT</h2><p>Selecciona una vista sin cambiar el orden recibido del servidor.</p></div></div>
        <nav className="technician-premium-filter-nav" aria-label="Filtros de órdenes asignadas">{groupKeys.map((key) => <button className={group === key ? 'is-active' : ''} aria-pressed={group === key} key={key} onClick={() => setGroup(key)} type="button">{groupLabels[key]} <b>{groups[key].length}</b></button>)}</nav>
      </section>

      <section className="technician-premium-focus" aria-labelledby="technician-focus-title">
        <span className="technician-premium-focus-icon"><Flag size={24} aria-hidden="true" /></span>
        <div className="technician-premium-focus-copy">
          <span className="technician-premium-kicker">Siguiente actuación · En foco</span>
          {focusOrder ? <><h2 id="technician-focus-title">{focusOrder.title}</h2><p><strong>{focusOrder.code}</strong> · {focusOrder.siteName || 'Instalación sin nombre'}{focusOrder.clientName ? ` · ${focusOrder.clientName}` : ''}</p></> : <><h2 id="technician-focus-title">Sin OT en foco</h2><p>Las órdenes asignadas a esta cuenta aparecerán aquí cuando estén disponibles.</p></>}
        </div>
        {focusOrder?.status === 'EN_CURSO' ? <button className="primary-button technician-focus-action" onClick={() => open(focusOrder.id)} type="button"><ArrowUpRight size={17} /> Abrir ejecución</button> : <span className="technician-focus-note"><ShieldCheck size={17} aria-hidden="true" /> Vista informativa</span>}
      </section>

      <section className="technician-premium-queue" aria-labelledby="technician-queue-title">
        <div className="technician-premium-section-heading"><div><span className="technician-premium-kicker">Bloque independiente del filtro</span><h2 id="technician-queue-title">Cola en curso</h2><p>Órdenes que ya están dentro de una intervención.</p></div><span className="technician-premium-count">{groups.en_curso.length}</span></div>
        {groups.en_curso.length === 0 ? <div className="technician-premium-empty"><Inbox size={22} aria-hidden="true" /><strong>No hay OT en curso</strong><p>La cola activa está vacía.</p></div> : <div className="technician-premium-order-table" role="table" aria-label="Órdenes en curso">
          <div className="technician-premium-order-table-head" role="row"><span role="columnheader">OT</span><span role="columnheader">Instalación</span><span role="columnheader">Estado</span><span role="columnheader">Prioridad</span><span role="columnheader"><span className="visually-hidden">Acción</span></span></div>
          {groups.en_curso.map((order) => <div className="technician-premium-order-row" key={order.id} role="row"><div className="technician-premium-order-primary" role="cell"><button className="technician-premium-order-link" onClick={() => open(order.id)} type="button">{order.code}</button><strong>{order.title}</strong></div><div className="technician-premium-order-installation" role="cell">{renderOrderMeta(order)}</div><div role="cell"><span className="technician-premium-status status-en-curso">{statusIcon(order.status)}{statusLabels[order.status]}</span></div><div role="cell"><span className={`technician-premium-priority priority-${priorityClass(order.priority)}`}><Flag size={14} aria-hidden="true" />{priorityLabels[order.priority]}</span></div><div className="technician-premium-order-row-action" role="cell">{renderAction(order)}</div></div>)}
        </div>}
      </section>

      {group !== 'en_curso' && <section className="technician-premium-filtered-list" aria-labelledby="technician-filtered-title"><div className="technician-premium-list-heading"><div><span className="technician-premium-kicker">Vista seleccionada</span><h2 id="technician-filtered-title">{groupLabels[group]}</h2></div><span className="technician-premium-count">{visible.length}</span></div>{visible.length === 0 ? <div className="technician-premium-empty"><Inbox size={22} aria-hidden="true" /><strong>No hay OT en esta vista</strong><p>Los estados y fechas visibles se actualizan desde Supabase.</p></div> : <div className="technician-premium-filtered-cards">{visible.map((order) => <article className="technician-premium-filtered-card" key={order.id}><div className="technician-premium-filtered-card-main"><div className="technician-premium-filtered-card-top"><button className="technician-premium-order-link" onClick={() => open(order.id)} type="button">{order.code}</button><span className={`technician-premium-status status-${order.status.toLowerCase().replaceAll('_', '-')}`}>{statusIcon(order.status)}{statusLabels[order.status]}</span></div><h3>{order.title}</h3><p>{renderOrderMeta(order)}</p></div>{renderAction(order)}</article>)}</div>}</section>}
    </div>
    <footer className="technician-premium-footer">Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro</footer>
  </section>;
}
