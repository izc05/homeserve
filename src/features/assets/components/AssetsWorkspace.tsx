import { useMemo, useState } from 'react';
import { Boxes, ChevronRight, ClipboardList, Clock3, Plus, Search } from 'lucide-react';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import type { WorkOrderCreationCatalog } from '../../work-orders/api/workOrderCommands';
import type { CreateWorkOrderFormValues } from '../../work-orders/forms/createWorkOrderSchema';
import AssetHistoryPanel from './AssetHistoryPanel';

type CreatePreset = Partial<CreateWorkOrderFormValues>;

type AssetOption = WorkOrderCreationCatalog['assets'][number];

type AssetsWorkspaceProps = {
  tenantId: string;
  orders: WorkOrderListItem[];
  catalog?: WorkOrderCreationCatalog | null;
  onOpenOrder: (id: string) => void;
  onCreateOrder: (preset?: CreatePreset) => void;
};

type AssetListItem = {
  asset: AssetOption;
  installationName: string;
  locationName: string;
  relatedOrders: WorkOrderListItem[];
  openOrders: WorkOrderListItem[];
  latestOrder: WorkOrderListItem | null;
};

function isOpenOrder(order: WorkOrderListItem) {
  return !['VALIDADA', 'CANCELADA'].includes(order.status);
}

function latestOrder(orders: WorkOrderListItem[]) {
  return [...orders].sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null;
}

function makeAssetPreset(asset: AssetOption): CreatePreset {
  return {
    installationId: asset.installationId,
    locationId: asset.locationId ?? '',
    assetId: asset.id,
    title: `Revisión de ${asset.name}`,
    description: `Intervención creada desde la ficha del equipo ${asset.name}.`,
    type: 'mantenimiento_preventivo',
    priority: 'normal',
    checklist: true,
    finalPhotos: true,
    technicianSignature: true,
    report: true,
    administrativeReview: true,
  };
}

function buildAssetList(catalog: WorkOrderCreationCatalog | null | undefined, orders: WorkOrderListItem[]): AssetListItem[] {
  if (!catalog) return [];

  const installationNames = new Map(catalog.installations.map((installation) => [installation.id, installation.name]));
  const locationNames = new Map(catalog.locations.map((location) => [location.id, location.name]));

  return catalog.assets.map((asset) => {
    const relatedOrders = orders.filter((order) => order.assetId === asset.id);
    return {
      asset,
      installationName: installationNames.get(asset.installationId) ?? 'Instalación sin nombre',
      locationName: asset.locationId ? locationNames.get(asset.locationId) ?? 'Ubicación sin nombre' : 'Sin ubicación',
      relatedOrders,
      openOrders: relatedOrders.filter(isOpenOrder),
      latestOrder: latestOrder(relatedOrders),
    };
  });
}

export default function AssetsWorkspace({ tenantId, orders, catalog, onOpenOrder, onCreateOrder }: AssetsWorkspaceProps) {
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [search, setSearch] = useState('');

  const assets = useMemo(() => buildAssetList(catalog, orders), [catalog, orders]);
  const selected = assets.find((item) => item.asset.id === selectedAssetId) ?? assets[0] ?? null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assets;
    return assets.filter(({ asset, installationName, locationName }) => [asset.name, installationName, locationName].some((value) => value.toLowerCase().includes(term)));
  }, [assets, search]);

  if (!catalog) {
    return (
      <section className="panel data-state">
        <Boxes size={30} />
        <strong>Inventario no disponible</strong>
        <p>La ficha avanzada de equipos necesita el catálogo real de instalaciones, ubicaciones y activos.</p>
      </section>
    );
  }

  return (
    <>
      <section className="metrics-grid">
        <article className="metric-card"><span className="metric-icon tone-orange"><Boxes size={22} /></span><div className="metric-content"><strong>{assets.length}</strong><span>Equipos</span><small>Inventario activo</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-red"><ClipboardList size={22} /></span><div className="metric-content"><strong>{orders.filter((order) => order.assetId).length}</strong><span>OT con equipo</span><small>Trazabilidad</small></div></article>
        <article className="metric-card"><span className="metric-icon tone-purple"><Clock3 size={22} /></span><div className="metric-content"><strong>{assets.reduce((total, item) => total + item.openOrders.length, 0)}</strong><span>OT abiertas</span><small>Sobre activos</small></div></article>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <article className="panel planning-list-panel">
          <div className="panel-heading">
            <h2>Inventario técnico</h2>
            <span className="source-badge">{filtered.length} visibles</span>
          </div>
          <label className="table-search">
            <Search size={17} />
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipo, instalación o ubicación" value={search} />
          </label>
          <div className="day-plan-list">
            {filtered.length === 0 ? <p className="empty-state">No hay equipos que coincidan.</p> : filtered.map((item) => (
              <button key={item.asset.id} onClick={() => setSelectedAssetId(item.asset.id)} type="button">
                <Boxes size={18} />
                <span>
                  <strong>{item.asset.name}</strong>
                  <small>{item.installationName} · {item.locationName} · {item.openOrders.length} abiertas</small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </article>

        <article className="panel source-panel">
          <div className="panel-heading">
            <h2>Acciones rápidas</h2>
            <span className="source-badge">Equipo seleccionado</span>
          </div>
          {selected ? (
            <div className="source-checks">
              <span><Boxes size={17} /> {selected.asset.name}</span>
              <span><ClipboardList size={17} /> {selected.relatedOrders.length} OT vinculadas</span>
              <span><Clock3 size={17} /> {selected.openOrders.length} abiertas</span>
              <button className="primary-button" onClick={() => onCreateOrder(makeAssetPreset(selected.asset))} type="button"><Plus size={17} /> Nueva OT del equipo</button>
              {selected.latestOrder && <button className="secondary-button" onClick={() => onOpenOrder(selected.latestOrder.id)} type="button">Abrir última OT</button>}
            </div>
          ) : <p className="empty-state">Selecciona un equipo para ver acciones.</p>}
        </article>
      </section>

      {selected && (
        <AssetHistoryPanel
          tenantId={tenantId}
          asset={selected.asset}
          orders={orders}
          onOpenOrder={onOpenOrder}
          onCreateOrder={onCreateOrder}
        />
      )}
    </>
  );
}
