import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  Files,
  Home,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { getSupabaseClient } from './lib/supabase';
import CreateWorkOrderForm from './features/work-orders/components/CreateWorkOrderForm';
import { listAccessibleWorkOrders, type WorkOrderListItem } from './features/work-orders/api/workOrdersRepository';
import { loadWorkOrderCreationCatalog, type WorkOrderCreationCatalog } from './features/work-orders/api/workOrderCommands';
import { acceptWorkOrder, blockWorkOrder, finalizeActiveWorkOrderVisit, resumeWorkOrder, startWorkOrderVisit } from './features/work-orders/api/workOrderLifecycle';
import { reviewWorkOrder, type WorkOrderReviewDecision } from './features/work-orders/api/workOrderReview';
import { humanAuditAction, listWorkOrderAuditEvents, type WorkOrderAuditEvent } from './features/work-orders/api/workOrderAuditRepository';
import { ensureWorkOrderDefaultChecklist, registerWorkOrderReport } from './features/work-orders/api/workOrderEvidenceActions';
import { cancelWorkOrder, canCancelWorkOrder } from './features/work-orders/api/workOrderCancellation';
import type { WorkOrderPriority, WorkOrderStatus, WorkOrderType } from './features/work-orders/types/workOrder';
import type { CreateWorkOrderFormValues } from './features/work-orders/forms/createWorkOrderSchema';

type View = 'dashboard' | 'orders' | 'planning' | 'detail' | 'create' | 'technician' | 'technicians' | 'clients' | 'assets' | 'reports' | 'audit' | 'checklists' | 'templates' | 'catalogs' | 'settings';
type ModuleView = Exclude<View, 'dashboard' | 'orders' | 'planning' | 'detail' | 'create' | 'technician'>;
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
  { id: 'orders', label: 'Órdenes de trabajo', icon: ClipboardList },
  { id: 'planning', label: 'Planificación', icon: CalendarDays },
  { id: 'technician', label: 'Vista técnico', icon: Wrench },
];

const secondaryNavigation: NavItem[] = [
  { id: 'technicians', label: 'Técnicos', icon: UsersRound },
  { id: 'clients', label: 'Clientes / Instalaciones', icon: Building2 },
  { id: 'assets', label: 'Equipos', icon: Boxes },
  { id: 'reports', label: 'Informes', icon: BarChart3 },
  { id: 'audit', label: 'Auditoría', icon: ShieldCheck },
];

