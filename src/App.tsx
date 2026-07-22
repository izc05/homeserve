import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  Home,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';
import ProductBrand from './components/ProductBrand';
import { getSupabaseClient } from './lib/supabase';
import CreateWorkOrderForm from './features/work-orders/components/CreateWorkOrderForm';
import { listAccessibleWorkOrders, type WorkOrderListItem } from './features/work-orders/api/workOrdersRepository';
import { loadWorkOrderCreationCatalog, type WorkOrderCreationCatalog } from './features/work-orders/api/workOrderCommands';
import { acceptWorkOrder, blockWorkOrder, finalizeActiveWorkOrderVisit, resumeWorkOrder, startWorkOrderVisit } from './features/work-orders/api/workOrderLifecycle';
import { reviewWorkOrder, type WorkOrderReviewDecision } from './features/work-orders/api/workOrderReview';
import { humanAuditAction, listWorkOrderAuditEvents, workOrderAuditDetail, type WorkOrderAuditEvent } from './features/work-orders/api/workOrderAuditRepository';
import { ensureWorkOrderDefaultChecklist, registerWorkOrderReport } from './features/work-orders/api/workOrderEvidenceActions';
import { cancelWorkOrder, canCancelWorkOrder } from './features/work-orders/api/workOrderCancellation';
import type { WorkOrderPriority, WorkOrderStatus, WorkOrderType } from './features/work-orders/types/workOrder';
import type { CreateWorkOrderFormValues } from './features/work-orders/forms/createWorkOrderSchema';
import ClientsWorkspace from './features/clients/pages/ClientsWorkspace';
import { canAccessClientNavigation, canManageClientRecords } from './features/clients/clientAccess';
import TechniciansWorkspace from './features/technicians/pages/TechniciansWorkspace';
import TechnicianMobileWorkspace from './features/technicians/components/TechnicianMobileWorkspace';
import { createTechnicianActionGuard } from './features/technicians/technicianMobile';
import WorkOrderAssignmentPanel from './features/technicians/components/WorkOrderAssignmentPanel';
import PremiumWorkOrderDetail from './features/work-orders/components/PremiumWorkOrderDetail';
import WorkOrderChecklistPanel from './features/work-orders/components/WorkOrderChecklistPanel';
import WorkOrderPhotosPanel from './features/work-orders/components/WorkOrderPhotosPanel';
import { canAccessTechnicianAdministration, canManageTechnicianInvitations, isTechnicianRole } from './features/technicians/technicianAccess';
import { friendlyTechnicianError } from './features/technicians/api/technicianRepository';
import { assignWorkOrder } from './features/work-orders/api/workOrderAssignment';

type View = 'dashboard' | 'orders' | 'planning' | 'detail' | 'create' | 'technician' | 'technicians' | 'clients' | 'assets' | 'reports' | 'audit';
type NavItem = { id: View; label: string; icon: LucideIcon };
type CreatePreset = Partial<CreateWorkOrderFormValues>;
type LifecycleAction = 'accept' | 'start' | 'finish' | 'pause' | 'material' | 'client' | 'resume';
type ReviewAction = 'validate' | 'correction';
type EvidenceAction = 'checklist' | 'report';
type Notice = { kind: 'success' | 'error'; orderId?: string; text: string } | null;
type RunLifecycle = (action: LifecycleAction, order: WorkOrderListItem) => void;
type RunReview = (action: ReviewAction, order: WorkOrderListItem) => void;
type RunEvidence = (action: EvidenceAction, order: WorkOrderListItem) => void;
type OpenCreate = (preset?: CreatePreset) => void;
type RunAssignment = (order: WorkOrderListItem, technicianId: string, reason: string | null) => void;

type AppProps = {
  tenantId: string;
  tenantName: string;
  viewerId: string;
  viewerName: string;
  viewerRole: string;
  onLogout: () => void;
};

const mainNavigation: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'orders', label: 'Órdenes', icon: ClipboardList },
  { id: 'planning', label: 'Planificación', icon: CalendarDays },
  { id: 'technician', label: 'Técnico', icon: Wrench },
];

const secondaryNavigation: NavItem[] = [
  { id: 'technicians', label: 'Técnicos', icon: UsersRound },
  { id: 'clients', label: 'Clientes / instalaciones', icon: Building2 },
  { id: 'assets', label: 'Equipos FV', icon: Boxes },
  { id: 'reports', label: 'Informes', icon: BarChart3 },
  { id: 'audit', label: 'Auditoría', icon: ShieldCheck },
];

const statusLabels: Record<WorkOrderStatus, string> = {
  BORRADOR: 'Borrador',
  ASIGNADA: 'Asignada',
  ACEPTADA: 'Aceptada',
  EN_CURSO: 'En curso',
  BLOQUEADA: 'Bloqueada',
  FINALIZADA_TECNICO: 'Pendiente validación',
  VALIDADA: 'Validada',
  CANCELADA: 'Cancelada',
};

const priorityLabels: Record<WorkOrderPriority, string> = {
  baja: 'Baja',
  normal: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
  critica: 'Crítica',
};

const typeLabels: Record<WorkOrderType, string> = {
  averia: 'Avería',
  mantenimiento_preventivo: 'Preventivo',
  mantenimiento_correctivo: 'Correctivo',
  revision: 'Revisión',
  inspeccion: 'Inspección',
  instalacion: 'Instalación',
  sustitucion: 'Sustitución',
  medicion: 'Medición',
  urgencia: 'Urgencia',
  otro: 'Otro',
};

function isManagerRole(role: string) {
  return ['admin_cliente', 'coordinador'].includes(role);
}

function isOpenOrder(order: WorkOrderListItem) {
  return !['VALIDADA', 'CANCELADA'].includes(order.status);
}

function isAssignedTechnician(order: WorkOrderListItem, viewerId: string) {
  return Boolean(order.assignedTo && order.assignedTo === viewerId);
}

function canPrepareEvidence(order: WorkOrderListItem) {
  return !['VALIDADA', 'CANCELADA'].includes(order.status);
}

function canPrepareEvidenceByUser(order: WorkOrderListItem, viewerId: string, viewerRole: string) {
  return canPrepareEvidence(order) && (isManagerRole(viewerRole) || isAssignedTechnician(order, viewerId));
}

function displayDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    : 'Sin planificar';
}

function compactDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit' }).format(new Date(value)) : 'Sin fecha';
}

function initials(value: string | null | undefined) {
  const name = value || 'Sin asignar';
  return name === 'Sin asignar' ? '—' : name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

function roleLabel(role: string) {
  return { admin_cliente: 'Administrador', coordinador: 'Coordinador', tecnico: 'Técnico', tecnico_externo: 'Técnico externo', cliente_lectura: 'Solo lectura' }[role] ?? role;
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const group = key(item);
    map.set(group, [...(map.get(group) ?? []), item]);
  }
  return [...map.entries()].map(([name, rows]) => ({ name, rows }));
}

