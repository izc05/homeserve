import { AlertTriangle, Boxes, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, Download, History, Plus, Printer, RotateCcw, Search, Wrench } from 'lucide-react';
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

type AssetFilter = 'all' | 'open' | 'critical' | 'history';

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

const filterLabels: Record<AssetFilter, string> = {
  all: 'Todos los equipos',
  open: 'Con OT abierta',
  critical: 'Críticos',
  history: 'Con histórico',
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

function csvValue(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function safeSlug(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'equipos-fv';
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

function matchesFilter(asset: AssetWorkspaceItem, filter: AssetFilter): boolean {
  if (filter === 'open') return asset.openOrders.length > 0;
  if (filter === 'critical') return asset.openOrders.some((order) => ['urgente', 'critica'].includes(order.priority)) || asset.assetCriticality === 'critica';
  if (filter === 'history') return asset.validatedOrders.length > 0;
  return true;
}

function downloadAssetsCsv(assets: AssetWorkspaceItem[], prefix = 'equipos-fv'): void {
  const headers = ['equipo', 'referencia', 'tipo', 'criticidad', 'cliente_instalacion', 'ubicacion', 'ot_vinculadas', 'ot_abiertas', 'ot_validadas', 'proxima_intervencion'];
  const rows = assets.map((asset) => [
    asset.assetName,
    asset.assetReference ?? '',
    asset.assetType ?? '',
    asset.assetCriticality ?? '',
    asset.siteName,
    asset.locationName ?? '',
    asset.orders.length,
    asset.openOrders.length,
    asset.validatedOrders.length,
    asset.nextOrder?.plannedAt ?? asset.nextOrder?.dueAt ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeSlug(prefix)}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printAssetsReport(assets: AssetWorkspaceItem[], title = 'Inventario FV y mantenimiento'): void {
  const printable = window.open('', '_blank', 'noopener,noreferrer,width=950,height=720');
  if (!printable) return;
  const rows = assets.map((asset) => `<tr><td>${escapeHtml(asset.assetName)}</td><td>${escapeHtml(asset.assetReference ?? '')}</td><td>${escapeHtml(asset.assetType ?? '')}</td><td>${escapeHtml(asset.siteName)}</td><td>${escapeHtml(asset.locationName ?? '')}</td><td>${asset.openOrders.length}</td><td>${asset.validatedOrders.length}</td><td>${escapeHtml(formatDateTime(asset.nextOrder?.plannedAt ?? asset.nextOrder?.dueAt ?? null))}</td></tr>`).join('');
  printable.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 6px}p{color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:11px}th{background:#f8fafc}</style></head><body><h1>${escapeHtml(title)}</h1><p>${assets.length} equipos · ${new Date().toLocaleString('es-ES')}</p><table><thead><tr><th>Equipo</th><th>Referencia</th><th>Tipo</th><th>Cliente / instalación</th><th>Ubicación</th><th>OT abiertas</th><th>Validadas</th><th>Próxima</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  printable.document.close();
  printable.focus();
  printable.print();
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
  const [filter, setFilter] = useState<AssetFilter>('all');
  const assets = useMemo(() => buildAssetItems(orders), [orders]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const metrics = {
    total: assets.length,
    open: assets.filter((asset) => asset.openOrders.length > 0).length,
    critical: assets.filter((asset) => matchesFilter(asset, 'critical')).length,
    validated: assets.reduce((total, asset) => total + asset.validatedOrders.length, 0),
  };

  const filtered = assets.filter((asset) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || [asset.assetName, asset.assetReference, asset.assetType, asset.locationName, asset.siteName]
      .some((value) => value?.toLowerCase().includes(term));
    return matchesText && matchesFilter(asset, filter);
  });

  const selected = filtered.find((asset) => asset.assetId === selectedId) ?? filtered[0] ?? null;
  const reportTitle = `Inventario FV · ${filterLabels[filter]}`;
  const metricCards: Array<{ label: string; value: number; filter: AssetFilter; icon: typeof Boxes; tone: string; helper: string }> = [
    { label: 'Equipos', value: metrics.total, filter: 'all', icon: Boxes, tone: 'purple', helper: 'Con OT vinculada' },
    { label: 'OT abierta', value: metrics.open, filter: 'open', icon: Wrench, tone: 'red', helper: 'Seguimiento activo' },
    { label: 'Críticos', value: metrics.critical, filter: 'critical', icon: AlertTriangle, tone: 'orange', helper: 'Urgente/crítica' },
    { label: 'Histórico', value: metrics.validated, filter: 'history', icon: History, tone: 'green', helper: 'OT validadas' },
  ];

  return (
    <>
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Inventario FV</span>
          <h1>Equipos FV</h1>
          <p>Ficha de inversores, cuadros, strings, monitorización y activos de mantenimiento con histórico y próxima intervención.</p>
        </div>
        <span className="source-badge">Ficha operativa</span>
      </div>

      <section className="metrics-grid asset-metrics-grid asset-clickable-metrics">
        {metricCards.map(({ label, value, filter: nextFilter, icon: Icon, tone, helper }) => (
          <button className={`metric-card ${filter === nextFilter ? 'active' : ''}`} key={label} onClick={() => setFilter(nextFilter)} type="button">
            <span className={`metric-icon tone-${tone}`}><Icon size={23} /></span>
            <div className="metric-content"><strong>{value}</strong><span>{label}</span><small>{helper}</small></div>
            <ChevronRight size={17} />
          </button>
        ))}
      </section>

      <section className="asset-workspace-grid">
        <aside className="panel asset-list-panel">
          <div className="filters-row asset-toolbar">
            <label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipo FV, referencia, cliente o ubicación" value={search} /></label>
            <select aria-label="Filtro de equipos" onChange={(event) => setFilter(event.target.value as AssetFilter)} value={filter}>{Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button className="filter-button" onClick={() => { setFilter('all'); setSearch(''); }} type="button"><RotateCcw size={15} /> Limpiar</button>
            <button className="filter-button" onClick={() => downloadAssetsCsv(filtered, reportTitle)} type="button"><Download size={15} /> CSV</button>
            <button className="filter-button" onClick={() => printAssetsReport(filtered, reportTitle)} type="button"><Printer size={15} /> Imprimir</button>
          </div>
          <div className="asset-list">
            {filtered.length === 0 ? <p className="empty-state">No hay equipos FV para este filtro.</p> : filtered.map((asset) => {
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
          {!selected ? <p className="empty-state">No hay equipos FV con OT vinculadas para este filtro.</p> : (
            <>
              <div className="asset-detail-header">
                <span className="metric-icon tone-purple"><Boxes size={26} /></span>
                <div>
                  <span className="section-kicker">Ficha de equipo FV</span>
                  <h2>{selected.assetName}</h2>
                  <p>{selected.assetReference ?? 'Sin referencia'} · {selected.assetType ?? 'Tipo no indicado'} · {selected.assetCriticality ?? 'Criticidad no indicada'}</p>
                </div>
                <div className="asset-detail-actions">
                  {onCreateFromAsset && <button className="primary-button" onClick={() => onCreateFromAsset(selected)} type="button"><Plus size={17} /> Nueva OT</button>}
                  <button className="secondary-button" onClick={() => downloadAssetsCsv([selected], `equipo-${selected.assetName}`)} type="button"><Download size={17} /> CSV</button>
                  <button className="secondary-button" onClick={() => printAssetsReport([selected], `Ficha equipo FV · ${selected.assetName}`)} type="button"><Printer size={17} /> Imprimir</button>
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
