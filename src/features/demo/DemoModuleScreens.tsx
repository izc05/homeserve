import { BarChart3, Boxes, Building2, CheckCircle2, ChevronRight, ClipboardList, Search, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';

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
  return (
    <>
      <div className="page-heading"><span className="section-kicker">Personal</span><h1>Técnicos</h1><p>Carga de trabajo, estado y acceso directo a la última OT de cada técnico.</p></div>
      <section className="demo-module-grid">
        {groups.map(({ name, rows }) => {
          const last = latestOrder(rows);
          const openCount = rows.filter(isOpen).length;
          return (
            <article className="panel demo-module-card" key={name}>
              <header><span className="avatar avatar-small">{name === 'Sin asignar' ? '—' : initials(name)}</span><div><strong>{name}</strong><small>{openCount} abiertas · {rows.length} totales</small></div></header>
              <div className="demo-module-stats"><span><b>{rows.filter((order) => order.status === 'EN_CURSO').length}</b>En curso</span><span><b>{rows.filter((order) => order.status === 'BLOQUEADA').length}</b>Bloqueadas</span><span><b>{rows.filter((order) => order.status === 'FINALIZADA_TECNICO').length}</b>Validar</span></div>
              {last && <button className="secondary-button" onClick={() => open(last.id)} type="button"><Wrench size={17} /> Abrir última OT</button>}
            </article>
          );
        })}
      </section>
    </>
  );
}

export function DemoInstallationsScreen({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const groups = useMemo(() => groupBy(orders, (order) => order.siteName).sort((a, b) => a.name.localeCompare(b.name)), [orders]);
  return (
    <>
      <div className="page-heading"><span className="section-kicker">Activos e instalaciones</span><h1>Instalaciones</h1><p>Cada instalación muestra ubicaciones, OT abiertas y acceso a trabajos relacionados.</p></div>
      <section className="demo-module-grid">
        {groups.map(({ name, rows }) => {
          const locations = new Set(rows.map((order) => order.locationName ?? 'Sin ubicación'));
          const last = latestOrder(rows);
          return (
            <article className="panel demo-module-card" key={name}>
              <header><span className="metric-icon tone-blue"><Building2 size={22} /></span><div><strong>{name}</strong><small>{locations.size} ubicaciones · {rows.filter(isOpen).length} OT abiertas</small></div></header>
              <ModuleOrderList orders={rows.slice(0, 3)} open={open} empty="Sin órdenes asociadas." />
              {last && <button className="secondary-button" onClick={() => open(last.id)} type="button">Abrir ficha relacionada <ChevronRight size={17} /></button>}
            </article>
          );
        })}
      </section>
    </>
  );
}

export function DemoAssetsScreen({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const assets = useMemo(() => groupBy(orders.filter((order) => order.assetId), (order) => order.assetName ?? order.assetId ?? 'Equipo sin nombre').sort((a, b) => a.name.localeCompare(b.name)), [orders]);
  return (
    <>
      <div className="page-heading"><span className="section-kicker">Inventario técnico</span><h1>Equipos</h1><p>Ficha rápida de equipos con órdenes relacionadas e histórico simulado.</p></div>
      <section className="demo-module-grid">
        {assets.map(({ name, rows }) => {
          const last = latestOrder(rows);
          return (
            <article className="panel demo-module-card" key={name}>
              <header><span className="metric-icon tone-purple"><Boxes size={22} /></span><div><strong>{name}</strong><small>{rows[0]?.assetReference ?? 'Sin referencia'} · {rows[0]?.assetCriticality ?? 'criticidad no indicada'}</small></div></header>
              <div className="demo-module-stats"><span><b>{rows.length}</b>OT vinculadas</span><span><b>{rows.filter(isOpen).length}</b>Abiertas</span><span><b>{rows.filter((order) => order.status === 'VALIDADA').length}</b>Histórico</span></div>
              {last && <button className="secondary-button" onClick={() => open(last.id)} type="button"><Boxes size={17} /> Abrir equipo / última OT</button>}
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
      <div className="page-heading"><span className="section-kicker">Control</span><h1>Informes</h1><p>Resumen operativo con accesos a trabajos que necesitan revisión o seguimiento.</p></div>
      <section className="metrics-grid">
        <article className="metric-card"><span className="metric-icon tone-red"><ClipboardList size={23} /></span><div className="metric-content"><strong>{orders.filter(isOpen).length}</strong><span>OT abiertas</span><small>Seguimiento diario</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-orange"><BarChart3 size={23} /></span><div className="metric-content"><strong>{orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length}</strong><span>Por validar</span><small>Responsable</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-green"><CheckCircle2 size={23} /></span><div className="metric-content"><strong>{orders.filter((order) => order.status === 'VALIDADA').length}</strong><span>Validadas</span><small>Histórico</small></div></article>
      </section>
      <section className="panel table-panel">
        <div className="filters-row demo-filters-row"><label className="table-search"><Search size={17} /><select aria-label="Filtrar informe" onChange={(event) => setFilter(event.target.value as typeof filter)} value={filter}><option value="all">Todas las OT</option><option value="open">Solo abiertas</option><option value="review">Pendientes de validar</option><option value="validated">Validadas</option></select></label><span className="source-badge">Navegable</span></div>
        <ModuleOrderList orders={filtered} open={open} empty="No hay datos para este filtro." />
      </section>
    </>
  );
}