function latestOrder(orders: WorkOrderListItem[]) {
  return [...orders].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] ?? null;
}

function statusClass(status: WorkOrderStatus) {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function priorityClass(priority: WorkOrderPriority) {
  return priority === 'normal' ? 'priority-media' : priority === 'urgente' || priority === 'critica' ? 'priority-alta' : `priority-${priority}`;
}

function availableLifecycleActions(order: WorkOrderListItem): LifecycleAction[] {
  if (order.status === 'ASIGNADA') return ['accept', 'start'];
  if (order.status === 'ACEPTADA') return ['start'];
  if (order.status === 'EN_CURSO') return ['finish', 'pause', 'material', 'client'];
  if (order.status === 'BLOQUEADA') return ['resume'];
  return [];
}

function actionLabel(action: LifecycleAction) {
  return { accept: 'Aceptar', start: 'Iniciar', finish: 'Finalizar', pause: 'Pausar', material: 'Pend. material', client: 'Pend. cliente', resume: 'Reanudar' }[action];
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

function Sidebar({ active, open, tenantName, viewerRole, canAccessClients, navigate, close, logout }: { active: View; open: boolean; tenantName: string; viewerRole: string; canAccessClients: boolean; navigate: (view: View) => void; close: () => void; logout: () => void }) {
  const technicianMode = isTechnicianRole(viewerRole);
  const visibleMainNavigation = technicianMode ? mainNavigation.filter((item) => item.id === 'technician') : mainNavigation.filter((item) => item.id !== 'technician');
  const visibleSecondaryNavigation = canAccessTechnicianAdministration(viewerRole)
    ? secondaryNavigation.filter((item) => item.id !== 'clients' || canAccessClients)
    : [];
  const renderItem = ({ id, label, icon: Icon }: NavItem, muted = false) => (
    <button className={`nav-item ${active === id ? 'active' : ''} ${muted ? 'muted-nav' : ''}`} key={id} onClick={() => { navigate(id); close(); }} type="button">
      <Icon size={19} />
      <span>{label}</span>
    </button>
  );

  return <>
    <button className={`sidebar-backdrop ${open ? 'visible' : ''}`} onClick={close} aria-label="Cerrar menú" />
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand-row"><ProductBrand variant="navigation" /><button className="icon-button sidebar-close" onClick={close} aria-label="Cerrar menú"><X size={20} /></button></div>
      <nav className="sidebar-nav">
        <span className="nav-caption">Trabajo diario</span>
        {visibleMainNavigation.map((item) => renderItem(item))}
        {visibleSecondaryNavigation.length > 0 && <span className="nav-caption nav-caption-spaced">Control</span>}
        {visibleSecondaryNavigation.map((item) => renderItem(item, true))}
      </nav>
      <div className="sidebar-footer">
        <div className="organisation-card"><span className="avatar avatar-small">FV</span><span><strong>{tenantName}</strong><small>{roleLabel(viewerRole)}</small></span></div>
        <button className="logout-button" onClick={logout} type="button"><LogOut size={18} /> Cerrar sesión</button>
      </div>
    </aside>
  </>;
}

function Topbar({ viewerName, viewerRole, menu, create, canCreate, logout }: { viewerName: string; viewerRole: string; menu: () => void; create: () => void; canCreate: boolean; logout: () => void }) {
  return <header className="topbar">
    <button className="icon-button menu-button" onClick={menu} aria-label="Abrir menú"><Menu size={21} /></button>
    <ProductBrand className="topbar-product-brand" variant="compact" />
    <div className="topbar-actions">
      <div className="user-menu"><span className="avatar">{initials(viewerName)}</span><span><strong>{viewerName}</strong><small>{roleLabel(viewerRole)}</small></span></div>
      {canCreate && <button className="primary-button top-create" onClick={create} type="button"><Plus size={18} /> Nueva OT</button>}
      <button className="secondary-button top-logout" onClick={logout} type="button"><LogOut size={17} /> Salir</button>
    </div>
  </header>;
}

function PageNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice || notice.orderId) return null;
  return <button className={`global-notice ${notice.kind}`} onClick={onClose} type="button">{notice.kind === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />} {notice.text}<X size={16} /></button>;
}

function Metrics({ orders }: { orders: WorkOrderListItem[] }) {
  const items = [
    { value: orders.filter(isOpenOrder).length, label: 'OT abiertas', icon: ClipboardList, tone: 'red' },
    { value: orders.filter((order) => order.status === 'VALIDADA').length, label: 'OT validadas', icon: CheckCircle2, tone: 'green' },
    { value: orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length, label: 'Pendientes validar', icon: Clock3, tone: 'orange' },
    { value: orders.filter((order) => order.status === 'BLOQUEADA').length, label: 'OT bloqueadas', icon: AlertTriangle, tone: 'purple' },
  ] as const;
  return <section className="metrics-grid">{items.map(({ value, label, icon: Icon, tone }) => <article className="metric-card" key={label}><span className={`metric-icon tone-${tone}`}><Icon size={23} /></span><div className="metric-content"><strong>{value}</strong><span>{label}</span><small>Datos reales</small></div></article>)}</section>;
}

function NoticeLine({ notice, orderId }: { notice: Notice; orderId: string }) {
  if (!notice || notice.orderId !== orderId) return null;
  return <p className={notice.kind === 'error' ? 'form-global-error' : 'read-only-note'}>{notice.kind === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />} {notice.text}</p>;
}

function OrderList({ orders, open, empty, limit }: { orders: WorkOrderListItem[]; open: (id: string) => void; empty: string; limit?: number }) {
  const visible = limit ? orders.slice(0, limit) : orders;
  if (visible.length === 0) return <p className="empty-state">{empty}</p>;
  return <div className="day-plan-list">
    {visible.map((order) => <button key={order.id} onClick={() => open(order.id)} type="button">
      <Wrench size={18} />
      <span><strong>{order.code} · {order.title}</strong><small>{order.siteName}{order.locationName ? ` · ${order.locationName}` : ''}{order.assetName ? ` · ${order.assetName}` : ''}</small></span>
      <span className={statusClass(order.status)}>{statusLabels[order.status]}</span>
    </button>)}
  </div>;
}

