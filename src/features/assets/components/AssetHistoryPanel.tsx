import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileCheck2, LoaderCircle, Plus, Wrench } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import type { WorkOrderCreationCatalog } from '../../work-orders/api/workOrderCommands';
import {
  listAssetMaintenanceHistory,
  type AssetMaintenanceHistory,
} from '../../work-orders/api/assetHistoryRepository';
import type { CreateWorkOrderFormValues } from '../../work-orders/forms/createWorkOrderSchema';

type CreatePreset = Partial<CreateWorkOrderFormValues>;

type AssetDetailPanelProps = {
  tenantId: string;
  asset: WorkOrderCreationCatalog['assets'][number];
  orders: WorkOrderListItem[];
  onOpenOrder: (id: string) => void;
  onCreateOrder: (preset: CreatePreset) => void;
};

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function makeAssetPreset(asset: WorkOrderCreationCatalog['assets'][number]): CreatePreset {
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

function HistoryTimeline({ history, openOrder }: { history: AssetMaintenanceHistory[]; openOrder: (id: string) => void }) {
  if (history.length === 0) {
    return <p className="empty-state">Todavía no hay histórico validado para este equipo.</p>;
  }

  return (
    <div className="day-plan-list">
      {history.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (item.workOrderId) openOrder(item.workOrderId);
          }}
          type="button"
        >
          <FileCheck2 size={18} />
          <span>
            <strong>{item.title}</strong>
            <small>
              {formatDate(item.date)} · {item.finalStatus ?? 'estado no indicado'}
              {item.nextDate ? ` · próxima ${formatDate(item.nextDate)}` : ''}
            </small>
          </span>
          <CheckCircle2 size={17} />
        </button>
      ))}
    </div>
  );
}

export default function AssetHistoryPanel({ tenantId, asset, orders, onOpenOrder, onCreateOrder }: AssetDetailPanelProps) {
  const relatedOrders = useMemo(
    () => orders.filter((order) => order.assetId === asset.id),
    [asset.id, orders],
  );

  const openOrders = relatedOrders.filter((order) => !['VALIDADA', 'CANCELADA'].includes(order.status));
  const latestOrder = [...relatedOrders].sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null;

  const historyQuery = useQuery({
    queryKey: ['asset-maintenance-history', tenantId, asset.id],
    queryFn: () => listAssetMaintenanceHistory(getSupabaseClient(), { tenantId, assetId: asset.id, limit: 20 }),
    enabled: Boolean(tenantId && asset.id),
    staleTime: 60_000,
  });

  return (
    <section className="dashboard-grid dashboard-grid-bottom">
      <article className="panel detail-main-card">
        <div className="panel-heading">
          <h2><Boxes size={21} /> Ficha del equipo</h2>
          <span className="source-badge">Activo real</span>
        </div>

        <dl className="detail-definition-grid">
          <div><dt>Equipo</dt><dd>{asset.name}</dd></div>
          <div><dt>Instalación</dt><dd>{asset.installationId}</dd></div>
          <div><dt>Ubicación</dt><dd>{asset.locationId ?? 'Sin ubicación'}</dd></div>
          <div><dt>OT vinculadas</dt><dd>{relatedOrders.length}</dd></div>
          <div><dt>OT abiertas</dt><dd>{openOrders.length}</dd></div>
          <div><dt>Última OT</dt><dd>{latestOrder?.code ?? 'Sin OT'}</dd></div>
        </dl>

        <div className="evidence-grid">
          <div><ClipboardList size={22} /><strong>{relatedOrders.length} OT</strong><small>Total relacionadas</small></div>
          <div><Clock3 size={22} /><strong>{openOrders.length} abiertas</strong><small>Pendientes de cierre</small></div>
          <div><CalendarDays size={22} /><strong>{historyQuery.data?.[0]?.nextDate ? formatDate(historyQuery.data[0].nextDate) : 'Sin próxima'}</strong><small>Próxima revisión</small></div>
        </div>

        <div className="form-actions work-order-form-actions">
          <button className="primary-button" onClick={() => onCreateOrder(makeAssetPreset(asset))} type="button"><Plus size={17} /> Nueva OT del equipo</button>
          {latestOrder && <button className="secondary-button" onClick={() => onOpenOrder(latestOrder.id)} type="button"><Wrench size={17} /> Abrir última OT</button>}
        </div>
      </article>

      <article className="panel planning-list-panel">
        <div className="panel-heading">
          <h2>Histórico del activo</h2>
          <span className="source-badge">{historyQuery.data?.length ?? 0} registros</span>
        </div>

        {historyQuery.isLoading && <p className="read-only-note"><LoaderCircle className="spin" size={16} /> Cargando histórico real…</p>}
        {historyQuery.error && <p className="form-global-error"><AlertTriangle size={16} /> No se pudo cargar el histórico: {historyQuery.error.message}</p>}
        {!historyQuery.isLoading && !historyQuery.error && (
          <HistoryTimeline history={historyQuery.data ?? []} openOrder={onOpenOrder} />
        )}
      </article>
    </section>
  );
}