const configurationNavigation: NavItem[] = [
  { id: 'checklists', label: 'Checklists', icon: ListChecks },
  { id: 'templates', label: 'Plantillas', icon: Files },
  { id: 'catalogs', label: 'Catálogos', icon: SlidersHorizontal },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

const moduleViews: ModuleView[] = ['technicians', 'clients', 'assets', 'reports', 'audit', 'checklists', 'templates', 'catalogs', 'settings'];

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

const templateCatalog: Array<{ name: string; cadence: string; requirements: string[]; preset: CreatePreset }> = [
  {
    name: 'Revisión preventiva inversor FV',
    cadence: 'Semestral',
    requirements: ['Checklist', 'Fotos', 'Firma', 'Informe'],
    preset: {
      title: 'Revisión preventiva inversor FV',
      type: 'mantenimiento_preventivo',
      priority: 'normal',
      estimatedMinutes: 60,
      description: 'Revisión periódica del inversor fotovoltaico.',
      instructions: 'Comprobar alarmas, producción, ventilación y protecciones.',
      expectedResult: 'Inversor funcionando sin alarmas.',
      checklist: true,
      finalPhotos: true,
      technicianSignature: true,
      report: true,
      administrativeReview: true,
    },
  },
  {
    name: 'Medición de strings FV',
    cadence: 'Trimestral',
    requirements: ['Mediciones', 'Fotos', 'Informe'],
    preset: {
      title: 'Medición de strings FV',
      type: 'medicion',
      priority: 'alta',
      estimatedMinutes: 90,
      description: 'Medición de tensión/corriente por string.',
      instructions: 'Registrar valores por string e identificar desviaciones.',
      expectedResult: 'Strings comparados sin desviaciones críticas.',
      checklist: true,
      finalPhotos: true,
      measurements: true,
      report: true,
      administrativeReview: true,
    },
  },
  {
    name: 'Revisión cuadro DC / AC FV',
    cadence: 'Semestral',
    requirements: ['Protecciones', 'SPD', 'Seccionador'],
    preset: {
      title: 'Revisión cuadro DC / AC FV',
      type: 'inspeccion',
      priority: 'normal',
      estimatedMinutes: 75,
      description: 'Inspección de protecciones, cableado, SPD y seccionadores.',
      checklist: true,
      finalPhotos: true,
      finalFunctionalTest: true,
      report: true,
      administrativeReview: true,
    },
  },
  {
    name: 'Contador bidireccional / vertido cero',
    cadence: 'Anual',
    requirements: ['Lecturas', 'Comunicación'],
    preset: {
      title: 'Verificación contador bidireccional / vertido cero',
      type: 'revision',
      priority: 'normal',
      estimatedMinutes: 45,
      description: 'Comprobación de lectura, comunicación y vertido cero.',
      checklist: true,
      measurements: true,
      report: true,
      administrativeReview: true,
    },
  },
];

function isManagerRole(role: string) {
  return ['admin_cliente', 'coordinador'].includes(role);
}

function isModuleView(view: View): view is ModuleView {
  return moduleViews.includes(view as ModuleView);
}

function isOpenOrder(order: WorkOrderListItem) {
  return !['VALIDADA', 'CANCELADA'].includes(order.status);
}

function canExecuteOrder(order: WorkOrderListItem, viewerId: string, viewerRole: string) {
  return isManagerRole(viewerRole) || order.assignedTo === viewerId;
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

function iconForOrder(order: WorkOrderListItem): LucideIcon {
  if (order.status === 'BLOQUEADA') return AlertTriangle;
  if (order.status === 'VALIDADA') return CheckCircle2;
  if (order.type === 'inspeccion' || order.type === 'revision') return FileCheck2;
  if (order.type === 'instalacion') return Boxes;
  return Wrench;
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

function makeInstallationPreset(installation: WorkOrderCreationCatalog['installations'][number]): CreatePreset {
  return {
    installationId: installation.id,
    title: `Intervención en ${installation.name}`,
    description: `Orden creada desde la instalación ${installation.name}.`,
    type: 'mantenimiento_preventivo',
    priority: 'normal',
    checklist: true,
    finalPhotos: true,
    technicianSignature: true,
    report: true,
    administrativeReview: true,
  };
}

function auditDetail(event: WorkOrderAuditEvent) {
  const meta = event.metadata;
  const parts = [
    meta.estado_anterior && meta.estado_nuevo ? `${String(meta.estado_anterior)} → ${String(meta.estado_nuevo)}` : null,
    meta.motivo ? String(meta.motivo) : null,
    meta.reason ? String(meta.reason) : null,
    meta.filename ? String(meta.filename) : null,
    meta.created_items ? `${String(meta.created_items)} puntos creados` : null,
    meta.decision ? String(meta.decision) : null,
  ].filter(Boolean);
  return parts.join(' · ') || event.entityType;
}

function Brand() {
  return <div className="brand"><span className="brand-symbol"><Zap size={25} strokeWidth={2.8} /></span><div><strong>IsiVoltPro OT</strong><span>Gestión de órdenes de trabajo</span></div></div>;
}

function Sidebar({ active, open, tenantName, viewerRole, navigate, close, logout }: { active: View; open: boolean; tenantName: string; viewerRole: string; navigate: (view: View) => void; close: () => void; logout: () => void }) {
  const renderItem = ({ id, label, icon: Icon }: NavItem, muted = false) => (
    <button className={`nav-item ${active === id ? 'active' : ''} ${muted ? 'muted-nav' : ''}`} key={id} onClick={() => { navigate(id); close(); }} type="button"><Icon size={19} /><span>{label}</span></button>
  );

  return <>
    <button className={`sidebar-backdrop ${open ? 'visible' : ''}`} onClick={close} aria-label="Cerrar menú" />
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand-row"><Brand /><button className="icon-button sidebar-close" onClick={close} aria-label="Cerrar menú"><X size={20} /></button></div>
      <nav className="sidebar-nav">
        <span className="nav-caption">Panel central</span>
        {mainNavigation.map((item) => renderItem(item))}
        {secondaryNavigation.map((item) => renderItem(item, true))}
        <span className="nav-caption nav-caption-spaced">Configuración</span>
        {configurationNavigation.map((item) => renderItem(item, true))}
      </nav>
      <div className="sidebar-footer">
        <div className="organisation-card"><span className="avatar avatar-small">OT</span><span><strong>{tenantName}</strong><small>{roleLabel(viewerRole)}</small></span></div>
        <button className="logout-button" onClick={logout} type="button"><LogOut size={18} /> Cerrar sesión</button>
      </div>
    </aside>
  </>;
}

function Topbar({ viewerName, viewerRole, menu, create }: { viewerName: string; viewerRole: string; menu: () => void; create: () => void }) {
  return <header className="topbar"><button className="icon-button menu-button" onClick={menu} aria-label="Abrir menú"><Menu size={21} /></button><label className="search-box"><Search size={18} /><input placeholder="Buscar OT, equipo, ubicación..." /><kbd>⌘K</kbd></label><div className="topbar-actions"><button className="icon-button notification-button" type="button"><Bell size={20} /><span>0</span></button><div className="user-menu"><span className="avatar">{initials(viewerName)}</span><span><strong>{viewerName}</strong><small>{roleLabel(viewerRole)}</small></span></div><button className="primary-button top-create" onClick={create} type="button"><Plus size={18} /> Nueva OT</button></div></header>;
}

function Metrics({ orders }: { orders: WorkOrderListItem[] }) {
  const items = [
    { value: orders.filter(isOpenOrder).length, label: 'OT abiertas', icon: ClipboardList, tone: 'red' },
    { value: orders.filter((order) => order.status === 'VALIDADA').length, label: 'OT validadas', icon: CheckCircle2, tone: 'green' },
    { value: orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length, label: 'Pendientes validar', icon: Clock3, tone: 'orange' },
    { value: orders.filter((order) => order.status === 'BLOQUEADA').length, label: 'OT bloqueadas', icon: AlertTriangle, tone: 'purple' },
  ] as const;
  return <section className="metrics-grid">{items.map(({ value, label, icon: Icon, tone }) => <article className="metric-card" key={label}><span className={`metric-icon tone-${tone}`}><Icon size={23} /></span><div className="metric-content"><strong>{value}</strong><span>{label}</span><small>Datos reales RLS</small></div></article>)}</section>;
}

function NoticeLine({ notice, orderId }: { notice: Notice; orderId: string }) {
  if (!notice || notice.orderId !== orderId) return null;
  return <p className={notice.kind === 'error' ? 'form-global-error' : 'read-only-note'}>{notice.kind === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />} {notice.text}</p>;
}

function OrderList({ orders, open, empty, limit }: { orders: WorkOrderListItem[]; open: (id: string) => void; empty: string; limit?: number }) {
  const visible = limit ? orders.slice(0, limit) : orders;
  if (visible.length === 0) return <p className="empty-state">{empty}</p>;
  return <div className="day-plan-list">{visible.map((order) => { const Icon = iconForOrder(order); return <button key={order.id} onClick={() => open(order.id)} type="button"><Icon size={18} /><span><strong>{order.code} · {order.title}</strong><small>{order.siteName}{order.locationName ? ` · ${order.locationName}` : ''}{order.assetName ? ` · ${order.assetName}` : ''}</small></span><span className={statusClass(order.status)}>{statusLabels[order.status]}</span></button>; })}</div>;
}

function LifecycleActions({ order, canUse, busy, compact = false, run }: { order: WorkOrderListItem; canUse: boolean; busy: boolean; compact?: boolean; run: RunLifecycle }) {
  const actions = compact ? availableLifecycleActions(order).slice(0, 2) : availableLifecycleActions(order);
  if (!canUse || actions.length === 0) return compact ? null : <p className="read-only-note"><LockKeyhole size={16} /> No hay acciones técnicas disponibles para este estado.</p>;
  return <div className="form-actions work-order-form-actions">{actions.map((action) => <button className={['start', 'finish', 'resume'].includes(action) ? 'primary-button' : 'secondary-button'} disabled={busy} key={action} onClick={(event) => { event.stopPropagation(); run(action, order); }} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <Wrench size={17} />} {actionLabel(action)}</button>)}</div>;
}

function ReviewActions({ order, canReview, busy, run }: { order: WorkOrderListItem; canReview: boolean; busy: boolean; run: RunReview }) {
  if (!canReview) return null;
  if (order.status !== 'FINALIZADA_TECNICO') return <p className="read-only-note"><ShieldCheck size={16} /> La revisión administrativa aparece cuando el técnico finaliza la intervención.</p>;
  return <div className="form-actions work-order-form-actions"><button className="primary-button" disabled={busy} onClick={() => run('validate', order)} type="button"><ShieldCheck size={17} /> Validar OT</button><button className="secondary-button" disabled={busy} onClick={() => run('correction', order)} type="button"><AlertTriangle size={17} /> Solicitar corrección</button></div>;
}

function EvidenceActions({ order, canUse, busy, run }: { order: WorkOrderListItem; canUse: boolean; busy: boolean; run: RunEvidence }) {
  if (!canUse) return <p className="read-only-note"><LockKeyhole size={16} /> No tienes permisos para preparar evidencias de esta OT.</p>;
  return <div className="form-actions work-order-form-actions"><button className="secondary-button" disabled={busy || !isOpenOrder(order)} onClick={() => run('checklist', order)} type="button"><ListChecks size={17} /> Preparar checklist</button><button className="primary-button" disabled={busy} onClick={() => run('report', order)} type="button"><FileCheck2 size={17} /> Registrar informe</button></div>;
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
  const technicians = useMemo(() => groupBy(orders, (order) => order.assignedToName ?? 'Sin asignar').sort((a, b) => b.rows.length - a.rows.length).slice(0, 5), [orders]);
  const planned = orders.filter((order) => order.plannedAt).slice(0, 4);
  const total = Math.max(orders.length, 1);
  return <><div className="page-heading"><span className="section-kicker">Panel central</span><h1>Hola, {viewerName.split(' ')[0]} 👋</h1><p>Resumen real de las órdenes visibles.</p></div><Metrics orders={orders} /><section className="dashboard-grid dashboard-grid-top"><article className="panel orders-status-panel"><div className="panel-heading"><h2>Estado de órdenes</h2><span className="source-badge">RLS activo</span></div><ul className="legend-list">{(['ASIGNADA', 'EN_CURSO', 'FINALIZADA_TECNICO', 'BLOQUEADA', 'VALIDADA'] as const).map((status) => <li key={status}><i className="legend-red" /><span>{statusLabels[status]}</span><strong>{counts.get(status) ?? 0}</strong><small>{Math.round(((counts.get(status) ?? 0) / total) * 100)}%</small></li>)}</ul><button className="text-link panel-link" onClick={openOrders} type="button">Ver listado <ChevronRight size={15} /></button></article><article className="panel recent-orders-panel"><div className="panel-heading"><h2>OT recientes</h2><span className="source-badge">Datos reales</span></div><OrderList orders={orders} open={openDetail} empty="No hay órdenes visibles." limit={5} /></article><article className="panel alert-panel"><div className="panel-heading"><h2>Atención</h2></div><div className="alert-row"><span className="activity-icon tone-red"><AlertTriangle size={17} /></span><span><strong>{counts.get('BLOQUEADA') ?? 0} bloqueadas</strong><button className="text-link" onClick={openOrders} type="button">Revisar</button></span></div><div className="alert-row"><span className="activity-icon tone-orange"><Clock3 size={17} /></span><span><strong>{counts.get('FINALIZADA_TECNICO') ?? 0} pendientes validar</strong><button className="text-link" onClick={openOrders} type="button">Abrir</button></span></div></article></section><section className="dashboard-grid dashboard-grid-bottom"><article className="panel workload-panel"><div className="panel-heading"><h2>Carga por técnico</h2></div><div className="workload-list">{technicians.map(({ name, rows }) => <div className="workload-row" key={name}><span className="avatar avatar-mini">{initials(name)}</span><strong>{name}</strong><div className="progress"><i style={{ width: `${Math.min(100, Math.round((rows.length / total) * 100))}%` }} /></div><b>{rows.length} OT</b><small>{Math.round((rows.length / total) * 100)}%</small></div>)}</div></article><article className="panel calendar-panel"><div className="panel-heading"><h2>Próximas OT</h2></div><div className="agenda-list">{planned.length === 0 ? <p className="empty-state">No hay fechas previstas.</p> : planned.map((order) => <button className="agenda-item red" key={order.id} onClick={() => openDetail(order.id)} type="button"><time>{compactDate(order.plannedAt)}</time><span><strong>{order.title}</strong><small>{order.assignedToName ?? 'Sin asignar'} · {order.siteName}</small></span></button>)}</div></article></section></>;
}

function OrdersPage({ orders, open, create, viewerRole, busyOrderId, cancelOrder }: { orders: WorkOrderListItem[]; open: (id: string) => void; create: () => void; viewerRole: string; busyOrderId: string | null; cancelOrder: (order: WorkOrderListItem) => void }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? orders.filter((order) => [order.code, order.title, order.siteName, order.locationName, order.assignedToName, order.assetName, order.assetReference].some((value) => value?.toLowerCase().includes(term))) : orders;
  }, [orders, search]);

  return <><div className="page-heading page-heading-row"><div><span className="section-kicker">Gestión diaria</span><h1>Órdenes de trabajo</h1><p>{filtered.length} órdenes visibles.</p></div><button className="primary-button" onClick={create} type="button"><Plus size={18} /> Nueva OT</button></div><section className="panel table-panel"><div className="filters-row"><label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por ID, título, equipo o ubicación" value={search} /></label><span className="source-badge">Datos reales</span></div><div className="orders-table"><div className="orders-table-row orders-table-head"><span>ID</span><span>Trabajo</span><span>Instalación / equipo</span><span>Técnico</span><span>Estado</span><span>Prioridad</span><span>Fecha</span><span>Acciones</span></div>{filtered.length === 0 ? <p className="empty-table">No hay órdenes que coincidan.</p> : filtered.map((order) => <div className="orders-table-row" key={order.id}><strong>{order.code}</strong><span>{order.title}</span><span>{order.siteName}{order.assetName ? ` · ${order.assetName}` : ''}</span><span>{order.assignedToName ?? 'Sin asignar'}</span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i></span><span><i className={`priority-badge ${priorityClass(order.priority)}`}>{priorityLabels[order.priority]}</i></span><span>{compactDate(order.plannedAt)}</span><span className="form-actions"><button className="text-link" onClick={() => open(order.id)} type="button">Abrir</button>{isManagerRole(viewerRole) && canCancelWorkOrder(order.status) && <button className="text-link" disabled={busyOrderId === order.id} onClick={() => cancelOrder(order)} type="button">Anular</button>}</span></div>)}</div></section></>;
}