function LifecycleActions({ order, viewerId, busy, compact = false, run }: { order: WorkOrderListItem; viewerId: string; busy: boolean; compact?: boolean; run: RunLifecycle }) {
  const assigned = isAssignedTechnician(order, viewerId);
  const actions = assigned ? (compact ? availableLifecycleActions(order).slice(0, 2) : availableLifecycleActions(order)) : [];
  if (actions.length === 0) return compact ? null : <p className="read-only-note"><LockKeyhole size={16} /> Solo el técnico asignado puede aceptar, iniciar, pausar, reanudar o finalizar esta OT.</p>;
  return <div className="form-actions work-order-form-actions">
    {actions.map((action) => <button className={['start', 'finish', 'resume'].includes(action) ? 'primary-button' : 'secondary-button'} disabled={busy} key={action} onClick={(event) => { event.stopPropagation(); run(action, order); }} type="button">
      {busy ? <LoaderCircle className="spin" size={17} /> : <Wrench size={17} />} {actionLabel(action)}
    </button>)}
  </div>;
}

function ReviewActions({ order, canReview, busy, run }: { order: WorkOrderListItem; canReview: boolean; busy: boolean; run: RunReview }) {
  if (!canReview) return null;
  if (order.status !== 'FINALIZADA_TECNICO') return <p className="read-only-note"><ShieldCheck size={16} /> La revisión aparece cuando el técnico finaliza la intervención.</p>;
  return <div className="form-actions work-order-form-actions"><button className="primary-button" disabled={busy} onClick={() => run('validate', order)} type="button"><ShieldCheck size={17} /> Validar OT</button><button className="secondary-button" disabled={busy} onClick={() => run('correction', order)} type="button"><AlertTriangle size={17} /> Solicitar corrección</button></div>;
}

function EvidenceActions({ order, canUse, busy, run }: { order: WorkOrderListItem; canUse: boolean; busy: boolean; run: RunEvidence }) {
  if (!canUse) return <p className="read-only-note"><LockKeyhole size={16} /> No tienes permisos para preparar evidencias de esta OT.</p>;
  if (!canPrepareEvidence(order)) return <p className="read-only-note"><LockKeyhole size={16} /> OT cerrada: las evidencias quedan bloqueadas para mantener trazabilidad.</p>;
  return <div className="form-actions work-order-form-actions"><button className="secondary-button" disabled={busy} onClick={() => run('checklist', order)} type="button"><ListChecks size={17} /> Preparar checklist</button><button className="primary-button" disabled={busy} onClick={() => run('report', order)} type="button"><FileCheck2 size={17} /> Registrar informe</button></div>;
}

function CancelAction({ order, canCancel, busy, run }: { order: WorkOrderListItem; canCancel: boolean; busy: boolean; run: (order: WorkOrderListItem) => void }) {
  if (!canCancel) return <p className="read-only-note"><LockKeyhole size={16} /> Solo un responsable puede anular OT abiertas.</p>;
  return <button className="secondary-button" disabled={busy || !canCancelWorkOrder(order.status)} onClick={() => run(order)} type="button"><X size={17} /> Anular OT</button>;
}

function Dashboard({ orders, viewerName, openOrders, openDetail }: { orders: WorkOrderListItem[]; viewerName: string; openOrders: () => void; openDetail: (id: string) => void }) {
  const counts = useMemo(() => {
    const result = new Map<WorkOrderStatus, number>();
    for (const order of orders) result.set(order.status, (result.get(order.status) ?? 0) + 1);
    return result;
  }, [orders]);
  const technicians = useMemo(() => groupBy(orders, (order) => order.assignedToName ?? 'Sin asignar').sort((a, b) => b.rows.length - a.rows.length).slice(0, 4), [orders]);
  const planned = orders.filter((order) => order.plannedAt).slice(0, 4);
  return <>
    <div className="page-heading"><span className="section-kicker">Panel central</span><h1>Hola, {viewerName.split(' ')[0]} 👋</h1><p>Resumen limpio de las órdenes reales visibles.</p></div>
    <Metrics orders={orders} />
    <section className="dashboard-grid dashboard-grid-top">
      <article className="panel orders-status-panel"><div className="panel-heading"><h2>Estados clave</h2><span className="source-badge">Real</span></div><ul className="legend-list">{(['ASIGNADA', 'EN_CURSO', 'FINALIZADA_TECNICO', 'BLOQUEADA', 'VALIDADA'] as const).map((status) => <li key={status}><i className="legend-red" /><span>{statusLabels[status]}</span><strong>{counts.get(status) ?? 0}</strong></li>)}</ul><button className="text-link panel-link" onClick={openOrders} type="button">Ver OT <ChevronRight size={15} /></button></article>
      <article className="panel recent-orders-panel"><div className="panel-heading"><h2>OT recientes</h2><span className="source-badge">Datos reales</span></div><OrderList orders={orders} open={openDetail} empty="No hay órdenes visibles." limit={5} /></article>
      <article className="panel workload-panel"><div className="panel-heading"><h2>Carga por técnico</h2></div><div className="workload-list">{technicians.map(({ name, rows }) => <div className="workload-row" key={name}><span className="avatar avatar-mini">{initials(name)}</span><strong>{name}</strong><b>{rows.length} OT</b><small>{rows.filter((order) => order.status === 'EN_CURSO').length} en curso · {rows.filter((order) => order.status === 'BLOQUEADA').length} bloqueadas</small></div>)}</div></article>
    </section>
    <section className="panel calendar-panel"><div className="panel-heading"><h2>Próximas OT</h2></div><OrderList orders={planned} open={openDetail} empty="No hay fechas previstas." /></section>
  </>;
}

function OrdersPage({ orders, open, create, canCreate, viewerRole, busyOrderId, cancelOrder }: { orders: WorkOrderListItem[]; open: (id: string) => void; create: () => void; canCreate: boolean; viewerRole: string; busyOrderId: string | null; cancelOrder: (order: WorkOrderListItem) => void }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? orders.filter((order) => [order.code, order.title, order.siteName, order.locationName, order.assignedToName, order.assetName, order.assetReference].some((value) => value?.toLowerCase().includes(term))) : orders;
  }, [orders, search]);
  return <><div className="page-heading page-heading-row"><div><span className="section-kicker">Gestión diaria</span><h1>Órdenes de trabajo</h1><p>{filtered.length} órdenes visibles.</p></div>{canCreate && <button className="primary-button" onClick={create} type="button"><Plus size={18} /> Nueva OT</button>}</div><section className="panel table-panel"><div className="filters-row"><label className="table-search"><ClipboardList size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por OT, cliente, equipo, técnico o ubicación" value={search} /></label><span className="source-badge">Datos reales</span></div><div className="orders-table"><div className="orders-table-row orders-table-head"><span>ID</span><span>Trabajo</span><span>Instalación / equipo</span><span>Técnico</span><span>Estado</span><span>Prioridad</span><span>Fecha</span><span>Acciones</span></div>{filtered.length === 0 ? <p className="empty-table">No hay órdenes que coincidan.</p> : filtered.map((order) => <div className="orders-table-row" key={order.id}><strong>{order.code}</strong><span>{order.title}</span><span>{order.siteName}{order.assetName ? ` · ${order.assetName}` : ''}</span><span>{order.assignedToName ?? 'Sin asignar'}</span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i></span><span><i className={`priority-badge ${priorityClass(order.priority)}`}>{priorityLabels[order.priority]}</i></span><span>{compactDate(order.plannedAt)}</span><span className="form-actions"><button className="text-link" onClick={() => open(order.id)} type="button">Abrir</button>{isManagerRole(viewerRole) && canCancelWorkOrder(order.status) && <button className="text-link" disabled={busyOrderId === order.id} onClick={() => cancelOrder(order)} type="button">Anular</button>}</span></div>)}</div></section></>;
}

