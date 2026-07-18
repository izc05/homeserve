import { CheckCircle2, ChevronRight, ClipboardCheck, Hammer, PauseCircle, PlayCircle, RotateCcw, Search, TimerReset, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';

export type TechnicianQuickAction = 'accept' | 'start' | 'pause' | 'finish';
type TechnicianFilter = 'all' | 'today' | 'active' | 'blocked' | 'review';

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

const filterLabels: Record<TechnicianFilter, string> = {
  all: 'Todas',
  today: 'Hoy',
  active: 'Activas',
  blocked: 'Bloqueadas',
  review: 'Pendientes de validar',
};

function statusClass(status: WorkOrderListItem['status']): string {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isToday(value: string | null): boolean {
  if (!value) return false;
  return startOfDay(new Date(value)).getTime() === startOfDay(new Date()).getTime();
}

function isOpen(status: WorkOrderListItem['status']): boolean {
  return !['VALIDADA', 'CANCELADA', 'FINALIZADA_TECNICO'].includes(status);
}

function canRun(action: TechnicianQuickAction, status: WorkOrderListItem['status']): boolean {
  if (action === 'accept') return status === 'ASIGNADA';
  if (action === 'start') return ['ASIGNADA', 'ACEPTADA', 'BLOQUEADA'].includes(status);
  if (action === 'pause') return status === 'EN_CURSO';
  if (action === 'finish') return ['ACEPTADA', 'EN_CURSO', 'BLOQUEADA'].includes(status);
  return false;
}

function actionLabel(action: TechnicianQuickAction): string {
  if (action === 'accept') return 'Aceptar';
  if (action === 'start') return 'Iniciar';
  if (action === 'pause') return 'Pausar';
  return 'Finalizar';
}

function actionIcon(action: TechnicianQuickAction) {
  if (action === 'accept') return CheckCircle2;
  if (action === 'start') return PlayCircle;
  if (action === 'pause') return PauseCircle;
  return ClipboardCheck;
}

export default function DemoTechnicianScreen({
  orders,
  technicianId,
  technicianName,
  open,
  onQuickAction,
}: {
  orders: WorkOrderListItem[];
  technicianId: string;
  technicianName: string;
  open: (id: string) => void;
  onQuickAction: (order: WorkOrderListItem, action: TechnicianQuickAction) => void;
}) {
  const [filter, setFilter] = useState<TechnicianFilter>('today');
  const [search, setSearch] = useState('');
  const ownOrders = useMemo(() => orders.filter((order) => order.assignedTo === technicianId), [orders, technicianId]);
  const metrics = useMemo(() => ({
    today: ownOrders.filter((order) => isToday(order.plannedAt ?? order.dueAt)).length,
    active: ownOrders.filter((order) => isOpen(order.status)).length,
    blocked: ownOrders.filter((order) => order.status === 'BLOQUEADA').length,
    review: ownOrders.filter((order) => order.status === 'FINALIZADA_TECNICO').length,
  }), [ownOrders]);

  const filtered = ownOrders.filter((order) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || [order.code, order.title, order.siteName, order.locationName, order.assetName]
      .some((value) => value?.toLowerCase().includes(term));
    if (!matchesText) return false;
    if (filter === 'today') return isToday(order.plannedAt ?? order.dueAt);
    if (filter === 'active') return isOpen(order.status);
    if (filter === 'blocked') return order.status === 'BLOQUEADA';
    if (filter === 'review') return order.status === 'FINALIZADA_TECNICO';
    return true;
  });

  return (
    <>
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Jornada técnico</span>
          <h1>Mis trabajos</h1>
          <p>{technicianName}: cola diaria, acciones rápidas y acceso a la ficha completa.</p>
        </div>
        <span className="source-badge">Operativo en móvil</span>
      </div>

      <section className="metrics-grid technician-metrics-grid">
        <article className="metric-card"><span className="metric-icon tone-blue"><Wrench size={23} /></span><div className="metric-content"><strong>{metrics.today}</strong><span>Hoy</span><small>Planificados</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-red"><Hammer size={23} /></span><div className="metric-content"><strong>{metrics.active}</strong><span>Activos</span><small>Por ejecutar</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-orange"><TimerReset size={23} /></span><div className="metric-content"><strong>{metrics.blocked}</strong><span>Bloqueados</span><small>Revisar causa</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-green"><ClipboardCheck size={23} /></span><div className="metric-content"><strong>{metrics.review}</strong><span>Finalizados</span><small>Responsable valida</small></div></article>
      </section>

      <section className="panel technician-workspace-panel">
        <div className="filters-row demo-filters-row technician-toolbar">
          <label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar OT, equipo o ubicación" value={search} /></label>
          <select aria-label="Filtro de técnico" onChange={(event) => setFilter(event.target.value as TechnicianFilter)} value={filter}>
            {Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="filter-button" onClick={() => { setFilter('all'); setSearch(''); }} type="button"><RotateCcw size={15} /> Limpiar</button>
        </div>

        <div className="technician-job-list">
          {filtered.length === 0 ? <p className="empty-state">No hay trabajos para este filtro.</p> : filtered.map((order) => (
            <article className={`technician-job-card status-card-${order.status.toLowerCase().replaceAll('_', '-')}`} key={order.id}>
              <button className="technician-job-main" onClick={() => open(order.id)} type="button">
                <span className="technician-job-code"><b>{order.code}</b><small>{formatDate(order.plannedAt ?? order.dueAt)}</small></span>
                <span className="technician-job-title"><strong>{order.title}</strong><small>{order.siteName} · {order.locationName ?? 'Sin ubicación'} · {order.assetName ?? 'Sin equipo'}</small></span>
                <i className={statusClass(order.status)}>{statusLabels[order.status]}</i>
                <ChevronRight size={17} />
              </button>
              <div className="technician-job-actions">
                {(['accept', 'start', 'pause', 'finish'] as TechnicianQuickAction[]).map((action) => {
                  const Icon = actionIcon(action);
                  const enabled = canRun(action, order.status);
                  return <button disabled={!enabled} key={action} onClick={() => enabled && onQuickAction(order, action)} type="button"><Icon size={16} /> {actionLabel(action)}</button>;
                })}
                <button className="primary-link-button" onClick={() => open(order.id)} type="button">Ficha OT</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
