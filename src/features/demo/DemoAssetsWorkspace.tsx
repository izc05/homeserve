import { AlertTriangle, Boxes, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, History, Plus, Search, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';

export type DemoAssetSeed = {
  assetId: string;
  assetName: string;
  assetType: string | null;
  assetReference: string | null;
  assetCriticality: string | null;
  assetStatus: string | null;
  siteId: string;
  siteName: string;
  locationId: string | null;
  locationName: string | null;
};

type AssetWorkspaceItem = DemoAssetSeed & {
  orders: WorkOrderListItem[];
  openOrders: WorkOrderListItem[];
  validatedOrders: WorkOrderListItem[];
  lastOrder: WorkOrderListItem | null;
  nextOrder: WorkOrderListItem | null;
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
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function isOpen(order: WorkOrderListItem): boolean {
  return !['VALIDADA', 'CANCELADA'].includes(order.status);
}

function sortNewest(a: WorkOrderListItem, b: WorkOrderListItem): number {
  return String(b.updatedAt).localeCompare(String(a.updatedAt));
}

function sortNext(a: WorkOrderListItem, b: WorkOrderListItem): number {
  return String(a.plannedAt ?? a.dueAt ?? '').localeCompare(String(b.plannedAt ?? b.dueAt ?? ''));
}

function buildAssetItems(orders: WorkOrderListItem[]): AssetWorkspaceItem[] {
  const groups = new Map<string, WorkOrderListItem[]>();
  for (const order of orders) {
    if (!order.assetId) continue;
    groups.set(order.assetId, [...(groups.get(order.assetId) ?? []), order]);
  }

  return [...groups.entries()].map(([assetId, rows]) => {
    const ordered = [...rows].sort(sortNewest);
    const first = ordered[0];
    const openOrders = ordered.filter(isOpen);
    const validatedOrders = ordered.filter((order) => order.status === 'VALIDADA');
    const nextOrder = [...openOrders].sort(sortNext)[0] ?? null;
    return {
      assetId,
      assetName: first.assetName ?? assetId,
      assetType: first.assetType,
      assetReference: first.assetReference,
      assetCriticality: first.assetCriticality,
      assetStatus: first.assetStatus,
      siteId: first.siteId,
      siteName: first.siteName,
      locationId: first.locationId,
      locationName: first.locationName,
      orders: ordered,
      openOrders,
      validatedOrders,
      lastOrder: ordered[0] ?? null,
      nextOrder,
    };
  }).sort((a, b) => b.openOrders.length - a.openOrders.length || a.assetName.localeCompare(b.assetName));
}

function assetHealth(asset: AssetWorkspaceItem): { label: string; tone: string; detail: string } {
  if (asset.openOrders.some((order) => ['critica', 'urgente'].includes(order.priority))) {
    return { label: 'Atención', tone: 'danger', detail: 'Tiene OT urgente o crítica abierta' };
  }
  if (asset.openOrders.length > 0) return { label: 'En seguimiento', tone: 'warning', detail: 'Tiene trabajos abiertos' };
  return { label: 'Controlado', tone: 'ok', detail: 'Sin OT abierta' };
}

export default function DemoAssetsWorkspace({
  orders,
  open,
  onCreateFromAsset,
}: {
  orders: WorkOrderListItem[];
  open: (id: string) => void;
  onCreateFromAsset?: (asset: DemoAssetSeed) => void;
}) {
  const [search, setSearch] = useState('');
  const assets = useMemo(() => buildAssetItems(orders), [orders]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = assets.find((asset) => asset.assetId === selectedId) ?? assets[0] ?? null;

  const filtered = assets.filter((asset) => {
    const term = search.trim().toLowerCase();
    return !term || [asset.assetName, asset.assetReference, asset.assetType, asset.locationName, asset.siteName]
      .some((value) => value?.toLowerCase().includes(term));
  });

  const metrics = {
    total: assets.length,
    open: assets.filter((asset) => asset.openOrders.length > 0).length,
    critical: assets.filter((asset) => asset.openOrders.some((order) => ['urgente', 'critica'].includes(order.priority))).length,
    validated: assets.reduce((total, asset) => total + asset.validatedOrders.length, 0),
  };

  return (
    <>
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Inventario técnico</span>
          <h1>Equipos</h1>
          <p>Ficha de activo, OT asociadas, histórico y salto directo a trabajos del equipo.</p>
        </div>
        <span className="source-badge">Ficha operativa</span>
      </div>

      <section className="metrics-grid asset-metrics-grid">
        <article className="metric-card"><span className="metric-icon tone-purple"><Boxes size={23} /></span><div className="metric-content"><strong>{metrics.total}</strong><span>Equipos</span><small>Con OT vinculada</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-red"><Wrench size={23} /></span><div className="metric-content"><strong>{metrics.open}</strong><span>Con OT abierta</span><small>Seguimiento activo</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-orange"><AlertTriangle size={23} /></span><div className="metric-content"><strong>{metrics.critical}</strong><span>Críticos</span><small>Urgente/crítica</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-green"><History size={23} /></span><div className="metric-content"><strong>{metrics.validated}</strong><span>Histórico</span><small>OT validadas</small></div></article>
      </section>

      <section className="asset-workspace-grid">
        <aside className="panel asset-list-panel">
          <div className="filters-row asset-toolbar">
            <label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipo, ref. o ubicación" value={search} /></label>
          </div>
          <div className="asset-list">
            {filtered.length === 0 ? <p className="empty-state">No hay equipos para este filtro.</p> : filtered.map((asset) => {
              const health = assetHealth(asset);
              return (
                <button className={`asset-list-card ${selected?.assetId === asset.assetId ? 'active' : ''}`} key={asset.assetId} onClick={() => setSelectedId(asset.assetId)} type="button">
                  <span className={`asset-health-dot ${health.tone}`} />
                  <span><strong>{asset.assetName}</strong><small>{asset.assetReference ?? 'Sin referencia'} · {asset.locationName ?? 'Sin ubicación'}</small></span>
                  <b>{asset.openOrders.length}</b>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="panel asset-detail-panel">
          {!selected ? <p className="empty-state">No hay equipos con OT vinculadas todavía.</p> : (
            <>
              <div className="asset-detail-header">
                <span className="metric-icon tone-purple"><Boxes size={26} /></span>
                <div>
                  <span className="section-kicker">Ficha de equipo</span>
                  <h2>{selected.assetName}</h2>
                  <p>{selected.assetReference ?? 'Sin referencia'} · {selected.assetType ?? 'Tipo no indicado'} · {selected.assetCriticality ?? 'Criticidad no indicada'}</p>
                </div>
                <div className="asset-detail-actions">
                  {onCreateFromAsset && <button className="primary-button" onClick={() => onCreateFromAsset(selected)} type="button"><Plus size={17} /> Nueva OT</button>}
                  {selected.lastOrder && <button className="secondary-button" onClick={() => open(selected.lastOrder!.id)} type="button">Abrir última <ChevronRight size={17} /></button>}
                </div>
              </div>

              <div className="asset-health-banner">
                {(() => {
                  const health = assetHealth(selected);
                  return <><span className={`asset-health-dot ${health.tone}`} /><strong>{health.label}</strong><small>{health.detail}</small></>;
                })()}
              </div>

              <div className="asset-detail-metrics">
                <span><b>{selected.orders.length}</b>OT vinculadas</span>
                <span><b>{selected.openOrders.length}</b>Abiertas</span>
                <span><b>{selected.validatedOrders.length}</b>Validadas</span>
                <span><b>{compactDate(selected.nextOrder?.plannedAt ?? selected.nextOrder?.dueAt ?? null)}</b>Próxima</span>
              </div>

              <div className="asset-related-grid">
                <article>
                  <h3><ClipboardList size={18} /> Órdenes relacionadas</h3>
                  <div className="asset-order-list">
                    {selected.orders.map((order) => (
                      <button key={order.id} onClick={() => open(order.id)} type="button">
                        <span><strong>{order.code}</strong><small>{order.title}</small></span>
                        <i className={statusClass(order.status)}>{statusLabels[order.status]}</i>
                      </button>
                    ))}
                  </div>
                </article>
                <article>
                  <h3><CalendarClock size={18} /> Histórico / próxima revisión</h3>
                  <div className="asset-history-list">
                    {selected.validatedOrders.length === 0 ? <p>Sin OT validadas todavía.</p> : selected.validatedOrders.map((order) => (
                      <button key={order.id} onClick={() => open(order.id)} type="button"><CheckCircle2 size={17} /><span><strong>{compactDate(order.updatedAt)}</strong><small>{order.title}</small></span></button>
                    ))}
                    {selected.nextOrder && <button className="asset-next-order" onClick={() => open(selected.nextOrder!.id)} type="button"><CalendarClock size={17} /><span><strong>Próxima intervención</strong><small>{formatDateTime(selected.nextOrder.plannedAt ?? selected.nextOrder.dueAt)} · {selected.nextOrder.code}</small></span></button>}
                  </div>
                </article>
              </div>
            </>
          )}
        </main>
      </section>
    </>
  );
}