function Detail({ order, catalog, auditEvents, back, create, canCreate, viewerId, viewerRole, busyOrderId, notice, runAction, runAssignment, runReview, runEvidence, runCancel }: { order: WorkOrderListItem | null; catalog?: WorkOrderCreationCatalog | null; auditEvents: WorkOrderAuditEvent[]; back: () => void; create: OpenCreate; canCreate: boolean; viewerId: string; viewerRole: string; busyOrderId: string | null; notice: Notice; runAction: RunLifecycle; runAssignment: RunAssignment; runReview: RunReview; runEvidence: RunEvidence; runCancel: (order: WorkOrderListItem) => void }) {
  if (!order) return <section className="panel data-state"><AlertTriangle size={28} /><strong>Orden no disponible</strong><button className="secondary-button" onClick={back} type="button">Volver</button></section>;
  if (isTechnicianRole(viewerRole)) return <TechnicianDetail order={order} catalog={catalog} auditEvents={auditEvents} back={back} create={create} canCreate={canCreate} viewerId={viewerId} viewerRole={viewerRole} busyOrderId={busyOrderId} notice={notice} runAction={runAction} runAssignment={runAssignment} runReview={runReview} runCancel={runCancel} />;
  const evidenceAllowed = canPrepareEvidenceByUser(order, viewerId, viewerRole);
  return <PremiumWorkOrderDetail
    order={order}
    auditEvents={auditEvents}
    back={back}
    onNewRelated={() => create({ installationId: order.siteId, locationId: order.locationId ?? '', assetId: order.assetId ?? '', technicianId: order.assignedTo ?? '', title: `Seguimiento de ${order.title}`, description: `Nueva actuación relacionada con ${order.code}.`, type: order.type, priority: order.priority })}
    statusLabel={statusLabels[order.status]}
    priorityLabel={priorityLabels[order.priority]}
    typeLabel={typeLabels[order.type]}
    displayDate={displayDate}
    statusClass={statusClass}
    priorityClass={priorityClass}
    operationalPanels={{
      assignment: canCreate ? <WorkOrderAssignmentPanel order={order} technicians={catalog?.technicians ?? []} busy={busyOrderId === order.id} onAssign={(technicianId, reason) => runAssignment(order, technicianId, reason)} /> : undefined,
      technical: <article className="panel source-panel"><div className="panel-heading"><h2><Wrench size={21} /> Acciones técnicas</h2><span className="source-badge">Solo técnico asignado</span></div><LifecycleActions order={order} viewerId={viewerId} busy={busyOrderId === order.id} run={runAction} /><NoticeLine notice={notice} orderId={order.id} /></article>,
      evidence: <article className="panel source-panel"><div className="panel-heading"><h2><ListChecks size={21} /> Evidencias y documentación</h2><span className="source-badge">Checklist / informe</span></div><EvidenceActions order={order} canUse={evidenceAllowed} busy={busyOrderId === order.id} run={runEvidence} /><NoticeLine notice={notice} orderId={order.id} /></article>,
      review: <article className="panel source-panel"><div className="panel-heading"><h2><ShieldCheck size={21} /> Revisión administrativa</h2><span className="source-badge">Validación</span></div><ReviewActions order={order} canReview={isManagerRole(viewerRole)} busy={busyOrderId === order.id} run={runReview} /></article>,
      cancel: <article className="panel source-panel"><div className="panel-heading"><h2><AlertTriangle size={21} /> Zona responsable</h2><span className="source-badge">Anulación segura</span></div><CancelAction order={order} canCancel={isManagerRole(viewerRole) && canCancelWorkOrder(order.status)} busy={busyOrderId === order.id} run={runCancel} /></article>,
    }}
  />;
}