function Detail({ order, back, create, viewerId, viewerRole, busyOrderId, notice, runAction, runReview, runEvidence, runCancel }: { order: WorkOrderListItem | null; back: () => void; create: OpenCreate; viewerId: string; viewerRole: string; busyOrderId: string | null; notice: Notice; runAction: RunLifecycle; runReview: RunReview; runEvidence: RunEvidence; runCancel: (order: WorkOrderListItem) => void }) {
  if (!order) return <section className="panel data-state"><AlertTriangle size={28} /><strong>Orden no disponible</strong><button className="secondary-button" onClick={back} type="button">Volver</button></section>;
  const required = Object.entries(order.requirements).filter(([, value]) => value).map(([key]) => key.replaceAll(/([A-Z])/g, ' $1').toLowerCase());
  return <><div className="detail-header"><button className="back-button" onClick={back} type="button"><ArrowLeft size={18} /> Volver</button><div><span className="section-kicker">Orden de trabajo real</span><h1>{order.code}</h1><p>{order.title}</p></div><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><button className="filter-button detail-actions" onClick={() => create({ installationId: order.siteId, locationId: order.locationId ?? '', assetId: order.assetId ?? '', technicianId: order.assignedTo ?? '', title: `Seguimiento de ${order.title}`, description: `Nueva actuación relacionada con ${order.code}.`, type: order.type, priority: order.priority })} type="button">Nueva relacionada <Plus size={15} /></button></div><section className="detail-grid"><article className="panel detail-main-card"><div className="panel-heading"><h2>Información del trabajo</h2><span className={`priority-badge ${priorityClass(order.priority)}`}>{priorityLabels[order.priority]}</span></div><dl className="detail-definition-grid"><div><dt>Instalación</dt><dd>{order.siteName}</dd></div><div><dt>Ubicación</dt><dd>{order.locationName ?? 'Sin ubicación'}</dd></div><div><dt>Equipo</dt><dd>{order.assetName ?? 'Sin equipo vinculado'}</dd></div><div><dt>Tipo</dt><dd>{typeLabels[order.type]}</dd></div><div><dt>Técnico</dt><dd>{order.assignedToName ?? 'Sin asignar'}</dd></div><div><dt>Planificada</dt><dd>{displayDate(order.plannedAt)}</dd></div></dl><div className="description-box"><strong>Descripción</strong><p>{order.description || 'Sin descripción registrada.'}</p></div><div className="evidence-grid"><div><ListChecks size={22} /><strong>{order.requirements.checklist ? 'Checklist requerido' : 'Sin checklist'}</strong><small>{required.length ? required.join(' · ') : 'Sin requisitos especiales'}</small></div><div><FileCheck2 size={22} /><strong>{order.requirements.report ? 'Informe requerido' : 'Informe opcional'}</strong><small>Registro documental</small></div><div><Clock3 size={22} /><strong>{order.dueAt ? displayDate(order.dueAt) : 'Sin fecha límite'}</strong><small>Vencimiento</small></div></div></article><aside className="panel detail-side-card"><h2>Estado actual</h2><div className="timeline"><div className="done"><i /><span><strong>OT creada</strong><small>{displayDate(order.createdAt)}</small></span></div><div className={order.assignedTo ? 'done' : 'current'}><i /><span><strong>{order.assignedTo ? 'Técnico asignado' : 'Pendiente de asignación'}</strong><small>{order.assignedToName ?? 'Sin técnico'}</small></span></div><div className="current"><i /><span><strong>{statusLabels[order.status]}</strong><small>Actualizada {displayDate(order.updatedAt)}</small></span></div></div></aside></section><article className="panel source-panel"><div className="panel-heading"><h2><Wrench size={21} /> Acciones técnicas</h2><span className="source-badge">Ciclo real</span></div><LifecycleActions order={order} canUse={canExecuteOrder(order, viewerId, viewerRole)} busy={busyOrderId === order.id} run={runAction} /><NoticeLine notice={notice} orderId={order.id} /></article><article className="panel source-panel"><div className="panel-heading"><h2><ListChecks size={21} /> Evidencias y documentación</h2><span className="source-badge">Checklist / informe</span></div><EvidenceActions order={order} canUse={canExecuteOrder(order, viewerId, viewerRole)} busy={busyOrderId === order.id} run={runEvidence} /></article><article className="panel source-panel"><div className="panel-heading"><h2><ShieldCheck size={21} /> Revisión administrativa</h2><span className="source-badge">Validación</span></div><ReviewActions order={order} canReview={isManagerRole(viewerRole)} busy={busyOrderId === order.id} run={runReview} /></article><article className="panel source-panel"><div className="panel-heading"><h2><AlertTriangle size={21} /> Zona responsable</h2><span className="source-badge">Anulación segura</span></div><CancelAction order={order} canCancel={isManagerRole(viewerRole) && canCancelWorkOrder(order.status)} busy={busyOrderId === order.id} run={runCancel} /><NoticeLine notice={notice} orderId={order.id} /></article></>;
}

