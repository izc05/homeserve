import { BarChart3, Building2, CheckCircle2, ChevronRight, ClipboardList, Download, Plus, Printer, Search, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';

export { default as DemoAssetsScreen } from './DemoAssetsWorkspace';

export type DemoInstallationSeed = {
  siteId: string;
  siteName: string;
  locationId: string | null;
  locationName: string | null;
};

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

function statusClass(status: WorkOrderListItem['status']): string {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function compactDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit' }).format(new Date(value)) : 'Sin fecha';
}

function initials(value: string): string {
  return value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function groupBy<T>(items: T[], key: (item: T) => string): Array<{ name: string; rows: T[] }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  return [...groups.entries()].map(([name, rows]) => ({ name, rows }));
}

function latestOrder(orders: WorkOrderListItem[]): WorkOrderListItem | null {
  return [...orders].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] ?? null;
}

function isOpen(order: WorkOrderListItem): boolean {
  return !['VALIDADA', 'CANCELADA'].includes(order.status);
}

function csvValue(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function downloadReportCsv(orders: WorkOrderListItem[], prefix = 'informe-ot'): void {
  const headers = ['codigo', 'titulo', 'estado', 'prioridad', 'instalacion', 'ubicacion', 'tecnico', 'fecha_prevista'];
  const rows = orders.map((order) => [
    order.code,
    order.title,
    statusLabels[order.status],
    order.priority,
    order.siteName,
    order.locationName ?? '',
    order.assignedToName ?? '',
    order.plannedAt ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printReport(orders: WorkOrderListItem[], title = 'Informe de órdenes de trabajo'): void {
  const printable = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!printable) return;
  const rows = orders.map((order) => `<tr><td>${order.code}</td><td>${order.title}</td><td>${statusLabels[order.status]}</td><td>${order.priority}</td><td>${order.locationName ?? ''}</td><td>${order.assignedToName ?? ''}</td></tr>`).join('');
  printable.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 6px}p{color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:12px}th{background:#f8fafc}</style></head><body><h1>${title}</h1><p>${orders.length} registros · ${new Date().toLocaleString('es-ES')}</p><table><thead><tr><th>Código</th><th>Trabajo</th><th>Estado</th><th>Prioridad</th><th>Ubicación</th><th>Técnico</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  printable.document.close();
  printable.focus();
  printable.print();
}

function ModuleOrderList({ orders, open, empty }: { orders: WorkOrderListItem[]; open: (id: string) => void; empty: string }) {
  if (orders.length === 0) return <p className="empty-state">{empty}</p>;
  return (
    <div className="day-plan-list demo-module-order-list">
      {orders.map((order) => (
        <button key={order.id} onClick={() => open(order.id)} type="button">
          <time>{compactDate(order.plannedAt)}</time>
          <span><strong>{order.code} · {order.title}</strong><small>{order.locationName ?? 'Sin ubicación'} · {order.assignedToName ?? 'Sin técnico'}</small></span>
          <i className={statusClass(order.status)}>{statusLabels[order.status]}</i>
        </button>
      ))}
    </div>
  );
}

export function DemoTechniciansScreen({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const groups = useMemo(() => groupBy(orders, (order) => order.assignedToName ?? 'Sin asignar').sort((a, b) => b.rows.length - a.rows.length), [orders]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const selected = groups.find((group) => group.name === selectedName) ?? groups[0] ?? null;
  return (
    <>
      <div className="page-heading"><span className="section-kicker">Personal</span><h1>Técnicos</h1><p>Carga de trabajo, estado, exportación e impresión por técnico.</p></div>
      <section className="demo-module-grid">
        {groups.map(({ name, rows }) => {
          const last = latestOrder(rows);
          const openCount = rows.filter(isOpen).length;
          return (
            <article className={`panel demo-module-card ${selected?.name === name ? 'active-module-card' : ''}`} key={name}>
              <header><span className="avatar avatar-small">{name === 'Sin asignar' ? '—' : initials(name)}</span><div><strong>{name}</strong><small>{openCount} abiertas · {rows.length} totales</small></div></header>
              <div className="demo-module-stats"><span><b>{rows.filter((order) => order.status === 'EN_CURSO').length}</b>En curso</span><span><b>{rows.filter((order) => order.status === 'BLOQUEADA').length}</b>Bloqueadas</span><span><b>{rows.filter((order) => order.status === 'FINALIZADA_TECNICO').length}</b>Validar</span></div>
              <div className="demo-module-actions">
                <button className="primary-button" onClick={() => setSelectedName(name)} type="button"><ClipboardList size={17} /> Ver trabajos</button>
                {last && <button className="secondary-button" onClick={() => open(last.id)} type="button"><Wrench size={17} /> Abrir última OT</button>}
              </div>
            </article>
          );
        })}
      </section>
      {selected && (
        <section className="panel demo-module-detail-panel">
          <div className="panel-heading"><div><h2>{selected.name}</h2><small>{selected.rows.length} órdenes · {selected.rows.filter(isOpen).length} abiertas</small></div><div className="demo-module-actions"><button className="filter-button" onClick={() => downloadReportCsv(selected.rows, `tecnico-${selected.name.toLowerCase().replaceAll(' ', '-')}`)} type="button"><Download size={15} /> CSV</button><button className="filter-button" onClick={() => printReport(selected.rows, `Informe técnico · ${selected.name}`)} type="button"><Printer size={15} /> Imprimir</button></div></div>
          <ModuleOrderList orders={selected.rows} open={open} empty="Este técnico no tiene trabajos." />
        </section>
      )}
    </>
  );
}

export function DemoInstallationsScreen({ orders, open, onCreateFromInstallation }: { orders: WorkOrderListItem[]; open: (id: string) => void; onCreateFromInstallation?: (installation: DemoInstallationSeed) => void }) {
  const groups = useMemo(() => groupBy(orders, (order) => order.siteName).sort((a, b) => a.name.localeCompare(b.name)), [orders]);
  return (
    <>
      <div className="page-heading"><span className="section-kicker">Activos e instalaciones</span><h1>Instalaciones</h1><p>Cada instalación muestra ubicaciones, OT abiertas y permite crear trabajos vinculados.</p></div>
      <section className="demo-module-grid">
        {groups.map(({ name, rows }) => {
          const locations = new Set(rows.map((order) => order.locationName ?? 'Sin ubicación'));
          const last = latestOrder(rows);
          const seed: DemoInstallationSeed = {
            siteId: rows[0]?.siteId ?? 'demo-site-pts',
            siteName: name,
            locationId: null,
            locationName: null,
          };
          return (
            <article className="panel demo-module-card" key={name}>
              <header><span className="metric-icon tone-blue"><Building2 size={22} /></span><div><strong>{name}</strong><small>{locations.size} ubicaciones · {rows.filter(isOpen).length} OT abiertas</small></div></header>
              <ModuleOrderList orders={rows.slice(0, 3)} open={open} empty="Sin órdenes asociadas." />
              <div className="demo-module-actions">
                {onCreateFromInstallation && <button className="primary-button" onClick={() => onCreateFromInstallation(seed)} type="button"><Plus size={17} /> Nueva OT</button>}
                {last && <button className="secondary-button" onClick={() => open(last.id)} type="button">Abrir ficha relacionada <ChevronRight size={17} /></button>}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

export function DemoReportsScreen({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'review' | 'validated'>('all');
  const filtered = orders.filter((order) => {
    if (filter === 'open') return isOpen(order);
    if (filter === 'review') return order.status === 'FINALIZADA_TECNICO';
    if (filter === 'validated') return order.status === 'VALIDADA';
    return true;
  });
  return (
    <>
      <div className="page-heading"><span className="section-kicker">Control</span><h1>Informes</h1><p>Resumen operativo con exportación CSV, impresión y acceso a cada OT.</p></div>
      <section className="metrics-grid">
        <article className="metric-card"><span className="metric-icon tone-red"><ClipboardList size={23} /></span><div className="metric-content"><strong>{orders.filter(isOpen).length}</strong><span>OT abiertas</span><small>Seguimiento diario</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-orange"><BarChart3 size={23} /></span><div className="metric-content"><strong>{orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length}</strong><span>Por validar</span><small>Responsable</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-green"><CheckCircle2 size={23} /></span><div className="metric-content"><strong>{orders.filter((order) => order.status === 'VALIDADA').length}</strong><span>Validadas</span><small>Histórico</small></div></article>
      </section>
      <section className="panel table-panel">
        <div className="filters-row demo-filters-row"><label className="table-search"><Search size={17} /><select aria-label="Filtrar informe" onChange={(event) => setFilter(event.target.value as typeof filter)} value={filter}><option value="all">Todas las OT</option><option value="open">Solo abiertas</option><option value="review">Pendientes de validar</option><option value="validated">Validadas</option></select></label><button className="filter-button" onClick={() => downloadReportCsv(filtered)} type="button"><Download size={15} /> CSV</button><button className="filter-button" onClick={() => printReport(filtered)} type="button"><Printer size={15} /> Imprimir</button><span className="source-badge">{filtered.length} registros</span></div>
        <ModuleOrderList orders={filtered} open={open} empty="No hay datos para este filtro." />
      </section>
    </>
  );
}
