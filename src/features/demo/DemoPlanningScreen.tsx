import { CalendarClock, CalendarDays, CheckCircle2, ChevronRight, Download, Printer, RotateCcw, Search, TimerReset } from 'lucide-react';
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

function nextPlanDates(daysFromToday: number): { plannedAt: string; dueAt: string } {
  const planned = addDays(startOfDay(new Date()), daysFromToday);
  planned.setHours(8, 0, 0, 0);
  const due = new Date(planned);
  due.setHours(18, 0, 0, 0);
  return { plannedAt: planned.toISOString(), dueAt: due.toISOString() };
}

function sortByPlanDate(a: WorkOrderListItem, b: WorkOrderListItem): number {
  return String(a.plannedAt ?? a.dueAt ?? '').localeCompare(String(b.plannedAt ?? b.dueAt ?? ''));
}

function csvValue(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function downloadPlanningCsv(orders: WorkOrderListItem[], prefix = 'planificacion-fv-ot'): void {
  const headers = ['codigo', 'titulo', 'estado', 'cliente_instalacion', 'ubicacion', 'equipo', 'referencia_equipo', 'tecnico', 'fecha_prevista', 'fecha_limite'];
  const rows = orders.map((order) => [
    order.code,
    order.title,
    statusLabels[order.status],
    order.siteName,
    order.locationName ?? '',
    order.assetName ?? '',
    order.assetReference ?? '',
    order.assignedToName ?? '',
    order.plannedAt ?? '',
    order.dueAt ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printPlanningReport(orders: WorkOrderListItem[], title = 'Planificación FV y mantenimiento'): void {
  const printable = window.open('', '_blank', 'noopener,noreferrer,width=950,height=720');
  if (!printable) return;
  const rows = orders.map((order) => `<tr><td>${escapeHtml(order.code)}</td><td>${escapeHtml(order.title)}</td><td>${escapeHtml(statusLabels[order.status])}</td><td>${escapeHtml(order.siteName)}</td><td>${escapeHtml(order.locationName ?? '')}</td><td>${escapeHtml(order.assetName ?? '')}</td><td>${escapeHtml(order.assignedToName ?? '')}</td><td>${escapeHtml(formatDateTime(order.plannedAt ?? order.dueAt))}</td></tr>`).join('');
  printable.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 6px}p{color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:11px}th{background:#f8fafc}</style></head><body><h1>${escapeHtml(title)}</h1><p>${orders.length} trabajos · ${new Date().toLocaleString('es-ES')}</p><table><thead><tr><th>Código</th><th>Trabajo</th><th>Estado</th><th>Cliente / instalación</th><th>Ubicación</th><th>Equipo</th><th>Técnico</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  printable.document.close();
  printable.focus();
  printable.print();
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
    const matchesText = !term || [order.code, order.title, order.siteName, order.locationName, order.assignedToName, order.assetName, order.assetReference]
      .some((value) => value?.toLowerCase().includes(term));
    if (!matchesText) return false;
    if (filter === 'overdue') return isOverdue(order, today);
    if (filter === 'today') return isToday(order, today);
    if (filter === 'week') return isThisWeek(order, today);
    if (filter === 'review') return order.status === 'FINALIZADA_TECNICO';
    return true;
  });

  const reschedule = (order: WorkOrderListItem, daysFromToday: number) => {
    const { plannedAt, dueAt } = nextPlanDates(daysFromToday);
    const label = daysFromToday === 0 ? 'a hoy' : daysFromToday === 1 ? 'a mañana' : `+${daysFromToday} días`;
    onReschedule(order.id, plannedAt, dueAt, `Reprogramada ${label} desde planificación FV.`);
  };

  const metricCards: Array<{ label: string; value: number; filter: PlanningFilter; icon: typeof TimerReset; tone: string; helper: string }> = [
    { label: 'Vencidas', value: metrics.overdue, filter: 'overdue', icon: TimerReset, tone: 'red', helper: 'Reprogramar o abrir OT' },
    { label: 'Hoy', value: metrics.today, filter: 'today', icon: CalendarDays, tone: 'blue', helper: 'Jornada FV' },
    { label: '7 días', value: metrics.week, filter: 'week', icon: CalendarClock, tone: 'purple', helper: 'Preventivos y correctivos' },
    { label: 'Validar', value: metrics.review, filter: 'review', icon: CheckCircle2, tone: 'green', helper: 'Cierre responsable' },
  ];

  return (
    <>
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Agenda FV</span>
          <h1>Planificación FV</h1>
          <p>Agenda accionable para preventivos, correctivos, revisiones de planta, equipos FV y técnicos de mantenimiento.</p>
        </div>
        <span className="source-badge">Presentación local</span>
      </div>

      <section className="metrics-grid planning-metrics-grid planning-clickable-metrics">
        {metricCards.map(({ label, value, filter: nextFilter, icon: Icon, tone, helper }) => (
          <button className={`metric-card ${filter === nextFilter ? 'active' : ''}`} key={label} onClick={() => setFilter(nextFilter)} type="button">
            <span className={`metric-icon tone-${tone}`}><Icon size={23} /></span>
            <div className="metric-content"><strong>{value}</strong><span>{label}</span><small>{helper}</small></div>
            <ChevronRight size={17} />
          </button>
        ))}
      </section>

      <section className="panel planning-workspace-panel">
        <div className="filters-row demo-filters-row planning-toolbar">
          <label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por OT, cliente, equipo FV, referencia o técnico" value={search} /></label>
          <select aria-label="Filtro de planificación" onChange={(event) => setFilter(event.target.value as PlanningFilter)} value={filter}>
            {Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="filter-button" onClick={() => { setFilter('all'); setSearch(''); }} type="button"><RotateCcw size={15} /> Limpiar</button>
          <button className="filter-button" onClick={() => downloadPlanningCsv(filtered)} type="button"><Download size={15} /> CSV</button>
          <button className="filter-button" onClick={() => printPlanningReport(filtered, `Planificación FV · ${filterLabels[filter]}`)} type="button"><Printer size={15} /> Imprimir</button>
        </div>

        <div className="planning-work-list">
          {filtered.length === 0 ? <p className="empty-state">No hay trabajos para este filtro.</p> : filtered.map((order) => (
            <article className={`planning-work-card ${isOverdue(order, today) ? 'is-overdue' : ''}`} key={order.id}>
              <button className="planning-work-main" onClick={() => open(order.id)} type="button">
                <time>{formatDateTime(order.plannedAt ?? order.dueAt)}</time>
                <span><strong>{order.code} · {order.title}</strong><small>{order.siteName} · {order.locationName ?? 'Sin ubicación'} · {order.assetName ?? 'Sin equipo'} · {order.assignedToName ?? 'Sin técnico'}</small></span>
                <i className={statusClass(order.status)}>{statusLabels[order.status]}</i>
                <ChevronRight size={17} />
              </button>
              <div className="planning-work-actions">
                <button onClick={() => reschedule(order, 0)} type="button">Hoy 08:00</button>
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