function Planning({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const planned = orders.filter((order) => order.plannedAt).sort((a, b) => String(a.plannedAt).localeCompare(String(b.plannedAt)));
  const overdue = planned.filter((order) => new Date(order.plannedAt || '').getTime() < Date.now() && isOpenOrder(order));
  return <><div className="page-heading"><span className="section-kicker">Organización</span><h1>Planificación real</h1><p>Órdenes con fecha prevista.</p></div><Metrics orders={orders} /><section className="dashboard-grid dashboard-grid-bottom"><article className="panel planning-list-panel"><div className="panel-heading"><h2>Agenda de OT</h2><span className="source-badge">{planned.length}</span></div><OrderList orders={planned} open={open} empty="No hay OT planificadas." /></article><article className="panel alert-panel"><div className="panel-heading"><h2>Vencidas / riesgo</h2></div><OrderList orders={overdue} open={open} empty="Sin OT vencidas visibles." limit={6} /></article></section></>;
}

function Technician({ orders, viewerId, viewerRole, open, busyOrderId, runAction }: { orders: WorkOrderListItem[]; viewerId: string; viewerRole: string; open: (id: string) => void; busyOrderId: string | null; runAction: RunLifecycle }) {
  const ownOrders = orders.filter((order) => order.assignedTo === viewerId || isManagerRole(viewerRole));
  return <section className="technician-preview-page"><div className="technician-description"><span className="section-kicker">Zona técnico real</span><h1>OT ejecutables</h1><p>Aceptar, iniciar, pausar, reanudar y finalizar desde el móvil.</p><div className="technician-benefits"><span><CheckCircle2 size={18} /> {ownOrders.length} OT visibles</span><span><CheckCircle2 size={18} /> Acciones protegidas por RPC</span></div></div><div className="phone-shell"><div className="phone-screen"><header className="mobile-header"><Menu size={20} /><strong>IsiVoltPro OT</strong><Bell size={19} /></header><main className="mobile-content"><h2>Mis órdenes</h2><p>{ownOrders.length} trabajos asignados o gestionables.</p><div className="mobile-metrics"><div><span className="tone-red"><ClipboardList size={19} /></span><strong>{ownOrders.filter((order) => order.status === 'ASIGNADA').length}</strong><small>Asignadas</small></div><div><span className="tone-green"><CheckCircle2 size={19} /></span><strong>{ownOrders.filter((order) => order.status === 'EN_CURSO').length}</strong><small>En curso</small></div><div><span className="tone-purple"><AlertTriangle size={19} /></span><strong>{ownOrders.filter((order) => order.status === 'BLOQUEADA').length}</strong><small>Bloqueadas</small></div></div><div className="mobile-orders">{ownOrders.length === 0 ? <p className="empty-state">No tienes OT asignadas.</p> : ownOrders.slice(0, 5).map((order) => { const Icon = iconForOrder(order); return <button key={order.id} onClick={() => open(order.id)} type="button"><span className="order-icon"><Icon size={18} /></span><span><strong>{order.code}</strong><b>{order.title}</b><small>{order.siteName}</small><LifecycleActions order={order} canUse={canExecuteOrder(order, viewerId, viewerRole)} busy={busyOrderId === order.id} compact run={runAction} /></span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i><small>{compactDate(order.plannedAt)}</small><ChevronRight size={16} /></span></button>; })}</div></main></div></div></section>;
}

function ModuleMetrics({ orders, catalog }: { orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null }) {
  return <section className="metrics-grid"><article className="metric-card"><span className="metric-icon tone-red"><ClipboardList size={22} /></span><div className="metric-content"><strong>{orders.length}</strong><span>OT visibles</span><small>Según RLS</small></div></article><article className="metric-card"><span className="metric-icon tone-green"><Building2 size={22} /></span><div className="metric-content"><strong>{catalog?.installations.length ?? uniqueCount(orders.map((order) => order.siteName))}</strong><span>Instalaciones</span><small>Activas</small></div></article><article className="metric-card"><span className="metric-icon tone-orange"><Boxes size={22} /></span><div className="metric-content"><strong>{catalog?.assets.length ?? uniqueCount(orders.map((order) => order.assetName || order.assetType))}</strong><span>Equipos</span><small>Inventario</small></div></article><article className="metric-card"><span className="metric-icon tone-purple"><AlertTriangle size={22} /></span><div className="metric-content"><strong>{orders.filter((order) => order.status === 'BLOQUEADA').length}</strong><span>Bloqueos</span><small>Revisar</small></div></article></section>;
}

function TechniciansPage({ orders, catalog, open, create }: { orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null; open: (id: string) => void; create: OpenCreate }) {
  const techs = catalog?.technicians.map((technician) => ({ name: technician.name, id: technician.id, rows: orders.filter((order) => order.assignedTo === technician.id) })) ?? groupBy(orders, (order) => order.assignedToName ?? 'Sin asignar').map((group) => ({ ...group, id: '' }));
  return <><ModuleMetrics orders={orders} catalog={catalog} /><section className="panel workload-panel"><div className="panel-heading"><h2>Carga por técnico</h2><span className="source-badge">{techs.length} técnicos</span></div><div className="workload-list">{techs.map(({ name, id, rows }) => { const latest = latestOrder(rows); return <div className="workload-row" key={id || name}><span className="avatar avatar-mini">{initials(name)}</span><strong>{name}</strong><b>{rows.length} OT</b><small>{rows.filter((order) => order.status === 'EN_CURSO').length} en curso · {rows.filter((order) => order.status === 'BLOQUEADA').length} bloqueadas</small>{latest && <button className="text-link" onClick={() => open(latest.id)} type="button">Última</button>}<button className="text-link" onClick={() => create({ technicianId: id, title: `Nueva intervención para ${name}` })} type="button">Nueva OT</button></div>; })}</div></section></>;
}

function ClientsPage({ orders, catalog, open, create }: { orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null; open: (id: string) => void; create: OpenCreate }) {
  const sites = catalog?.installations.map((installation) => ({ installation, rows: orders.filter((order) => order.siteId === installation.id) })) ?? groupBy(orders, (order) => order.siteName).map((group) => ({ installation: { id: group.rows[0]?.siteId ?? '', name: group.name, code: null }, rows: group.rows }));
  return <><ModuleMetrics orders={orders} catalog={catalog} /><section className="panel planning-list-panel"><div className="panel-heading"><h2>Instalaciones</h2><span className="source-badge">{sites.length}</span></div><div className="day-plan-list">{sites.map(({ installation, rows }) => { const latest = latestOrder(rows); return <button key={installation.id || installation.name} onClick={() => latest ? open(latest.id) : create(makeInstallationPreset(installation))} type="button"><Building2 size={18} /><span><strong>{installation.code ? `${installation.code} · ` : ''}{installation.name}</strong><small>{uniqueCount(rows.map((order) => order.locationName))} ubicaciones · {uniqueCount(rows.map((order) => order.assetName || order.assetId))} equipos · {rows.filter(isOpenOrder).length} abiertas</small></span><ChevronRight size={17} /></button>; })}</div></section></>;
}

function AssetsPage({ orders, catalog, open, create }: { orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null; open: (id: string) => void; create: OpenCreate }) {
  const catalogAssets = catalog?.assets.map((asset) => ({ asset, rows: orders.filter((order) => order.assetId === asset.id) }));
  const groupedAssets = groupBy(orders, (order) => order.assetName || order.assetType || `Sin equipo · ${typeLabels[order.type]}`).map((group) => ({ asset: null as WorkOrderCreationCatalog['assets'][number] | null, rows: group.rows, name: group.name }));
  const assets = catalogAssets ? catalogAssets.map(({ asset, rows }) => ({ asset, rows, name: asset.name })) : groupedAssets;
  return <><ModuleMetrics orders={orders} catalog={catalog} /><section className="panel planning-list-panel"><div className="panel-heading"><h2>Equipos y activos</h2><span className="source-badge">{assets.length}</span></div><div className="day-plan-list">{assets.map(({ asset, name, rows }) => { const latest = latestOrder(rows); return <button key={asset?.id ?? name} onClick={() => latest ? open(latest.id) : asset && create(makeAssetPreset(asset))} type="button"><Boxes size={18} /><span><strong>{name}</strong><small>{rows.length} OT · {rows.filter(isOpenOrder).length} abiertas</small></span><ChevronRight size={17} /></button>; })}</div></section></>;
}

function ReportsPage({ orders, open, busyOrderId, runEvidence }: { orders: WorkOrderListItem[]; open: (id: string) => void; busyOrderId: string | null; runEvidence: RunEvidence }) {
  const reportOrders = orders.filter((order) => order.requirements.report || ['FINALIZADA_TECNICO', 'VALIDADA'].includes(order.status));
  return <><Metrics orders={orders} /><section className="dashboard-grid dashboard-grid-bottom"><article className="panel planning-list-panel"><div className="panel-heading"><h2>Informes requeridos</h2><span className="source-badge">{reportOrders.length}</span></div><div className="day-plan-list">{reportOrders.length === 0 ? <p className="empty-state">Sin informes requeridos.</p> : reportOrders.map((order) => <div className="orders-table-row" key={order.id}><span><strong>{order.code} · {order.title}</strong><small>{order.siteName}</small></span><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><span className="form-actions"><button className="text-link" onClick={() => open(order.id)} type="button">Abrir</button><button className="text-link" disabled={busyOrderId === order.id} onClick={() => runEvidence('report', order)} type="button">Registrar informe</button></span></div>)}</div></article><article className="panel source-panel"><div className="panel-heading"><h2>Estado documental</h2></div><div className="source-checks"><span><FileCheck2 size={17} /> {orders.filter((order) => order.requirements.report).length} OT con PDF requerido</span><span><Clock3 size={17} /> {orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length} pendientes de revisión</span><span><ShieldCheck size={17} /> {orders.filter((order) => order.status === 'VALIDADA').length} validadas</span></div></article></section></>;
}

function AuditPage({ orders, events, loading, error, open }: { orders: WorkOrderListItem[]; events: WorkOrderAuditEvent[]; loading: boolean; error: string | null; open: (id: string) => void }) {
  const fallbackEvents = orders.flatMap((order) => [{ id: `${order.id}-updated`, at: order.updatedAt, order, title: `Estado: ${statusLabels[order.status]}`, detail: order.assignedToName ? `Asignada a ${order.assignedToName}` : 'Sin técnico asignado' }, { id: `${order.id}-created`, at: order.createdAt, order, title: 'OT creada', detail: order.siteName }]).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 18);
  return <><ModuleMetrics orders={orders} /><section className="panel planning-list-panel"><div className="panel-heading"><h2>Línea de tiempo real</h2><span className="source-badge">{events.length || fallbackEvents.length} eventos</span></div>{loading && <p className="read-only-note"><LoaderCircle className="spin" size={16} /> Cargando auditoría real…</p>}{error && <p className="form-global-error"><AlertTriangle size={16} /> No se pudo leer audit_logs: {error}</p>}<div className="day-plan-list">{events.length > 0 ? events.map((event) => { const order = orders.find((item) => item.id === event.entityId); return <button key={event.id} onClick={() => { if (event.entityId) open(event.entityId); }} type="button"><ShieldCheck size={18} /><span><strong>{order ? `${order.code} · ` : ''}{humanAuditAction(event.action)}</strong><small>{displayDate(event.createdAt)} · {order?.title ?? event.entityId ?? 'Sin OT vinculada'} · {auditDetail(event)}</small></span><ChevronRight size={17} /></button>; }) : fallbackEvents.length === 0 ? <p className="empty-state">Sin actividad visible.</p> : fallbackEvents.map((event) => <button key={event.id} onClick={() => open(event.order.id)} type="button"><ShieldCheck size={18} /><span><strong>{event.order.code} · {event.title}</strong><small>{displayDate(event.at)} · {event.detail}</small></span><ChevronRight size={17} /></button>)}</div></section></>;
}