function TechnicianDetail({ order, catalog, auditEvents, back, create, canCreate, viewerId, viewerRole, busyOrderId, notice, runAction, runAssignment, runReview, runCancel }: { order: WorkOrderListItem; catalog?: WorkOrderCreationCatalog | null; auditEvents: WorkOrderAuditEvent[]; back: () => void; create: OpenCreate; canCreate: boolean; viewerId: string; viewerRole: string; busyOrderId: string | null; notice: Notice; runAction: RunLifecycle; runAssignment: RunAssignment; runReview: RunReview; runCancel: (order: WorkOrderListItem) => void }) {
  const required = Object.entries(order.requirements).filter(([, value]) => value).map(([key]) => key.replaceAll(/([A-Z])/g, ' $1').toLowerCase());
  const nextAction = order.status === 'BORRADOR' ? 'Asignar un técnico' : order.status === 'ASIGNADA' ? 'El técnico debe aceptar' : order.status === 'ACEPTADA' ? 'Iniciar intervención' : order.status === 'EN_CURSO' ? 'Completar ejecución' : order.status === 'BLOQUEADA' ? 'Resolver bloqueo' : order.status === 'FINALIZADA_TECNICO' ? 'Validación administrativa' : 'Sin acciones pendientes';
  const orderAudit = auditEvents.filter((event) => event.entityId === order.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 8);
  return <>
    <div className="detail-header"><button className="back-button" onClick={back} type="button"><ArrowLeft size={18} /> Volver</button><div><span className="section-kicker">Orden real</span><h1>{order.code}</h1><p>{order.title}</p></div><span className={statusClass(order.status)}>{statusLabels[order.status]}</span>{canCreate && <button className="filter-button detail-actions" onClick={() => create({ installationId: order.siteId, locationId: order.locationId ?? '', assetId: order.assetId ?? '', technicianId: order.assignedTo ?? '', title: `Seguimiento de ${order.title}`, description: `Nueva actuación relacionada con ${order.code}.`, type: order.type, priority: order.priority })} type="button">Nueva relacionada <Plus size={15} /></button>}</div>
    <section className="detail-grid"><article className="panel detail-main-card"><div className="panel-heading"><h2>Información del trabajo</h2><span className={`priority-badge ${priorityClass(order.priority)}`}>{priorityLabels[order.priority]}</span></div><dl className="detail-definition-grid"><div><dt>Cliente</dt><dd>{order.clientName ?? 'Sin cliente'}</dd></div><div><dt>Instalación</dt><dd>{order.siteName}</dd></div><div><dt>Ubicación</dt><dd>{order.locationName ?? 'Sin ubicación'}</dd></div><div><dt>Equipo</dt><dd>{order.assetName ?? 'Sin equipo vinculado'}</dd></div><div><dt>Tipo</dt><dd>{typeLabels[order.type]}</dd></div><div><dt>Técnico</dt><dd>{order.assignedToName ?? 'Sin asignar'}</dd></div><div><dt>Planificada</dt><dd>{displayDate(order.plannedAt)}</dd></div><div><dt>Fecha límite</dt><dd>{displayDate(order.dueAt)}</dd></div><div><dt>Siguiente acción</dt><dd>{nextAction}</dd></div></dl><div className="description-box"><strong>Descripción</strong><p>{order.description || 'Sin descripción registrada.'}</p><strong>Instrucciones</strong><p>{order.instructions || 'Sin instrucciones adicionales.'}</p><strong>Riesgos y precauciones</strong><p>{order.safetyNotes || 'Sin riesgos registrados.'}</p><strong>Resultado esperado</strong><p>{order.expectedResult || 'Sin resultado esperado registrado.'}</p></div><div className="evidence-grid"><div><ListChecks size={22} /><strong>{order.requirements.checklist ? 'Checklist requerido' : 'Sin checklist'}</strong><small>{required.length ? required.join(' · ') : 'Sin requisitos especiales'}</small></div><div><FileCheck2 size={22} /><strong>{order.requirements.report ? 'Informe requerido' : 'Informe opcional'}</strong><small>Registro documental</small></div><div><Clock3 size={22} /><strong>{order.dueAt ? displayDate(order.dueAt) : 'Sin fecha límite'}</strong><small>Vencimiento</small></div></div></article><aside className="panel detail-side-card"><h2>Estado actual</h2><div className="timeline"><div className="done"><i /><span><strong>OT creada</strong><small>{displayDate(order.createdAt)}</small></span></div><div className={order.assignedTo ? 'done' : 'current'}><i /><span><strong>{order.assignedTo ? 'Técnico asignado' : 'Pendiente de asignación'}</strong><small>{order.assignedToName ?? 'Sin técnico'}</small></span></div><div className="current"><i /><span><strong>{statusLabels[order.status]}</strong><small>Actualizada {displayDate(order.updatedAt)}</small></span></div></div></aside></section>
    {canCreate && <WorkOrderAssignmentPanel order={order} technicians={catalog?.technicians ?? []} busy={busyOrderId === order.id} onAssign={(technicianId, reason) => runAssignment(order, technicianId, reason)} />}
    <article className="panel source-panel"><div className="panel-heading"><h2><Clock3 size={21} /> Historial de cambios</h2><span className="source-badge">{orderAudit.length}</span></div>{orderAudit.length === 0 ? <p className="empty-state">No hay eventos visibles para esta OT.</p> : <div className="client-order-list">{orderAudit.map((event) => <div key={event.id}><span><strong>{humanAuditAction(event.action)}</strong><small>{workOrderAuditDetail(event)} · {event.actorName ?? 'Sistema'}</small></span><b>{displayDate(event.createdAt)}</b></div>)}</div>}</article>
    <article className="panel source-panel"><div className="panel-heading"><h2><Wrench size={21} /> Acciones técnicas</h2><span className="source-badge">Solo técnico asignado</span></div><LifecycleActions order={order} viewerId={viewerId} busy={busyOrderId === order.id} run={runAction} /><NoticeLine notice={notice} orderId={order.id} /></article>
    <WorkOrderChecklistPanel workOrderId={order.id} canEdit={order.status === 'EN_CURSO' && isAssignedTechnician(order, viewerId)} />
    <WorkOrderPhotosPanel tenantId={order.tenantId} workOrderId={order.id} canEdit={order.status === 'EN_CURSO' && isAssignedTechnician(order, viewerId)} />
    <article className="panel source-panel"><div className="panel-heading"><h2><FileCheck2 size={21} /> Firma e informe</h2><span className="source-badge">Versión actual</span></div><p className="read-only-note"><LockKeyhole size={16} /> No disponible en esta versión de la ejecución técnica. No bloquea esta demo cuando la configuración real no lo exige.</p></article>
    <article className="panel source-panel"><div className="panel-heading"><h2><ShieldCheck size={21} /> Revisión administrativa</h2><span className="source-badge">Validación</span></div><ReviewActions order={order} canReview={isManagerRole(viewerRole)} busy={busyOrderId === order.id} run={runReview} /></article>
    <article className="panel source-panel"><div className="panel-heading"><h2><AlertTriangle size={21} /> Zona responsable</h2><span className="source-badge">Anulación segura</span></div><CancelAction order={order} canCancel={isManagerRole(viewerRole) && canCancelWorkOrder(order.status)} busy={busyOrderId === order.id} run={runCancel} /></article>
  </>;
}

