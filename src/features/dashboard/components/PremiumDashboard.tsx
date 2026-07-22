import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  Flag,
  Gauge,
  ShieldAlert,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { DemoBrandFooter } from '../../../components/ProductBrand';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import type { WorkOrderPriority, WorkOrderStatus } from '../../work-orders/types/workOrder';

type PremiumDashboardProps = {
  orders: WorkOrderListItem[];
  viewerName: string;
  openOrders: () => void;
  openDetail: (id: string) => void;
};

const statusLabels: Record<WorkOrderStatus, string> = {
  BORRADOR: 'Borrador',
  ASIGNADA: 'Asignada',
  ACEPTADA: 'Aceptada',
  EN_CURSO: 'En curso',
  BLOQUEADA: 'Bloqueada',
  FINALIZADA_TECNICO: 'Pendiente validación',
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

const focusStatusOrder: Partial<Record<WorkOrderStatus, number>> = {
  BLOQUEADA: 0,
  FINALIZADA_TECNICO: 1,
  EN_CURSO: 2,
  ACEPTADA: 3,
  ASIGNADA: 4,
  BORRADOR: 5,
};

const priorityOrder: Record<WorkOrderPriority, number> = {
  critica: 0,
  urgente: 1,
  alta: 2,
  normal: 3,
  baja: 4,
};

const focusCopy: Partial<Record<WorkOrderStatus, string>> = {
  BLOQUEADA: 'Resolver bloqueo',
  FINALIZADA_TECNICO: 'Revisar intervención',
  EN_CURSO: 'Supervisar ejecución',
  ACEPTADA: 'Comprobar inicio',
  ASIGNADA: 'Confirmar aceptación',
  BORRADOR: 'Completar asignación',
};

const keyStatuses: WorkOrderStatus[] = [
  'BLOQUEADA',
  'FINALIZADA_TECNICO',
  'EN_CURSO',
  'ACEPTADA',
  'ASIGNADA',
  'BORRADOR',
];

function isOpen(order: WorkOrderListItem) {
  return !['VALIDADA', 'CANCELADA'].includes(order.status);
}

function statusClass(status: WorkOrderStatus) {
  return `premium-dashboard-status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function priorityClass(priority: WorkOrderPriority) {
  return `premium-dashboard-priority priority-${priority}`;
}

function formatDate(value: string | null) {
  if (!value) return 'Sin planificar';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function selectDashboardFocus(orders: WorkOrderListItem[]) {
  let selected: WorkOrderListItem | null = null;
  let selectedStatusRank = Number.POSITIVE_INFINITY;
  let selectedPriorityRank = Number.POSITIVE_INFINITY;

  for (const order of orders) {
    const statusRank = focusStatusOrder[order.status];
    if (statusRank === undefined) continue;
    const nextPriorityRank = priorityOrder[order.priority];
    if (
      statusRank < selectedStatusRank
      || (statusRank === selectedStatusRank && nextPriorityRank < selectedPriorityRank)
    ) {
      selected = order;
      selectedStatusRank = statusRank;
      selectedPriorityRank = nextPriorityRank;
    }
  }

  return selected;
}

export default function PremiumDashboard({
  orders,
  viewerName,
  openOrders,
  openDetail,
}: PremiumDashboardProps) {
  const counts = useMemo(() => {
    const result = new Map<WorkOrderStatus, number>();
    for (const order of orders) result.set(order.status, (result.get(order.status) ?? 0) + 1);
    return result;
  }, [orders]);

  const focusOrder = useMemo(() => selectDashboardFocus(orders), [orders]);
  const recentOrders = useMemo(
    () => [...orders]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    [orders],
  );
  const plannedOrders = useMemo(
    () => orders
      .filter((order) => Boolean(order.plannedAt) && isOpen(order))
      .sort((left, right) => String(left.plannedAt).localeCompare(String(right.plannedAt)))
      .slice(0, 4),
    [orders],
  );
  const technicianLoads = useMemo(() => {
    const groups = new Map<string, WorkOrderListItem[]>();
    for (const order of orders.filter((row) => row.assignedToName && isOpen(row))) {
      const technician = order.assignedToName as string;
      groups.set(technician, [...(groups.get(technician) ?? []), order]);
    }
    return [...groups.entries()]
      .map(([name, rows]) => ({ name, rows }))
      .sort((left, right) => right.rows.length - left.rows.length || left.name.localeCompare(right.name))
      .slice(0, 4);
  }, [orders]);

  const kpis = [
    { label: 'OT abiertas', value: orders.filter(isOpen).length, icon: ClipboardList, tone: 'red' },
    { label: 'En curso', value: counts.get('EN_CURSO') ?? 0, icon: Wrench, tone: 'blue' },
    { label: 'Pendientes de validación', value: counts.get('FINALIZADA_TECNICO') ?? 0, icon: CheckCircle2, tone: 'amber' },
    { label: 'Bloqueadas', value: counts.get('BLOQUEADA') ?? 0, icon: ShieldAlert, tone: 'purple' },
  ] as const;

  return <article className="premium-dashboard-page">
    <header className="premium-dashboard-header">
      <div className="premium-dashboard-header-inner">
        <div className="premium-dashboard-heading">
          <span className="premium-dashboard-kicker">Panel central</span>
          <h1>Hola, {viewerName}</h1>
          <p>Visión operativa de las órdenes que puedes gestionar ahora.</p>
        </div>
        <div className="premium-dashboard-data-badges" aria-label="Origen y alcance de los datos">
          <span><CircleDot size={15} /> Datos reales</span>
          <span><ClipboardList size={15} /> {orders.length} OT visibles</span>
        </div>
      </div>
    </header>

    <div className="premium-dashboard-content">
      <section className="premium-dashboard-kpis" aria-label="Indicadores operativos">
        {kpis.map(({ label, value, icon: Icon, tone }) => <article className="premium-dashboard-kpi" key={label}>
          <span className={`premium-dashboard-kpi-icon tone-${tone}`}><Icon size={22} /></span>
          <span><strong>{value}</strong><small>{label}</small></span>
        </article>)}
      </section>

      <section className={`premium-dashboard-focus ${focusOrder ? '' : 'is-empty'}`} aria-label="Siguiente actuación en foco">
        <span className="premium-dashboard-focus-icon">{focusOrder?.status === 'BLOQUEADA' ? <AlertTriangle size={24} /> : <Gauge size={24} />}</span>
        <div className="premium-dashboard-focus-copy">
          <span className="premium-dashboard-section-kicker">Siguiente actuación · En foco</span>
          {focusOrder ? <>
            <h2>{focusCopy[focusOrder.status]}</h2>
            <p><strong>{focusOrder.code}</strong> · {focusOrder.title}</p>
            <div className="premium-dashboard-focus-meta">
              <span className={statusClass(focusOrder.status)}>{statusLabels[focusOrder.status]}</span>
              <span className={priorityClass(focusOrder.priority)}><Flag size={13} /> {priorityLabels[focusOrder.priority]}</span>
              <span>{focusOrder.clientName || 'Cliente no disponible'}</span>
              <span>{focusOrder.siteName || 'Instalación no disponible'}</span>
            </div>
          </> : <>
            <h2>Sin actuaciones pendientes</h2>
            <p>No hay OT operativas que requieran atención.</p>
          </>}
        </div>
        {focusOrder && <button className="premium-dashboard-primary-action" onClick={() => openDetail(focusOrder.id)} type="button">
          Abrir OT <ArrowRight size={17} />
        </button>}
      </section>

      <div className="premium-dashboard-grid">
        <section className="premium-dashboard-card premium-dashboard-recent" aria-labelledby="premium-recent-title">
          <div className="premium-dashboard-card-heading">
            <div><span className="premium-dashboard-section-kicker">Actividad</span><h2 id="premium-recent-title">Órdenes recientes</h2></div>
            <button className="premium-dashboard-secondary-action" onClick={openOrders} type="button">Ver todas <ChevronRight size={16} /></button>
          </div>
          {recentOrders.length ? <div className="premium-dashboard-order-list">
            {recentOrders.map((order) => <article className="premium-dashboard-order" key={order.id}>
              <div className="premium-dashboard-order-code"><span>{order.code}</span><strong>{order.title}</strong></div>
              <div className="premium-dashboard-order-context"><span>{order.clientName || 'Cliente no disponible'}</span><small>{order.siteName || 'Instalación no disponible'}</small></div>
              <span className={statusClass(order.status)}>{statusLabels[order.status]}</span>
              <button aria-label={`Abrir ${order.code}`} onClick={() => openDetail(order.id)} type="button"><ChevronRight size={18} /></button>
            </article>)}
          </div> : <EmptyState icon={ClipboardList} title="Sin órdenes visibles" copy="Las nuevas OT aparecerán aquí cuando estén disponibles para esta cuenta." />}
        </section>

        <section className="premium-dashboard-card" aria-labelledby="premium-status-title">
          <div className="premium-dashboard-card-heading"><div><span className="premium-dashboard-section-kicker">Distribución</span><h2 id="premium-status-title">Estados clave</h2></div></div>
          <ul className="premium-dashboard-status-list">
            {keyStatuses.map((status) => <li key={status}><span className={statusClass(status)}>{statusLabels[status]}</span><strong>{counts.get(status) ?? 0}</strong></li>)}
          </ul>
          <button className="premium-dashboard-wide-action" onClick={openOrders} type="button">Ver listado completo <ArrowRight size={16} /></button>
        </section>

        <section className="premium-dashboard-card" aria-labelledby="premium-load-title">
          <div className="premium-dashboard-card-heading"><div><span className="premium-dashboard-section-kicker">Equipo</span><h2 id="premium-load-title">Carga por técnico</h2></div></div>
          {technicianLoads.length ? <div className="premium-dashboard-technicians">
            {technicianLoads.map(({ name, rows }) => <div className="premium-dashboard-technician" key={name}>
              <span className="premium-dashboard-avatar">{initials(name)}</span>
              <span><strong>{name}</strong><small>{rows.filter((order) => order.status === 'EN_CURSO').length} en curso · {rows.filter((order) => order.status === 'BLOQUEADA').length} bloqueadas</small></span>
              <b>{rows.length} OT</b>
            </div>)}
          </div> : <EmptyState icon={UsersRound} title="Sin carga asignada" copy="No hay técnicos con OT abiertas en los datos visibles." />}
        </section>

        <section className="premium-dashboard-card premium-dashboard-planned" aria-labelledby="premium-planned-title">
          <div className="premium-dashboard-card-heading"><div><span className="premium-dashboard-section-kicker">Planificación</span><h2 id="premium-planned-title">Próximas OT planificadas</h2></div></div>
          {plannedOrders.length ? <div className="premium-dashboard-planned-list">
            {plannedOrders.map((order) => <button key={order.id} onClick={() => openDetail(order.id)} type="button">
              <span className="premium-dashboard-date"><CalendarClock size={17} /> {formatDate(order.plannedAt)}</span>
              <span><strong>{order.code} · {order.title}</strong><small>{order.siteName || 'Instalación no disponible'} · {order.assignedToName || 'Sin técnico asignado'}</small></span>
              <ChevronRight size={17} />
            </button>)}
          </div> : <EmptyState icon={CalendarClock} title="Sin próximas OT" copy="No hay fechas planificadas en las órdenes operativas visibles." />}
        </section>
      </div>
    </div>
    <DemoBrandFooter className="premium-dashboard-footer" />
  </article>;
}

function EmptyState({ icon: Icon, title, copy }: { icon: typeof Clock3; title: string; copy: string }) {
  return <div className="premium-dashboard-empty"><span><Icon size={21} /></span><strong>{title}</strong><p>{copy}</p></div>;
}