function ChecklistsPage({ orders, open, busyOrderId, runEvidence }: { orders: WorkOrderListItem[]; open: (id: string) => void; busyOrderId: string | null; runEvidence: RunEvidence }) {
  const checklistOrders = orders.filter((order) => order.requirements.checklist);
  return <><Metrics orders={orders} /><section className="panel planning-list-panel"><div className="panel-heading"><h2>Checklist por OT</h2><span className="source-badge">{checklistOrders.length}</span></div><div className="day-plan-list">{checklistOrders.length === 0 ? <p className="empty-state">Sin checklists requeridos.</p> : checklistOrders.map((order) => <div className="orders-table-row" key={order.id}><span><strong>{order.code} · {order.title}</strong><small>{order.siteName}</small></span><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><span className="form-actions"><button className="text-link" onClick={() => open(order.id)} type="button">Abrir</button><button className="text-link" disabled={busyOrderId === order.id || !isOpenOrder(order)} onClick={() => runEvidence('checklist', order)} type="button">Preparar checklist</button></span></div>)}</div></section></>;
}

function TemplatesPage({ create, catalog }: { create: OpenCreate; catalog?: WorkOrderCreationCatalog | null }) {
  const firstInstallationId = catalog?.installations[0]?.id ?? '';
  return <section className="panel planning-list-panel"><div className="panel-heading"><h2>Plantillas operativas</h2><span className="source-badge">FV / mantenimiento</span></div><div className="day-plan-list">{templateCatalog.map((template) => <button key={template.name} onClick={() => create({ installationId: firstInstallationId, ...template.preset })} type="button"><Files size={18} /><span><strong>{template.name}</strong><small>{template.cadence} · {template.requirements.join(' · ')}</small></span><Plus size={17} /></button>)}</div></section>;
}