function Planning({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const planned = [...orders].filter((order) => order.plannedAt).sort((a, b) => String(a.plannedAt).localeCompare(String(b.plannedAt)));
  const overdue = planned.filter((order) => new Date(order.plannedAt || '').getTime() < Date.now() && isOpenOrder(order));
  return <><div className="page-heading"><span className="section-kicker">Organización</span><h1>Planificación real</h1><p>Agenda limpia de OT con fecha prevista.</p></div><Metrics orders={orders} /><section className="dashboard-grid dashboard-grid-bottom"><article className="panel planning-list-panel"><div className="panel-heading"><h2>Agenda de OT</h2><span className="source-badge">{planned.length}</span></div><OrderList orders={planned} open={open} empty="No hay OT planificadas." /></article><article className="panel alert-panel"><div className="panel-heading"><h2>Vencidas / riesgo</h2></div><OrderList orders={overdue} open={open} empty="Sin OT vencidas visibles." limit={6} /></article></section></>;
}

function ModuleMetrics({ orders, catalog }: { orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null }) {
  return <section className="metrics-grid"><article className="metric-card"><span className="metric-icon tone-red"><ClipboardList size={22} /></span><div className="metric-content"><strong>{orders.length}</strong><span>OT visibles</span><small>Según permisos</small></div></article><article className="metric-card"><span className="metric-icon tone-green"><Building2 size={22} /></span><div className="metric-content"><strong>{catalog?.installations.length ?? uniqueCount(orders.map((order) => order.siteName))}</strong><span>Instalaciones</span><small>Activas</small></div></article><article className="metric-card"><span className="metric-icon tone-orange"><Boxes size={22} /></span><div className="metric-content"><strong>{catalog?.assets.length ?? uniqueCount(orders.map((order) => order.assetName || order.assetType))}</strong><span>Equipos</span><small>Inventario</small></div></article><article className="metric-card"><span className="metric-icon tone-purple"><AlertTriangle size={22} /></span><div className="metric-content"><strong>{orders.filter((order) => order.status === 'BLOQUEADA').length}</strong><span>Bloqueos</span><small>Revisar</small></div></article></section>;
}

function AssetsPage({ orders, catalog, open, create, canCreate }: { orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null; open: (id: string) => void; create: OpenCreate; canCreate: boolean }) {
  const catalogAssets = catalog?.assets.map((asset) => ({ asset, rows: orders.filter((order) => order.assetId === asset.id) }));
  const groupedAssets = groupBy(orders, (order) => order.assetName || order.assetType || `Sin equipo · ${typeLabels[order.type]}`).map((group) => ({ asset: null as WorkOrderCreationCatalog['assets'][number] | null, rows: group.rows, name: group.name }));
  const assets = catalogAssets ? catalogAssets.map(({ asset, rows }) => ({ asset, rows, name: asset.name })) : groupedAssets;
  return <><ModuleMetrics orders={orders} catalog={catalog} /><section className="panel planning-list-panel"><div className="panel-heading"><h2>Equipos FV</h2><span className="source-badge">{assets.length}</span></div><div className="day-plan-list">{assets.map(({ asset, name, rows }) => { const latest = latestOrder(rows); return <button key={asset?.id ?? name} onClick={() => latest ? open(latest.id) : asset && canCreate && create(makeAssetPreset(asset))} type="button"><Boxes size={18} /><span><strong>{name}</strong><small>{rows.length} OT · {rows.filter(isOpenOrder).length} abiertas</small></span><ChevronRight size={17} /></button>; })}</div></section></>;
}

function ReportsPage({ orders, open, busyOrderId, viewerId, viewerRole, runEvidence }: { orders: WorkOrderListItem[]; open: (id: string) => void; busyOrderId: string | null; viewerId: string; viewerRole: string; runEvidence: RunEvidence }) {
  const reportOrders = orders.filter((order) => order.requirements.report || ['FINALIZADA_TECNICO', 'VALIDADA'].includes(order.status));
  return <><Metrics orders={orders} /><section className="panel planning-list-panel"><div className="panel-heading"><h2>Informes requeridos</h2><span className="source-badge">{reportOrders.length}</span></div><div className="day-plan-list">{reportOrders.length === 0 ? <p className="empty-state">Sin informes requeridos.</p> : reportOrders.map((order) => <div className="orders-table-row" key={order.id}><span><strong>{order.code} · {order.title}</strong><small>{order.siteName}</small></span><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><span className="form-actions"><button className="text-link" onClick={() => open(order.id)} type="button">Abrir</button><button className="text-link" disabled={busyOrderId === order.id || !canPrepareEvidenceByUser(order, viewerId, viewerRole)} onClick={() => runEvidence('report', order)} type="button">Registrar</button></span></div>)}</div></section></>;
}

function AuditPage({ events, loading, error }: { events: WorkOrderAuditEvent[]; loading: boolean; error: string | null }) {
  if (loading) return <section className="panel data-state"><LoaderCircle className="spin" size={28} /><strong>Cargando auditoría…</strong></section>;
  if (error) return <section className="panel data-state error-state"><AlertTriangle size={28} /><strong>No se pudo cargar la auditoría</strong><p>{error}</p></section>;
  const chronologicalEvents = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return <section className="panel planning-list-panel"><div className="panel-heading"><h2>Auditoría de OT</h2><span className="source-badge">{events.length}</span></div><div className="day-plan-list">{events.length === 0 ? <p className="empty-state">Sin eventos todavía.</p> : chronologicalEvents.slice(0, 40).map((event) => <div className="orders-table-row" key={event.id}><span><strong>{humanAuditAction(event.action)}</strong><small>{workOrderAuditDetail(event)}</small></span><span>{event.actorName ?? 'Sistema'}</span><small>{displayDate(event.createdAt)}</small></div>)}</div></section>;
}

function ModulePage({ view, orders, catalog, auditEvents, auditLoading, auditError, busyOrderId, openDetail, create, canCreate, viewerId, viewerRole, runEvidence }: { view: Exclude<View, 'clients' | 'technicians'>; orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null; auditEvents: WorkOrderAuditEvent[]; auditLoading: boolean; auditError: string | null; busyOrderId: string | null; openDetail: (id: string) => void; create: OpenCreate; canCreate: boolean; viewerId: string; viewerRole: string; runEvidence: RunEvidence }) {
  if (view === 'assets') return <AssetsPage orders={orders} catalog={catalog} open={openDetail} create={create} canCreate={canCreate} />;
  if (view === 'reports') return <ReportsPage orders={orders} open={openDetail} busyOrderId={busyOrderId} viewerId={viewerId} viewerRole={viewerRole} runEvidence={runEvidence} />;
  return <AuditPage events={auditEvents} loading={auditLoading} error={auditError} />;
}

function MobileNav({ active, viewerRole, navigate }: { active: View; viewerRole: string; navigate: (view: View) => void }) {
  const items = isTechnicianRole(viewerRole) ? mainNavigation.filter((item) => item.id === 'technician') : mainNavigation.filter((item) => item.id !== 'technician');
  return <nav className="mobile-nav">{items.map(({ id, label, icon: Icon }) => <button className={active === id ? 'active' : ''} key={id} onClick={() => navigate(id)} type="button"><Icon size={18} /><span>{label}</span></button>)}</nav>;
}

export default function App({ tenantId, tenantName, viewerId, viewerName, viewerRole, onLogout }: AppProps) {
  const queryClient = useQueryClient();
  const technicianActionGuard = useRef(createTechnicianActionGuard());
  const [view, setView] = useState<View>(() => isTechnicianRole(viewerRole) ? 'technician' : 'dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [createPreset, setCreatePreset] = useState<CreatePreset | undefined>();
  const [notice, setNotice] = useState<Notice>(null);
  const canManage = isManagerRole(viewerRole);
  const canAccessClients = canAccessClientNavigation(viewerRole);
  const canManageClients = canManageClientRecords(viewerRole);
  const canAccessTechnicians = canAccessTechnicianAdministration(viewerRole);
  const canManageTechnicians = canManageTechnicianInvitations(viewerRole);

  const query = useQuery({
    queryKey: ['work-orders', tenantId],
    queryFn: () => listAccessibleWorkOrders(getSupabaseClient(), tenantId, 150),
    enabled: Boolean(tenantId),
  });
  const catalogQuery = useQuery({
    queryKey: ['work-order-creation-catalog', tenantId],
    queryFn: () => loadWorkOrderCreationCatalog(getSupabaseClient(), tenantId),
    enabled: Boolean(tenantId && canManage),
    staleTime: 60_000,
  });
  const auditQuery = useQuery({
    queryKey: ['work-order-audit', tenantId],
    queryFn: () => listWorkOrderAuditEvents(getSupabaseClient(), tenantId, 80),
    enabled: Boolean(tenantId && canManage),
    staleTime: 30_000,
  });

  const invalidateWorkOrderData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['work-orders', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-audit', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['technicians', tenantId] }),
    ]);
  };

  const lifecycleMutation = useMutation({
    mutationFn: async ({ action, order, reason, workDone }: { action: LifecycleAction; order: WorkOrderListItem; reason?: string; workDone?: string }) => {
      const supabase = getSupabaseClient();
      if (action === 'accept') return acceptWorkOrder(supabase, order.id);
      if (action === 'start') return startWorkOrderVisit(supabase, order.id);
      if (action === 'resume') return resumeWorkOrder(supabase, order.id);
      if (action === 'pause') return blockWorkOrder(supabase, { workOrderId: order.id, reason: reason ?? '' });
      if (action === 'material') return blockWorkOrder(supabase, { workOrderId: order.id, reason: reason ?? '' });
      if (action === 'client') return blockWorkOrder(supabase, { workOrderId: order.id, reason: reason ?? '' });
      return finalizeActiveWorkOrderVisit(supabase, { workOrderId: order.id, workDone: workDone ?? '', result: 'trabajo_completado' });
    },
    onSuccess: async (_, variables) => { await invalidateWorkOrderData(); setNotice({ kind: 'success', orderId: variables.order.id, text: `${actionLabel(variables.action)} realizado correctamente.` }); },
    onError: (error, variables) => setNotice({ kind: 'error', orderId: variables.order.id, text: friendlyTechnicianError(error, 'No se pudo completar la acción. Comprueba la conexión y vuelve a intentarlo.') }),
    onSettled: () => technicianActionGuard.current.release(),
  });

  const assignmentMutation = useMutation({
    mutationFn: ({ order, technicianId, reason }: { order: WorkOrderListItem; technicianId: string; reason: string | null }) => assignWorkOrder(getSupabaseClient(), { workOrderId: order.id, technicianId, plannedAt: order.plannedAt, reason }),
    onSuccess: async (assigned, variables) => {
      await invalidateWorkOrderData();
      const technicianName = catalogQuery.data?.technicians.find((technician) => technician.id === variables.technicianId)?.name ?? 'el técnico seleccionado';
      setNotice({ kind: 'success', orderId: variables.order.id, text: `${assigned.code} asignada y enviada a ${technicianName}.` });
    },
    onError: (error, variables) => setNotice({ kind: 'error', orderId: variables.order.id, text: variables.order.status === 'BORRADOR' ? `OT creada, asignación pendiente. ${friendlyTechnicianError(error, 'Puedes reintentar sin crear otra OT.')}` : friendlyTechnicianError(error, 'No se pudo actualizar la asignación.') }),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ action, order, notes }: { action: ReviewAction; order: WorkOrderListItem; notes: string }) => {
      const decision: WorkOrderReviewDecision = action === 'validate' ? 'validada' : 'correccion_solicitada';
      return reviewWorkOrder(getSupabaseClient(), { workOrderId: order.id, decision, notes });
    },
    onSuccess: async (_, variables) => { await invalidateWorkOrderData(); setNotice({ kind: 'success', orderId: variables.order.id, text: variables.action === 'validate' ? 'OT validada correctamente.' : 'Corrección solicitada al técnico.' }); },
    onError: (error, variables) => setNotice({ kind: 'error', orderId: variables.order.id, text: error instanceof Error ? error.message : 'No se pudo completar la revisión.' }),
  });

  const evidenceMutation = useMutation({
    mutationFn: async ({ action, order, filename }: { action: EvidenceAction; order: WorkOrderListItem; filename?: string | null }) => action === 'checklist' ? ensureWorkOrderDefaultChecklist(getSupabaseClient(), order.id) : registerWorkOrderReport(getSupabaseClient(), { workOrderId: order.id, filename }),
    onSuccess: async (_, variables) => { await invalidateWorkOrderData(); setNotice({ kind: 'success', orderId: variables.order.id, text: variables.action === 'checklist' ? 'Checklist preparado correctamente.' : 'Informe registrado correctamente.' }); },
    onError: (error, variables) => setNotice({ kind: 'error', orderId: variables.order.id, text: error instanceof Error ? error.message : 'No se pudo preparar la evidencia.' }),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ order, reason }: { order: WorkOrderListItem; reason: string }) => cancelWorkOrder(getSupabaseClient(), { workOrderId: order.id, reason }),
    onSuccess: async (_, variables) => { await invalidateWorkOrderData(); setNotice({ kind: 'success', orderId: variables.order.id, text: 'OT anulada correctamente.' }); setView('orders'); },
    onError: (error, variables) => setNotice({ kind: 'error', orderId: variables.order.id, text: error instanceof Error ? error.message : 'No se pudo anular la OT.' }),
  });

  const orders = query.data ?? [];
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const busyOrderId = lifecycleMutation.variables?.order.id ?? assignmentMutation.variables?.order.id ?? reviewMutation.variables?.order.id ?? evidenceMutation.variables?.order.id ?? cancelMutation.variables?.order.id ?? null;
  const openDetail = (id: string) => { setSelectedOrderId(id); setView('detail'); };
  const openCreate: OpenCreate = (preset) => { if (!canManage) return; setCreatePreset(preset); setView('create'); };
  const finishCreate = async (workOrderId: string, code: string, technicianName: string | null) => { await invalidateWorkOrderData(); setCreatePreset(undefined); setSelectedOrderId(workOrderId); setNotice({ kind: 'success', orderId: workOrderId, text: technicianName ? `${code} asignada y enviada a ${technicianName}.` : `${code} guardada como borrador.` }); setView('detail'); };

  const runLifecycleAction: RunLifecycle = (action, order) => {
    if (lifecycleMutation.isPending) return;
    if (!isAssignedTechnician(order, viewerId)) { setNotice({ kind: 'error', orderId: order.id, text: 'Solo el técnico asignado puede iniciar o ejecutar esta OT desde su cuenta.' }); return; }
    if (action === 'pause' || action === 'material' || action === 'client') {
      const reason = window.prompt('Indica el motivo para dejar la OT bloqueada o pendiente:');
      if (!reason?.trim()) return;
      if (!technicianActionGuard.current.acquire()) return;
      lifecycleMutation.mutate({ action, order, reason });
      return;
    }
    if (action === 'finish') {
      const workDone = window.prompt('Resume el trabajo realizado para finalizar la intervención:');
      if (!workDone?.trim()) return;
      if (!technicianActionGuard.current.acquire()) return;
      lifecycleMutation.mutate({ action, order, workDone });
      return;
    }
    if (!technicianActionGuard.current.acquire()) return;
    lifecycleMutation.mutate({ action, order });
  };

  const runAssignment: RunAssignment = (order, technicianId, reason) => {
    if (!canManage || assignmentMutation.isPending) return;
    assignmentMutation.mutate({ order, technicianId, reason });
  };

  const runReviewAction: RunReview = (action, order) => {
    if (!canManage) { setNotice({ kind: 'error', orderId: order.id, text: 'Solo un responsable puede revisar la OT.' }); return; }
    if (order.status !== 'FINALIZADA_TECNICO') { setNotice({ kind: 'error', orderId: order.id, text: 'La OT debe estar finalizada por el técnico para revisarla.' }); return; }
    const notes = window.prompt(action === 'validate' ? 'Nota de validación administrativa:' : 'Indica qué debe corregir el técnico:', action === 'validate' ? 'OT validada desde revisión administrativa.' : '');
    if (!notes?.trim()) return;
    reviewMutation.mutate({ action, order, notes });
  };

  const runEvidenceAction: RunEvidence = (action, order) => {
    if (!canPrepareEvidenceByUser(order, viewerId, viewerRole)) { setNotice({ kind: 'error', orderId: order.id, text: 'No puedes preparar evidencias en esta OT.' }); return; }
    if (action === 'checklist') { evidenceMutation.mutate({ action, order }); return; }
    const filename = window.prompt('Nombre del informe a registrar:', `${order.code}-informe.html`);
    if (!filename?.trim()) return;
    evidenceMutation.mutate({ action, order, filename });
  };

  const runCancelAction = (order: WorkOrderListItem) => {
    if (!canManage) { setNotice({ kind: 'error', orderId: order.id, text: 'Solo un responsable puede anular OT.' }); return; }
    if (!canCancelWorkOrder(order.status)) { setNotice({ kind: 'error', orderId: order.id, text: 'Esta OT ya no se puede anular desde el flujo seguro.' }); return; }
    const reason = window.prompt(`Motivo de anulación de ${order.code}:`);
    if (!reason?.trim()) return;
    cancelMutation.mutate({ order, reason });
  };

  let content;
  if (query.isLoading) content = <section className="panel data-state"><LoaderCircle className="spin" size={28} /><strong>Cargando órdenes reales…</strong></section>;
  else if (query.error) content = <section className="panel data-state error-state"><AlertTriangle size={28} /><strong>No se pudieron cargar las OT</strong><p>{query.error instanceof Error ? query.error.message : 'Error desconocido'}</p><button className="secondary-button" onClick={() => void query.refetch()} type="button"><RefreshCw size={17} /> Reintentar</button></section>;
  else if (view === 'orders') content = <OrdersPage orders={orders} create={() => openCreate()} canCreate={canManage} open={openDetail} viewerRole={viewerRole} busyOrderId={busyOrderId} cancelOrder={runCancelAction} />;
  else if (view === 'detail') content = <Detail order={selectedOrder} catalog={catalogQuery.data} auditEvents={auditQuery.data ?? []} back={() => setView(isTechnicianRole(viewerRole) ? 'technician' : 'orders')} create={openCreate} canCreate={canManage} viewerId={viewerId} viewerRole={viewerRole} busyOrderId={busyOrderId} notice={notice} runAction={runLifecycleAction} runAssignment={runAssignment} runReview={runReviewAction} runEvidence={runEvidenceAction} runCancel={runCancelAction} />;
  else if (view === 'create') content = <CreateWorkOrderForm tenantId={tenantId} canManage={canManage} initialValues={createPreset} onCancel={() => { setCreatePreset(undefined); setView('orders'); }} onCreated={(workOrderId, code, technicianName) => { void finishCreate(workOrderId, code, technicianName); }} />;
  else if (view === 'clients') content = canAccessClients
    ? <ClientsWorkspace tenantId={tenantId} canManage={canManageClients} onCreateWorkOrder={(client) => openCreate({ clientId: client.id })} />
    : <section className="panel data-state error-state"><LockKeyhole size={28} /><strong>Acceso no disponible</strong><p>Tu rol no tiene acceso a la gestión administrativa de clientes.</p></section>;
  else if (view === 'planning') content = <Planning orders={orders} open={openDetail} />;
  else if (view === 'technicians') content = canAccessTechnicians ? <TechniciansWorkspace tenantId={tenantId} canManageInvitations={canManageTechnicians} onCreateWorkOrder={(technician) => openCreate({ technicianId: technician.userId, title: `Nueva intervención para ${technician.name}` })} /> : <section className="panel data-state error-state"><LockKeyhole size={28} /><strong>Acceso no disponible</strong><p>Tu rol no tiene acceso a la administración técnica.</p></section>;
  else if (view === 'technician') content = <TechnicianMobileWorkspace orders={orders} viewerId={viewerId} viewerName={viewerName} open={openDetail} busyOrderId={busyOrderId} notice={notice?.orderId ? { kind: notice.kind, text: notice.text } : null} runAction={(action, order) => runLifecycleAction(action, order)} />;
  else if (['assets', 'reports', 'audit'].includes(view)) content = <ModulePage view={view} orders={orders} catalog={catalogQuery.data} auditEvents={auditQuery.data ?? []} auditLoading={auditQuery.isLoading} auditError={auditQuery.error instanceof Error ? auditQuery.error.message : null} busyOrderId={busyOrderId} openDetail={openDetail} create={openCreate} canCreate={canManage} viewerId={viewerId} viewerRole={viewerRole} runEvidence={runEvidenceAction} />;
  else content = <Dashboard orders={orders} viewerName={viewerName} openOrders={() => setView('orders')} openDetail={openDetail} />;

  return <div className="app-shell">
    <Sidebar active={view} open={menuOpen} tenantName={tenantName} viewerRole={viewerRole} canAccessClients={canAccessClients} navigate={(next) => { if (isTechnicianRole(viewerRole) && next !== 'technician') return; if (next === 'clients' && !canAccessClients) return; if (next === 'technicians' && !canAccessTechnicians) return; setCreatePreset(undefined); setView(next); }} close={() => setMenuOpen(false)} logout={onLogout} />
    <div className="app-workspace"><Topbar viewerName={viewerName} viewerRole={viewerRole} menu={() => setMenuOpen(true)} create={() => openCreate()} canCreate={canManage} logout={onLogout} /><main className="main-content">{content}</main></div>
    <MobileNav active={view} viewerRole={viewerRole} navigate={(nextView) => { if (isTechnicianRole(viewerRole) && nextView !== 'technician') return; setCreatePreset(undefined); setView(nextView); }} />
    <PageNotice notice={notice} onClose={() => setNotice(null)} />
  </div>;
}
