import { CheckCircle2, ChevronRight, ClipboardCheck, Download, Hammer, PauseCircle, PlayCircle, Printer, RotateCcw, Search, TimerReset, Wrench } from 'lucide-react';
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

function csvValue(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function downloadTechnicianCsv(orders: WorkOrderListItem[], technicianName: string): void {
  const headers = ['codigo', 'titulo', 'estado', 'cliente_instalacion', 'ubicacion', 'equipo', 'referencia_equipo', 'fecha_prevista', 'fecha_limite'];
  const rows = orders.map((order) => [
    order.code,
    order.title,
    statusLabels[order.status],
    order.siteName,
    order.locationName ?? '',
    order.assetName ?? '',
    order.assetReference ?? '',
    order.plannedAt ?? '',
    order.dueAt ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `jornada-fv-${technicianName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printTechnicianReport(orders: WorkOrderListItem[], technicianName: string, title = 'Jornada técnico FV'): void {
  const printable = window.open('', '_blank', 'noopener,noreferrer,width=900,height=720');
  if (!printable) return;
  const rows = orders.map((order) => `<tr><td>${escapeHtml(order.code)}</td><td>${escapeHtml(order.title)}</td><td>${escapeHtml(statusLabels[order.status])}</td><td>${escapeHtml(order.siteName)}</td><td>${escapeHtml(order.locationName ?? '')}</td><td>${escapeHtml(order.assetName ?? '')}</td><td>${escapeHtml(formatDate(order.plannedAt ?? order.dueAt))}</td></tr>`).join('');
  printable.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 6px}p{color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:11px}th{background:#f8fafc}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(technicianName)} · ${orders.length} trabajos · ${new Date().toLocaleString('es-ES')}</p><table><thead><tr><th>Código</th><th>Trabajo</th><th>Estado</th><th>Cliente / instalación</th><th>Ubicación</th><th>Equipo</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  printable.document.close();
  printable.focus();
  printable.print();
}

function canRun(action: TechnicianQuickAction, status: WorkOrderListItem['status']): boolean {
  if (action === 'accept') return status === 'ASIGNADA';
  if (action === 'start') return ['ASIGNADA', 'ACEPTADA', 'BLOQUEADA'].includes(status);
  if (action === 'pause') return status === 'EN_CURSO';
  if (action === 'finish') return ['ACEPTADA', 'EN_CURSO', 'BLOQUEADA'].includes(status);
  return false;
}

function actionLabel(action: TechnicianQuickAction, status: WorkOrderListItem['status']): string {
  if (action === 'accept') return 'Aceptar';
  if (action === 'start') return status === 'BLOQUEADA' ? 'Reanudar' : 'Iniciar';
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
  const [filter, setFilter] = useState<TechnicianFilter>('active');
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
    const matchesText = !term || [order.code, order.title, order.siteName, order.locationName, order.assetName, order.assetReference]
      .some((value) => value?.toLowerCase().includes(term));
    if (!matchesText) return false;
    if (filter === 'today') return isToday(order.plannedAt ?? order.dueAt);
    if (filter === 'active') return isOpen(order.status);
    if (filter === 'blocked') return order.status === 'BLOQUEADA';
    if (filter === 'review') return order.status === 'FINALIZADA_TECNICO';
    return true;
  });

  const metricCards: Array<{ label: string; value: number; filter: TechnicianFilter; icon: typeof Wrench; tone: string; helper: string }> = [
    { label: 'Hoy', value: metrics.today, filter: 'today', icon: Wrench, tone: 'blue', helper: 'Jornada FV' },
    { label: 'Activos', value: metrics.active, filter: 'active', icon: Hammer, tone: 'red', helper: 'Por ejecutar' },
    { label: 'Bloqueados', value: metrics.blocked, filter: 'blocked', icon: TimerReset, tone: 'orange', helper: 'Material o parada' },
    { label: 'Finalizados', value: metrics.review, filter: 'review', icon: ClipboardCheck, tone: 'green', helper: 'Validación responsable' },
  ];

  return (
    <>
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Jornada técnico FV</span>
          <h1>Mis trabajos</h1>
          <p>{technicianName}: cola de preventivos, correctivos, evidencias y partes de intervención FV.</p>
        </div>
        <span className="source-badge">Operativo en móvil</span>
      </div>

      <section className="metrics-grid technician-metrics-grid technician-clickable-metrics">
        {metricCards.map(({ label, value, filter: nextFilter, icon: Icon, tone, helper }) => (
          <button className={`metric-card ${filter === nextFilter ? 'active' : ''}`} key={label} onClick={() => setFilter(nextFilter)} type="button">
            <span className={`metric-icon tone-${tone}`}><Icon size={23} /></span>
            <div className="metric-content"><strong>{value}</strong><span>{label}</span><small>{helper}</small></div>
            <ChevronRight size={17} />
          </button>
        ))}
      </section>

      <section className="panel technician-workspace-panel">
        <div className="filters-row demo-filters-row technician-toolbar">
          <label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar OT, cliente, equipo FV o referencia" value={search} /></label>
          <select aria-label="Filtro de técnico" onChange={(event) => setFilter(event.target.value as TechnicianFilter)} value={filter}>
            {Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="filter-button" onClick={() => { setFilter('all'); setSearch(''); }} type="button"><RotateCcw size={15} /> Limpiar</button>
          <button className="filter-button" onClick={() => downloadTechnicianCsv(filtered, technicianName)} type="button"><Download size={15} /> CSV</button>
          <button className="filter-button" onClick={() => printTechnicianReport(filtered, technicianName, `Jornada FV · ${filterLabels[filter]}`)} type="button"><Printer size={15} /> Imprimir</button>
        </div>

        <div className="technician-job-list">
          {filtered.length === 0 ? <p className="empty-state">No hay trabajos para este filtro.</p> : filtered.map((order) => (
            <article className={`technician-job-card status-card-${order.status.toLowerCase().replaceAll('_', '-')}`} key={order.id}>
              <button className="technician-job-main" onClick={() => open(order.id)} type="button">
                <span className="technician-job-code"><b>{order.code}</b><small>{formatDate(order.plannedAt ?? order.dueAt)}</small></span>
                <span className="technician-job-title"><strong>{order.title}</strong><small>{order.siteName} · {order.locationName ?? 'Sin ubicación'} · {order.assetName ?? 'Sin equipo'}{order.assetReference ? ` · ${order.assetReference}` : ''}</small></span>
                <i className={statusClass(order.status)}>{statusLabels[order.status]}</i>
                <ChevronRight size={17} />
              </button>
              <div className="technician-job-actions">
                {(['accept', 'start', 'pause', 'finish'] as TechnicianQuickAction[]).map((action) => {
                  const Icon = actionIcon(action);
                  const enabled = canRun(action, order.status);
                  return <button disabled={!enabled} key={action} onClick={() => enabled && onQuickAction(order, action)} type="button"><Icon size={16} /> {actionLabel(action, order.status)}</button>;
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