function CatalogsPage({ orders, catalog }: { orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null }) {
  return <><ModuleMetrics orders={orders} catalog={catalog} /><section className="dashboard-grid dashboard-grid-bottom"><article className="panel source-panel"><div className="panel-heading"><h2>Estados</h2></div><div className="source-checks">{Object.entries(statusLabels).map(([status, label]) => <span key={status}><CheckCircle2 size={17} /> {label}: {orders.filter((order) => order.status === status).length}</span>)}</div></article><article className="panel source-panel"><div className="panel-heading"><h2>Tipos</h2></div><div className="source-checks">{Object.entries(typeLabels).map(([type, label]) => <span key={type}><Wrench size={17} /> {label}: {orders.filter((order) => order.type === type).length}</span>)}</div></article></section></>;
}

function SettingsPage({ tenantName, viewerRole, viewerName, orders, catalog }: { tenantName: string; viewerRole: string; viewerName: string; orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null }) {
  return <section className="panel source-panel"><div className="panel-heading"><h2>Configuración activa</h2><Settings size={22} /></div><div className="source-checks"><span><UsersRound size={17} /> Usuario: {viewerName}</span><span><Building2 size={17} /> Organización: {tenantName}</span><span><ShieldCheck size={17} /> Rol: {roleLabel(viewerRole)}</span><span><ClipboardList size={17} /> {orders.length} OT visibles por RLS</span><span><Boxes size={17} /> {catalog?.assets.length ?? 0} activos disponibles</span><span><LockKeyhole size={17} /> Acciones limitadas por permisos</span></div></section>;
}

