import { CalendarClock, CalendarDays, CheckCircle2, ChevronRight, RotateCcw, Search, TimerReset } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';

type PlanningFilter = 'all' | 'overdue' | 'today' | 'week' | 'review';

const statusLabels: Record<WorkOrderListItem['status'], string> = {
  BORRADOR: 'Borrador',
  ASIGNADA: 'Asignada',
  ACEPTADA: 'Aceptada',
  EN_CURSO: 'En curso',
  BLOQUEADA: 'Bloqueada',
  FINALIZADA_TECNICO: 'Pendiente validación',
  VALIDADA: 'Validada',
  CANCELADA: 'Cancelada',
};

const filterLabels: Record<PlanningFilter, string> = {
  all: 'Todas',
  overdue: 'Vencidas',
  today: 'Hoy',
  week: 'Próximos 7 días',
  review: 'Pendientes de validar',
};

function statusClass(status: WorkOrderListItem['status']): string {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function planningDate(order: WorkOrderListItem): Date | null {
  const value = order.plannedAt ?? order.dueAt;
  return value ? new Date(value) : null;
}

function isClosed(order: WorkOrderListItem): boolean {
  return order.status === 'VALIDADA' || order.status === 'CANCELADA';
}

function isOverdue(order: WorkOrderListItem, today: Date): boolean {
  const date = planningDate(order);
  return Boolean(date && startOfDay(date) < today && !isClosed(order));
}

function isToday(order: WorkOrderListItem, today: Date): boolean {
  const date = planningDate(order);
  return Boolean(date && startOfDay(date).getTime() === today.getTime());
}

function isThisWeek(order: WorkOrderListItem, today: Date): boolean {
  const date = planningDate(order);
  if (!date) return false;
  const day = startOfDay(date);
  const weekLimit = addDays(today, 7);
  return day >= today && day <= weekLimit;
}

function nextPlanDates(order: WorkOrderListItem, days: number): { plannedAt: string; dueAt: string } {
  const base = planningDate(order) ?? new Date();
  const planned = addDays(base, days);
  const due = addDays(planned, 1);
  return { plannedAt: planned.toISOString(), dueAt: due.toISOString() };
}

function sortByPlanDate(a: WorkOrderListItem, b: WorkOrderListItem): number {
  return String(a.plannedAt ?? a.dueAt ?? '').localeCompare(String(b.plannedAt ?? b.dueAt ?? ''));
}

export default function DemoPlanningScreen({
  orders,
  open,
  onReschedule,
}: {
  orders: WorkOrderListItem[];
  open: (id: string) => void;
  onReschedule: (orderId: string, plannedAt: string, dueAt: string, note: string) => void;
}) {
  const [filter, setFilter] = useState<PlanningFilter>('all');
  const [search, setSearch] = useState('');
  const today = startOfDay(new Date());

  const planned = useMemo(() => [...orders].filter((order) => planningDate(order)).sort(sortByPlanDate), [orders]);
  const metrics = useMemo(() => ({
    overdue: planned.filter((order) => isOverdue(order, today)).length,
    today: planned.filter((order) => isToday(order, today)).length,
    week: planned.filter((order) => isThisWeek(order, today)).length,
    review: planned.filter((order) => order.status === 'FINALIZADA_TECNICO').length,
  }), [planned, today]);

  const filtered = planned.filter((order) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || [order.code, order.title, order.siteName, order.locationName, order.assignedToName, order.assetName]
      .some((value) => value?.toLowerCase().includes(term));
    if (!matchesText) return false;
    if (filter === 'overdue') return isOverdue(order, today);
    if (filter === 'today') return isToday(order, today);
    if (filter === 'week') return isThisWeek(order, today);
    if (filter === 'review') return order.status === 'FINALIZADA_TECNICO';
    return true;
  });

  const reschedule = (order: WorkOrderListItem, days: number) => {
    const { plannedAt, dueAt } = nextPlanDates(order, days);
    onReschedule(order.id, plannedAt, dueAt, `Reprogramada ${days === 1 ? 'a mañana' : `+${days} días`} desde planificación.`);
  };

  return (
    <>
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Organización</span>
          <h1>Planificación</h1>
          <p>Agenda accionable: vencidas, próximos trabajos, reprogramación rápida y salto directo a OT.</p>
        </div>
        <span className="source-badge">Demo persistente</span>
      </div>

      <section className="metrics-grid planning-metrics-grid">
        <article className="metric-card"><span className="metric-icon tone-red"><TimerReset size={23} /></span><div className="metric-content"><strong>{metrics.overdue}</strong><span>Vencidas</span><small>Reprogramar o abrir OT</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-blue"><CalendarDays size={23} /></span><div className="metric-content"><strong>{metrics.today}</strong><span>Hoy</span><small>Trabajo diario</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-purple"><CalendarClock size={23} /></span><div className="metric-content"><strong>{metrics.week}</strong><span>7 días</span><small>Próxima carga</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-green"><CheckCircle2 size={23} /></span><div className="metric-content"><strong>{metrics.review}</strong><span>Validar</span><small>Cierre responsable</small></div></article>
      </section>

      <section className="panel planning-workspace-panel">
        <div className="filters-row demo-filters-row planning-toolbar">
          <label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por OT, equipo, ubicación o técnico" value={search} /></label>
          <select aria-label="Filtro de planificación" onChange={(event) => setFilter(event.target.value as PlanningFilter)} value={filter}>
            {Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="filter-button" onClick={() => { setFilter('all'); setSearch(''); }} type="button"><RotateCcw size={15} /> Limpiar</button>
        </div>

        <div className="planning-work-list">
          {filtered.length === 0 ? <p className="empty-state">No hay trabajos para este filtro.</p> : filtered.map((order) => (
            <article className={`planning-work-card ${isOverdue(order, today) ? 'is-overdue' : ''}`} key={order.id}>
              <button className="planning-work-main" onClick={() => open(order.id)} type="button">
                <time>{formatDateTime(order.plannedAt ?? order.dueAt)}</time>
                <span><strong>{order.code} · {order.title}</strong><small>{order.siteName} · {order.locationName ?? 'Sin ubicación'} · {order.assignedToName ?? 'Sin técnico'}</small></span>
                <i className={statusClass(order.status)}>{statusLabels[order.status]}</i>
                <ChevronRight size={17} />
              </button>
              <div className="planning-work-actions">
                <button onClick={() => reschedule(order, 1)} type="button">Mañana</button>
                <button onClick={() => reschedule(order, 7)} type="button">+7 días</button>
                <button className="primary-link-button" onClick={() => open(order.id)} type="button">Abrir OT</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