function ModulePage({ view, orders, catalog, tenantName, viewerRole, viewerName, auditEvents, auditLoading, auditError, busyOrderId, openDetail, create, runEvidence }: { view: ModuleView; orders: WorkOrderListItem[]; catalog?: WorkOrderCreationCatalog | null; tenantName: string; viewerRole: string; viewerName: string; auditEvents: WorkOrderAuditEvent[]; auditLoading: boolean; auditError: string | null; busyOrderId: string | null; openDetail: (id: string) => void; create: OpenCreate; runEvidence: RunEvidence }) {
  const meta = {
    technicians: { title: 'Técnicos', kicker: 'Personal', description: 'Carga de trabajo y OT asignadas.', icon: UsersRound },
    clients: { title: 'Clientes / Instalaciones', kicker: 'Inventario', description: 'Instalaciones conectadas con ubicaciones, equipos y OT.', icon: Building2 },
    assets: { title: 'Equipos', kicker: 'Inventario técnico', description: 'Activos relacionados con OT abiertas e histórico.', icon: Boxes },
    reports: { title: 'Informes', kicker: 'Documentación', description: 'Registro de informes técnicos de OT.', icon: BarChart3 },
    audit: { title: 'Auditoría', kicker: 'Trazabilidad', description: 'Eventos reales registrados por Supabase.', icon: ShieldCheck },
    checklists: { title: 'Checklists', kicker: 'Control técnico', description: 'Preparación de puntos de checklist por OT.', icon: ListChecks },
    templates: { title: 'Plantillas', kicker: 'Configuración', description: 'Plantillas listas para generar OT repetibles.', icon: Files },
    catalogs: { title: 'Catálogos', kicker: 'Maestros', description: 'Estados, prioridades y tipos del flujo.', icon: SlidersHorizontal },
    settings: { title: 'Ajustes', kicker: 'Cuenta', description: 'Sesión, organización y permisos.', icon: Settings },
  } satisfies Record<ModuleView, { title: string; kicker: string; description: string; icon: LucideIcon }>;
  const current = meta[view];
  const Icon = current.icon;
  return <><div className="page-heading page-heading-row"><div><span className="section-kicker">{current.kicker}</span><h1>{current.title}</h1><p>{current.description}</p></div><button className="primary-button" onClick={() => create()} type="button"><Plus size={18} /> Nueva OT</button></div><article className="panel source-panel"><div className="panel-heading"><h2><Icon size={21} /> Flujo conectado</h2><span className="source-badge">Datos reales</span></div><div className="source-checks"><span><CheckCircle2 size={17} /> Cliente/instalación → equipo → OT</span><span><CheckCircle2 size={17} /> Intervención → checklist/informe</span><span><CheckCircle2 size={17} /> Revisión → auditoría</span></div></article>{view === 'technicians' && <TechniciansPage orders={orders} catalog={catalog} open={openDetail} create={create} />}{view === 'clients' && <ClientsPage orders={orders} catalog={catalog} open={openDetail} create={create} />}{view === 'assets' && <AssetsPage orders={orders} catalog={catalog} open={openDetail} create={create} />}{view === 'reports' && <ReportsPage orders={orders} open={openDetail} busyOrderId={busyOrderId} runEvidence={runEvidence} />}{view === 'audit' && <AuditPage orders={orders} events={auditEvents} loading={auditLoading} error={auditError} open={openDetail} />}{view === 'checklists' && <ChecklistsPage orders={orders} open={openDetail} busyOrderId={busyOrderId} runEvidence={runEvidence} />}{view === 'templates' && <TemplatesPage create={create} catalog={catalog} />}{view === 'catalogs' && <CatalogsPage orders={orders} catalog={catalog} />}{view === 'settings' && <SettingsPage tenantName={tenantName} viewerRole={viewerRole} viewerName={viewerName} orders={orders} catalog={catalog} />}</>;
}

function MobileNav({ active, navigate }: { active: View; navigate: (view: View) => void }) {
  return <nav className="app-mobile-nav">{mainNavigation.map(({ id, label, icon: Icon }) => <button className={active === id ? 'active' : ''} key={id} onClick={() => navigate(id)} type="button"><Icon size={19} /><span>{label === 'Órdenes de trabajo' ? 'OT' : label.replace('Vista ', '')}</span></button>)}<button className="mobile-create-button" onClick={() => navigate('create')} type="button"><Plus size={24} /></button></nav>;
}

export default function App({ tenantId, tenantName, viewerId, viewerName, viewerRole, onLogout }: AppProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [createPreset, setCreatePreset] = useState<CreatePreset | undefined>();
  const [notice, setNotice] = useState<Notice>(null);

  const query = useQuery({ queryKey: ['work-orders', tenantId], queryFn: () => listAccessibleWorkOrders(getSupabaseClient(), tenantId), enabled: Boolean(tenantId) });
  const catalogQuery = useQuery({ queryKey: ['work-order-creation-catalog', tenantId], queryFn: () => loadWorkOrderCreationCatalog(getSupabaseClient(), tenantId), enabled: Boolean(tenantId), staleTime: 60_000 });
  const auditQuery = useQuery({ queryKey: ['work-order-audit', tenantId], queryFn: () => listWorkOrderAuditEvents(getSupabaseClient(), tenantId), enabled: Boolean(tenantId), staleTime: 30_000 });

  const invalidateWorkOrderData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['work-orders', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-audit', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] }),
    ]);
  };

  const lifecycleMutation = useMutation({
    mutationFn: async ({ action, order, reason, workDone }: { action: LifecycleAction; order: WorkOrderListItem; reason?: string; workDone?: string }) => {
      const supabase = getSupabaseClient();
      if (action === 'accept') return acceptWorkOrder(supabase, order.id);
      if (action === 'start') return startWorkOrderVisit(supabase, order.id);
      if (action === 'resume') return resumeWorkOrder(supabase, order.id);
      if (action === 'pause') return blockWorkOrder(supabase, { workOrderId: order.id, status: 'PAUSADA', reason: reason ?? '' });
      if (action === 'material') return blockWorkOrder(supabase, { workOrderId: order.id, status: 'PENDIENTE_MATERIAL', reason: reason ?? '' });
      if (action === 'client') return blockWorkOrder(supabase, { workOrderId: order.id, status: 'PENDIENTE_CLIENTE', reason: reason ?? '' });
      return finalizeActiveWorkOrderVisit(supabase, { workOrderId: order.id, workDone: workDone ?? '', result: 'trabajo_completado' });
    },
    onSuccess: async (_, variables) => { await invalidateWorkOrderData(); setNotice({ kind: 'success', orderId: variables.order.id, text: `${actionLabel(variables.action)} realizado correctamente.` }); },
    onError: (error, variables) => setNotice({ kind: 'error', orderId: variables.order.id, text: error instanceof Error ? error.message : 'No se pudo completar la acción.' }),
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
  const busyOrderId = lifecycleMutation.variables?.order.id ?? reviewMutation.variables?.order.id ?? evidenceMutation.variables?.order.id ?? cancelMutation.variables?.order.id ?? null;

  const openDetail = (id: string) => { setSelectedOrderId(id); setView('detail'); };
  const openCreate: OpenCreate = (preset) => { setCreatePreset(preset); setView('create'); };
  const finishCreate = async (workOrderId: string) => { await invalidateWorkOrderData(); setCreatePreset(undefined); setSelectedOrderId(workOrderId); setView('detail'); };

  const runLifecycleAction: RunLifecycle = (action, order) => {
    if (!canExecuteOrder(order, viewerId, viewerRole)) { setNotice({ kind: 'error', orderId: order.id, text: 'No tienes permisos para ejecutar esta OT.' }); return; }
    if (action === 'pause' || action === 'material' || action === 'client') {
      const reason = window.prompt('Indica el motivo para dejar la OT bloqueada o pendiente:');
      if (!reason?.trim()) return;
      lifecycleMutation.mutate({ action, order, reason });
      return;
    }
    if (action === 'finish') {
      const workDone = window.prompt('Resume el trabajo realizado para finalizar la intervención:');
      if (!workDone?.trim()) return;
      lifecycleMutation.mutate({ action, order, workDone });
      return;
    }
    lifecycleMutation.mutate({ action, order });
  };

  const runReviewAction: RunReview = (action, order) => {
    if (!isManagerRole(viewerRole)) { setNotice({ kind: 'error', orderId: order.id, text: 'Solo un responsable puede revisar la OT.' }); return; }
    if (order.status !== 'FINALIZADA_TECNICO') { setNotice({ kind: 'error', orderId: order.id, text: 'La OT debe estar finalizada por el técnico para revisarla.' }); return; }
    const notes = window.prompt(action === 'validate' ? 'Nota de validación administrativa:' : 'Indica qué debe corregir el técnico:', action === 'validate' ? 'OT validada desde revisión administrativa.' : '');
    if (!notes?.trim()) return;
    reviewMutation.mutate({ action, order, notes });
  };

  const runEvidenceAction: RunEvidence = (action, order) => {
    if (!canExecuteOrder(order, viewerId, viewerRole)) { setNotice({ kind: 'error', orderId: order.id, text: 'No tienes permisos para preparar evidencias.' }); return; }
    if (action === 'checklist') { evidenceMutation.mutate({ action, order }); return; }
    const filename = window.prompt('Nombre del informe a registrar:', `${order.code}-informe.html`);
    if (!filename?.trim()) return;
    evidenceMutation.mutate({ action, order, filename });
  };

  const runCancelAction = (order: WorkOrderListItem) => {
    if (!isManagerRole(viewerRole)) { setNotice({ kind: 'error', orderId: order.id, text: 'Solo un responsable puede anular OT.' }); return; }
    if (!canCancelWorkOrder(order.status)) { setNotice({ kind: 'error', orderId: order.id, text: 'Esta OT ya no se puede anular desde el flujo seguro.' }); return; }
    const reason = window.prompt(`Motivo de anulación de ${order.code}:`);
    if (!reason?.trim()) return;
    cancelMutation.mutate({ order, reason });
  };

  let content;
  if (query.isLoading) content = <section className="panel data-state"><LoaderCircle className="spin" size={28} /><strong>Cargando órdenes reales…</strong></section>;
  else if (query.error) content = <section className="panel data-state error-state"><AlertTriangle size={28} /><strong>No se pudieron cargar las OT</strong><p>{query.error.message}</p><button className="secondary-button" onClick={() => void query.refetch()} type="button"><RefreshCw size={17} /> Reintentar</button></section>;
  else if (view === 'orders') content = <OrdersPage orders={orders} create={() => openCreate()} open={openDetail} viewerRole={viewerRole} busyOrderId={busyOrderId} cancelOrder={runCancelAction} />;
  else if (view === 'detail') content = <Detail order={selectedOrder} back={() => setView('orders')} create={openCreate} viewerId={viewerId} viewerRole={viewerRole} busyOrderId={busyOrderId} notice={notice} runAction={runLifecycleAction} runReview={runReviewAction} runEvidence={runEvidenceAction} runCancel={runCancelAction} />;
  else if (view === 'create') content = <CreateWorkOrderForm tenantId={tenantId} canManage={isManagerRole(viewerRole)} initialValues={createPreset} onCancel={() => { setCreatePreset(undefined); setView('orders'); }} onCreated={(workOrderId) => { void finishCreate(workOrderId); }} />;
  else if (view === 'planning') content = <Planning orders={orders} open={openDetail} />;
  else if (view === 'technician') content = <Technician orders={orders} viewerId={viewerId} viewerRole={viewerRole} open={openDetail} busyOrderId={busyOrderId} runAction={runLifecycleAction} />;
  else if (isModuleView(view)) content = <ModulePage view={view} orders={orders} catalog={catalogQuery.data} tenantName={tenantName} viewerRole={viewerRole} viewerName={viewerName} auditEvents={auditQuery.data ?? []} auditLoading={auditQuery.isLoading} auditError={auditQuery.error instanceof Error ? auditQuery.error.message : null} busyOrderId={busyOrderId} openDetail={openDetail} create={openCreate} runEvidence={runEvidenceAction} />;
  else content = <Dashboard orders={orders} viewerName={viewerName} openOrders={() => setView('orders')} openDetail={openDetail} />;

  return <div className="app-shell"><Sidebar active={view} open={menuOpen} tenantName={tenantName} viewerRole={viewerRole} navigate={setView} close={() => setMenuOpen(false)} logout={onLogout} /><div className="app-workspace"><Topbar viewerName={viewerName} viewerRole={viewerRole} menu={() => setMenuOpen(true)} create={() => openCreate()} /><main className="main-content">{content}</main></div><MobileNav active={view} navigate={(nextView) => { setCreatePreset(undefined); setView(nextView); }} /></div>;
}
