import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  ChevronDown,
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
  MapPin,
  Menu,
  MoreHorizontal,
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
import {
  listAccessibleWorkOrders,
  type WorkOrderListItem,
} from './features/work-orders/api/workOrdersRepository';
import type {
  WorkOrderPriority,
  WorkOrderStatus,
} from './features/work-orders/types/workOrder';

type View =
  | 'dashboard'
  | 'orders'
  | 'planning'
  | 'detail'
  | 'create'
  | 'technician'
  | 'technicians'
  | 'clients'
  | 'assets'
  | 'reports'
  | 'audit'
  | 'checklists'
  | 'templates'
  | 'catalogs'
  | 'settings';

type NavigationItem = { id: View; label: string; icon: LucideIcon };

type AppProps = {
  tenantId: string;
  tenantName: string;
  viewerId: string;
  viewerName: string;
  viewerRole: string;
  onLogout: () => void;
};

const mainNavigation: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'orders', label: 'Órdenes de trabajo', icon: ClipboardList },
  { id: 'planning', label: 'Planificación', icon: CalendarDays },
  { id: 'technician', label: 'Vista técnico', icon: Wrench },
];

const secondaryNavigation: NavigationItem[] = [
  { id: 'technicians', label: 'Técnicos', icon: UsersRound },
  { id: 'clients', label: 'Clientes / Instalaciones', icon: Building2 },
  { id: 'assets', label: 'Equipos', icon: Boxes },
  { id: 'reports', label: 'Informes', icon: BarChart3 },
  { id: 'audit', label: 'Auditoría', icon: ShieldCheck },
];

const configurationNavigation: NavigationItem[] = [
  { id: 'checklists', label: 'Checklists', icon: ListChecks },
  { id: 'templates', label: 'Plantillas', icon: Files },
  { id: 'catalogs', label: 'Catálogos', icon: SlidersHorizontal },
  { id: 'settings', label: 'Ajustes', icon: Settings },
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

const templateNames = [
  'Revisión preventiva FV',
  'Medición de strings',
  'Cuadro DC / AC',
  'Contador bidireccional',
  'Limpieza de módulos',
];

const statusClass = (status: WorkOrderStatus) =>
  `status status-${status.toLowerCase().replaceAll('_', '-')}`;

const priorityClass = (priority: WorkOrderPriority) => {
  if (priority === 'normal') return 'priority-media';
  if (priority === 'urgente' || priority === 'critica') return 'priority-alta';
  return `priority-${priority}`;
};

function displayDate(value: string | null): string {
  if (!value) return 'Sin planificar';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function compactDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function iconForOrder(order: WorkOrderListItem): LucideIcon {
  if (order.status === 'BLOQUEADA') return AlertTriangle;
  if (order.status === 'VALIDADA') return CheckCircle2;
  if (order.type === 'inspeccion' || order.type === 'revision') return FileCheck2;
  if (order.type === 'instalacion') return Boxes;
  return Wrench;
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin_cliente: 'Administrador',
    coordinador: 'Coordinador',
    tecnico: 'Técnico',
    tecnico_externo: 'Técnico externo',
    cliente_lectura: 'Solo lectura',
  };
  return labels[role] ?? role;
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol"><Zap size={25} strokeWidth={2.8} /></span>
      <div><strong>IsiVoltPro OT</strong><span>Gestión de órdenes de trabajo</span></div>
    </div>
  );
}

function Sidebar({
  active,
  open,
  tenantName,
  viewerRole,
  navigate,
  close,
  logout,
}: {
  active: View;
  open: boolean;
  tenantName: string;
  viewerRole: string;
  navigate: (view: View) => void;
  close: () => void;
  logout: () => void;
}) {
  const renderItem = ({ id, label, icon: Icon }: NavigationItem, muted = false) => (
    <button
      className={`nav-item ${active === id ? 'active' : ''} ${muted ? 'muted-nav' : ''}`}
      key={id}
      onClick={() => { navigate(id); close(); }}
      type="button"
    >
      <Icon size={19} /><span>{label}</span>
    </button>
  );

  return (
    <>
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
          <div className="organisation-card"><span className="avatar avatar-small">OT</span><span><strong>{tenantName}</strong><small>{roleLabel(viewerRole)}</small></span><ChevronDown size={17} /></div>
          <button className="logout-button" onClick={logout} type="button"><LogOut size={18} /> Cerrar sesión</button>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  viewerName,
  viewerRole,
  menu,
  create,
}: {
  viewerName: string;
  viewerRole: string;
  menu: () => void;
  create: () => void;
}) {
  const initials = viewerName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={menu} aria-label="Abrir menú"><Menu size={21} /></button>
      <label className="search-box"><Search size={18} /><input placeholder="Buscar OT, equipo, ubicación..." /><kbd>⌘K</kbd></label>
      <div className="topbar-actions">
        <button className="icon-button notification-button" type="button"><Bell size={20} /><span>0</span></button>
        <div className="user-menu"><span className="avatar">{initials || 'U'}</span><span><strong>{viewerName}</strong><small>{roleLabel(viewerRole)}</small></span><ChevronDown size={17} /></div>
        <button className="primary-button top-create" onClick={create} type="button"><Plus size={18} /> Nueva OT</button>
      </div>
    </header>
  );
}

function LoadingOrders() {
  return <section className="panel data-state"><LoaderCircle className="spin" size={28} /><strong>Cargando órdenes reales…</strong><p>La consulta está limitada por las políticas RLS de tu cuenta.</p></section>;
}

function OrdersError({ message, retry }: { message: string; retry: () => void }) {
  return <section className="panel data-state error-state"><AlertTriangle size={28} /><strong>No se pudieron cargar las OT</strong><p>{message}</p><button className="secondary-button" onClick={retry} type="button"><RefreshCw size={17} /> Reintentar</button></section>;
}

function Metrics({ orders }: { orders: WorkOrderListItem[] }) {
  const items = [
    { value: orders.filter((order) => !['VALIDADA', 'CANCELADA'].includes(order.status)).length, label: 'OT abiertas', detail: 'Visibles para tu cuenta', icon: ClipboardList, tone: 'red' },
    { value: orders.filter((order) => order.status === 'VALIDADA').length, label: 'OT validadas', detail: 'Cerradas correctamente', icon: CheckCircle2, tone: 'green' },
    { value: orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length, label: 'Pendientes validar', detail: 'Requieren revisión', icon: Clock3, tone: 'orange' },
    { value: orders.filter((order) => order.status === 'BLOQUEADA').length, label: 'OT bloqueadas', detail: 'Requieren atención', icon: AlertTriangle, tone: 'purple' },
  ] as const;

  return <section className="metrics-grid">{items.map(({ value, label, detail, icon: Icon, tone }) => <article className="metric-card" key={label}><span className={`metric-icon tone-${tone}`}><Icon size={23} /></span><div className="metric-content"><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></article>)}</section>;
}

function RecentOrders({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  return (
    <article className="panel recent-orders-panel">
      <div className="panel-heading"><h2>OT recientes</h2><span className="source-badge">Datos reales</span></div>
      {orders.length === 0 ? <p className="empty-state">No hay órdenes visibles en esta organización.</p> : (
        <div className="recent-order-list">{orders.slice(0, 5).map((order) => {
          const Icon = iconForOrder(order);
          return <button className="recent-order" key={order.id} onClick={() => open(order.id)} type="button"><span className="order-icon"><Icon size={20} /></span><span className="order-main"><strong>{order.code}</strong><span>{order.title}</span><small>{order.siteName}{order.locationName ? ` · ${order.locationName}` : ''}</small></span><span className="order-meta"><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><small>{compactDate(order.plannedAt)}</small></span></button>;
        })}</div>
      )}
    </article>
  );
}

function Dashboard({
  orders,
  viewerName,
  openOrders,
  openDetail,
}: {
  orders: WorkOrderListItem[];
  viewerName: string;
  openOrders: () => void;
  openDetail: (id: string) => void;
}) {
  const counts = useMemo(() => {
    const result = new Map<WorkOrderStatus, number>();
    for (const order of orders) result.set(order.status, (result.get(order.status) ?? 0) + 1);
    return result;
  }, [orders]);
  const technicians = useMemo(() => {
    const result = new Map<string, number>();
    for (const order of orders) {
      const name = order.assignedToName ?? 'Sin asignar';
      result.set(name, (result.get(name) ?? 0) + 1);
    }
    return [...result.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5);
  }, [orders]);
  const priorityCounts = useMemo(() => {
    const result = new Map<WorkOrderPriority, number>();
    for (const order of orders) result.set(order.priority, (result.get(order.priority) ?? 0) + 1);
    return result;
  }, [orders]);
  const planned = orders.filter((order) => order.plannedAt).slice(0, 3);
  const total = Math.max(orders.length, 1);

  return (
    <>
      <div className="page-heading"><span className="section-kicker">Panel central</span><h1>Hola, {viewerName.split(' ')[0]} 👋</h1><p>Resumen real de las órdenes visibles para tu cuenta.</p></div>
      <Metrics orders={orders} />
      <section className="dashboard-grid dashboard-grid-top">
        <article className="panel orders-status-panel">
          <div className="panel-heading"><h2>Estado de órdenes</h2><span className="source-badge">RLS activo</span></div>
          <div className="donut-layout"><div className="donut"><div><strong>{orders.length}</strong><span>Órdenes</span></div></div><ul className="legend-list">{(['ASIGNADA', 'EN_CURSO', 'FINALIZADA_TECNICO', 'BLOQUEADA', 'VALIDADA'] as const).map((status, index) => <li key={status}><i className={['legend-red', 'legend-orange', 'legend-purple', 'legend-gray', 'legend-green'][index]} /><span>{statusLabels[status]}</span><strong>{counts.get(status) ?? 0}</strong><small>{Math.round(((counts.get(status) ?? 0) / total) * 100)}%</small></li>)}</ul></div>
          <button className="text-link panel-link" onClick={openOrders} type="button">Ver listado <ChevronRight size={15} /></button>
        </article>
        <RecentOrders orders={orders} open={openDetail} />
        <div className="right-stack">
          <article className="panel activity-panel source-panel"><div className="panel-heading"><h2>Fuente de datos</h2><ShieldCheck size={22} /></div><div className="source-checks"><span><CheckCircle2 size={17} /> Supabase como fuente oficial</span><span><CheckCircle2 size={17} /> Filtrado por organización</span><span><CheckCircle2 size={17} /> Permisos aplicados por RLS</span><span><CheckCircle2 size={17} /> Sin datos de demostración</span></div></article>
          <article className="panel alert-panel"><div className="panel-heading"><h2>Atención</h2></div><div className="alert-row"><span className="activity-icon tone-red"><AlertTriangle size={17} /></span><span><strong>{counts.get('BLOQUEADA') ?? 0} OT bloqueadas</strong><button className="text-link" onClick={openOrders} type="button">Revisar</button></span></div><div className="alert-row"><span className="activity-icon tone-orange"><Clock3 size={17} /></span><span><strong>{counts.get('FINALIZADA_TECNICO') ?? 0} pendientes de validación</strong><button className="text-link" onClick={openOrders} type="button">Abrir listado</button></span></div></article>
        </div>
      </section>
      <section className="dashboard-grid dashboard-grid-bottom">
        <article className="panel workload-panel"><div className="panel-heading"><h2>Carga visible por técnico</h2></div>{technicians.length === 0 ? <p className="empty-state">Sin asignaciones.</p> : <div className="workload-list">{technicians.map(([name, amount]) => <div className="workload-row" key={name}><span className="avatar avatar-mini">{name === 'Sin asignar' ? '—' : name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><strong>{name}</strong><div className="progress"><i style={{ width: `${Math.min(100, Math.round((amount / total) * 100))}%` }} /></div><b>{amount} OT</b><small>{Math.round((amount / total) * 100)}%</small></div>)}</div>}</article>
        <article className="panel priority-panel"><div className="panel-heading"><h2>OT por prioridad</h2></div><div className="priority-list">{(['alta', 'urgente', 'normal', 'baja'] as const).map((priority) => { const amount = priorityCounts.get(priority) ?? 0; return <div key={priority}><span>{priorityLabels[priority]}</span><strong>{amount} <small>{Math.round((amount / total) * 100)}%</small></strong><div className="priority-track"><i className={priorityClass(priority)} style={{ width: `${Math.round((amount / total) * 100)}%` }} /></div></div>; })}</div></article>
        <article className="panel calendar-panel"><div className="panel-heading"><div><h2>Próximas OT</h2><strong className="calendar-date">Planificación real</strong></div></div><div className="agenda-list">{planned.length === 0 ? <p className="empty-state">No hay fechas previstas.</p> : planned.map((order, index) => <button className={`agenda-item ${index === 1 ? 'orange' : index === 2 ? 'green' : 'red'}`} key={order.id} onClick={() => openDetail(order.id)} type="button"><time>{compactDate(order.plannedAt)}</time><span><strong>{order.title}</strong><small>{order.assignedToName ?? 'Sin asignar'} · {order.siteName}</small></span></button>)}</div></article>
      </section>
      <button className="mobile-wide-action" onClick={openOrders} type="button">Ver todas las órdenes <ChevronRight size={17} /></button>
    </>
  );
}

function OrdersPage({
  orders,
  open,
  create,
}: {
  orders: WorkOrderListItem[];
  open: (id: string) => void;
  create: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => [order.code, order.title, order.siteName, order.locationName, order.assignedToName].some((value) => value?.toLowerCase().includes(term)));
  }, [orders, search]);

  return (
    <><div className="page-heading page-heading-row"><div><span className="section-kicker">Gestión diaria</span><h1>Órdenes de trabajo</h1><p>{filtered.length} órdenes visibles mediante RLS.</p></div><button className="primary-button" onClick={create} type="button"><Plus size={18} /> Nueva OT</button></div><section className="panel table-panel"><div className="filters-row"><label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por ID, título o ubicación" value={search} /></label><span className="source-badge">Datos reales</span></div><div className="orders-table"><div className="orders-table-row orders-table-head"><span>ID</span><span>Trabajo</span><span>Instalación / ubicación</span><span>Técnico</span><span>Estado</span><span>Prioridad</span><span>Fecha</span><span /></div>{filtered.length === 0 ? <p className="empty-table">No hay órdenes que coincidan con la búsqueda.</p> : filtered.map((order) => <button className="orders-table-row" key={order.id} onClick={() => open(order.id)} type="button"><strong>{order.code}</strong><span>{order.title}</span><span>{order.siteName}{order.locationName ? ` · ${order.locationName}` : ''}</span><span>{order.assignedToName ?? 'Sin asignar'}</span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i></span><span><i className={`priority-badge ${priorityClass(order.priority)}`}>{priorityLabels[order.priority]}</i></span><span>{compactDate(order.plannedAt)}</span><span><ChevronRight size={17} /></span></button>)}</div></section></>
  );
}

function Detail({ order, back }: { order: WorkOrderListItem | null; back: () => void }) {
  if (!order) return <section className="panel data-state"><AlertTriangle size={28} /><strong>Orden no disponible</strong><p>Puede haber cambiado la organización activa o tus permisos.</p><button className="secondary-button" onClick={back} type="button">Volver</button></section>;
  return (
    <><div className="detail-header"><button className="back-button" onClick={back} type="button"><ArrowLeft size={18} /> Volver</button><div><span className="section-kicker">Orden de trabajo real</span><h1>{order.code}</h1><p>{order.title}</p></div><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><button className="filter-button detail-actions" type="button">Acciones <ChevronDown size={15} /></button></div><div className="detail-tabs"><button className="active" type="button">Detalle</button><button type="button">Tareas</button><button type="button">Fotos</button><button type="button">Documentos</button><button type="button">Historial</button></div><section className="detail-grid"><article className="panel detail-main-card"><div className="panel-heading"><h2>Información del trabajo</h2><span className={`priority-badge ${priorityClass(order.priority)}`}>{priorityLabels[order.priority]}</span></div><dl className="detail-definition-grid"><div><dt>Instalación</dt><dd>{order.siteName}</dd></div><div><dt>Ubicación</dt><dd>{order.locationName ?? 'Sin ubicación'}</dd></div><div><dt>Tipo</dt><dd>{order.type.replaceAll('_', ' ')}</dd></div><div><dt>Técnico asignado</dt><dd>{order.assignedToName ?? 'Sin asignar'}</dd></div><div><dt>Fecha planificada</dt><dd>{displayDate(order.plannedAt)}</dd></div><div><dt>Tiempo estimado</dt><dd>{order.estimatedMinutes ? `${order.estimatedMinutes} min` : 'No indicado'}</dd></div></dl><div className="description-box"><strong>Descripción</strong><p>{order.description || 'Sin descripción registrada.'}</p></div><div className="evidence-grid"><div><ListChecks size={22} /><strong>{order.requirements.checklist ? 'Checklist requerido' : 'Sin checklist'}</strong><small>Configuración de la OT</small></div><div><ShieldCheck size={22} /><strong>{order.requirements.administrativeReview ? 'Revisión requerida' : 'Revisión no requerida'}</strong><small>Control administrativo</small></div><div><Clock3 size={22} /><strong>{order.dueAt ? displayDate(order.dueAt) : 'Sin fecha límite'}</strong><small>Vencimiento</small></div></div></article><aside className="panel detail-side-card"><h2>Estado actual</h2><div className="timeline"><div className="done"><i /><span><strong>OT creada</strong><small>{displayDate(order.createdAt)}</small></span></div><div className={order.assignedTo ? 'done' : 'current'}><i /><span><strong>{order.assignedTo ? 'Técnico asignado' : 'Pendiente de asignación'}</strong><small>{order.assignedToName ?? 'Sin técnico'}</small></span></div><div className="current"><i /><span><strong>{statusLabels[order.status]}</strong><small>Actualizada {displayDate(order.updatedAt)}</small></span></div></div><p className="read-only-note"><LockKeyhole size={16} /> Vista de lectura. Las transiciones se activarán tras validar las RPC y pruebas RLS.</p></aside></section></>
  );
}

function CreateOrder({ tenantId, canManage, cancel, created }: { tenantId: string; canManage: boolean; cancel: () => void; created: () => void }) {
  return <CreateWorkOrderForm tenantId={tenantId} canManage={canManage} onCancel={cancel} onCreated={created} />;
}

function Planning({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const planned = orders.filter((order) => order.plannedAt).sort((left, right) => String(left.plannedAt).localeCompare(String(right.plannedAt)));
  return <><div className="page-heading"><span className="section-kicker">Organización</span><h1>Planificación real</h1><p>Órdenes con fecha prevista para la organización activa.</p></div><section className="panel planning-list-panel">{planned.length === 0 ? <p className="empty-state">No hay OT planificadas.</p> : <div className="day-plan-list">{planned.map((order) => <button key={order.id} onClick={() => open(order.id)} type="button"><time>{compactDate(order.plannedAt)}</time><span><strong>{order.title}</strong><small>{order.assignedToName ?? 'Sin asignar'} · {order.siteName}</small></span><ChevronRight size={17} /></button>)}</div>}</section></>;
}

function Technician({ orders, viewerId }: { orders: WorkOrderListItem[]; viewerId: string }) {
  const ownOrders = orders.filter((order) => order.assignedTo === viewerId);
  return (
    <section className="technician-preview-page"><div className="technician-description"><span className="section-kicker">Zona técnico real</span><h1>Solo las OT asignadas</h1><p>Esta vista utiliza el usuario autenticado y las mismas políticas RLS de Supabase.</p><div className="technician-benefits"><span><CheckCircle2 size={18} /> {ownOrders.length} OT visibles</span><span><CheckCircle2 size={18} /> Sin acceso a trabajos ajenos</span><span><CheckCircle2 size={18} /> Evidencias guiadas pendientes</span></div></div><div className="phone-shell"><div className="phone-speaker" /><div className="phone-screen"><header className="mobile-header"><Menu size={20} /><strong>IsiVoltPro OT</strong><Bell size={19} /></header><main className="mobile-content"><h2>Mis órdenes</h2><p>{ownOrders.length} trabajos asignados.</p><div className="mobile-metrics"><div><span className="tone-red"><ClipboardList size={19} /></span><strong>{ownOrders.filter((order) => order.status === 'ASIGNADA').length}</strong><small>Asignadas</small></div><div><span className="tone-green"><CheckCircle2 size={19} /></span><strong>{ownOrders.filter((order) => order.status === 'EN_CURSO').length}</strong><small>En curso</small></div><div><span className="tone-orange"><Clock3 size={19} /></span><strong>{ownOrders.filter((order) => order.status === 'FINALIZADA_TECNICO').length}</strong><small>Pendientes</small></div><div><span className="tone-purple"><AlertTriangle size={19} /></span><strong>{ownOrders.filter((order) => order.status === 'BLOQUEADA').length}</strong><small>Bloqueadas</small></div></div><div className="mobile-section-heading"><h3>Mis OT recientes</h3></div><div className="mobile-orders">{ownOrders.length === 0 ? <p className="empty-state">No tienes OT asignadas.</p> : ownOrders.slice(0, 4).map((order) => { const Icon = iconForOrder(order); return <div key={order.id}><span className="order-icon"><Icon size={18} /></span><span><strong>{order.code}</strong><b>{order.title}</b><small><MapPin size={12} /> {order.siteName}</small></span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i><small>{compactDate(order.plannedAt)}</small><ChevronRight size={16} /></span></div>; })}</div></main><nav className="mobile-bottom-nav"><button className="active" type="button"><Home size={19} /><span>Inicio</span></button><button type="button"><ClipboardList size={19} /><span>Mis OT</span></button><button className="mobile-plus" type="button"><Plus size={25} /></button><button type="button"><CalendarDays size={19} /><span>Agenda</span></button><button type="button"><MoreHorizontal size={19} /><span>Más</span></button></nav></div></div></section>
  );
}

function SimpleSummaryPage({
  view,
  orders,
  tenantName,
  viewerRole,
}: {
  view: View;
  orders: WorkOrderListItem[];
  tenantName: string;
  viewerRole: string;
}) {
  const technicians = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) counts.set(order.assignedToName ?? 'Sin asignar', (counts.get(order.assignedToName ?? 'Sin asignar') ?? 0) + 1);
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [orders]);
  const titleByView: Record<View, string> = {
    dashboard: 'Dashboard',
    orders: 'Órdenes de trabajo',
    planning: 'Planificación',
    detail: 'Detalle',
    create: 'Nueva OT',
    technician: 'Vista técnico',
    technicians: 'Técnicos',
    clients: 'Clientes / Instalaciones',
    assets: 'Equipos',
    reports: 'Informes',
    audit: 'Auditoría',
    checklists: 'Checklists',
    templates: 'Plantillas',
    catalogs: 'Catálogos',
    settings: 'Ajustes',
  };

  if (view === 'technicians') {
    return <><div className="page-heading"><span className="section-kicker">Personal</span><h1>Técnicos</h1><p>Resumen de carga visible por técnico.</p></div><section className="panel workload-panel"><div className="panel-heading"><h2>Asignaciones</h2><span className="source-badge">Datos reales</span></div><div className="workload-list">{technicians.length === 0 ? <p className="empty-state">Sin técnicos asignados.</p> : technicians.map(([name, amount]) => <div className="workload-row" key={name}><span className="avatar avatar-mini">{name === 'Sin asignar' ? '—' : name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><strong>{name}</strong><div className="progress"><i style={{ width: `${Math.min(100, amount * 20)}%` }} /></div><b>{amount} OT</b><small>Visibles</small></div>)}</div></section></>;
  }

  if (view === 'clients') {
    return <><div className="page-heading"><span className="section-kicker">Inventario</span><h1>Clientes / Instalaciones</h1><p>{uniqueCount(orders.map((order) => order.siteName))} instalaciones con OT visibles.</p></div><section className="panel planning-list-panel"><div className="day-plan-list">{[...new Set(orders.map((order) => order.siteName))].map((site) => <button key={site} type="button"><Building2 size={18} /><span><strong>{site}</strong><small>{orders.filter((order) => order.siteName === site).length} OT asociadas</small></span><ChevronRight size={17} /></button>)}</div></section></>;
  }

  if (view === 'assets') {
    return <><div className="page-heading"><span className="section-kicker">Inventario técnico</span><h1>Equipos</h1><p>Resumen por tipo de OT/equipo relacionado.</p></div><section className="metrics-grid">{(['mantenimiento_preventivo', 'averia', 'inspeccion', 'revision'] as const).map((type) => <article className="metric-card" key={type}><span className="metric-icon tone-red"><Boxes size={22} /></span><div className="metric-content"><strong>{orders.filter((order) => order.type === type).length}</strong><span>{type.replaceAll('_', ' ')}</span><small>OT visibles</small></div></article>)}</section></>;
  }

  if (view === 'reports') {
    return <><div className="page-heading"><span className="section-kicker">Documentación</span><h1>Informes</h1><p>Estado documental de las órdenes.</p></div><Metrics orders={orders} /><section className="panel source-panel"><div className="source-checks"><span><CheckCircle2 size={17} /> {orders.filter((order) => order.requirements.report).length} OT con informe requerido</span><span><Clock3 size={17} /> {orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length} pendientes de revisión</span><span><ShieldCheck size={17} /> {orders.filter((order) => order.status === 'VALIDADA').length} validadas</span></div></section></>;
  }

  if (view === 'audit') {
    return <><div className="page-heading"><span className="section-kicker">Trazabilidad</span><h1>Auditoría</h1><p>Últimos movimientos derivados de las OT visibles.</p></div><section className="panel planning-list-panel"><div className="day-plan-list">{orders.slice(0, 12).map((order) => <button key={order.id} type="button"><ShieldCheck size={18} /><span><strong>{order.code} · {statusLabels[order.status]}</strong><small>Actualizada {displayDate(order.updatedAt)}</small></span><ChevronRight size={17} /></button>)}</div></section></>;
  }

  if (view === 'checklists') {
    return <><div className="page-heading"><span className="section-kicker">Control técnico</span><h1>Checklists</h1><p>{orders.filter((order) => order.requirements.checklist).length} OT requieren checklist.</p></div><section className="metrics-grid"><article className="metric-card"><span className="metric-icon tone-green"><ListChecks size={22} /></span><div className="metric-content"><strong>{orders.filter((order) => order.requirements.checklist).length}</strong><span>Con checklist</span><small>Requisito activo</small></div></article><article className="metric-card"><span className="metric-icon tone-orange"><Clock3 size={22} /></span><div className="metric-content"><strong>{orders.filter((order) => order.status === 'EN_CURSO').length}</strong><span>En ejecución</span><small>Pendientes de completar</small></div></article></section></>;
  }

  if (view === 'templates') {
    return <><div className="page-heading"><span className="section-kicker">Configuración</span><h1>Plantillas</h1><p>Plantillas operativas para generar OT repetibles.</p></div><section className="panel planning-list-panel"><div className="day-plan-list">{templateNames.map((name) => <button key={name} type="button"><Files size={18} /><span><strong>{name}</strong><small>Plantilla lista para usar en el flujo OT</small></span><ChevronRight size={17} /></button>)}</div></section></>;
  }

  if (view === 'catalogs') {
    return <><div className="page-heading"><span className="section-kicker">Maestros</span><h1>Catálogos</h1><p>Catálogos base de estados, prioridades y tipos.</p></div><section className="metrics-grid"><article className="metric-card"><span className="metric-icon tone-red"><SlidersHorizontal size={22} /></span><div className="metric-content"><strong>{Object.keys(statusLabels).length}</strong><span>Estados OT</span><small>Ciclo de vida</small></div></article><article className="metric-card"><span className="metric-icon tone-orange"><SlidersHorizontal size={22} /></span><div className="metric-content"><strong>{Object.keys(priorityLabels).length}</strong><span>Prioridades</span><small>Clasificación</small></div></article><article className="metric-card"><span className="metric-icon tone-green"><Boxes size={22} /></span><div className="metric-content"><strong>{uniqueCount(orders.map((order) => order.type))}</strong><span>Tipos usados</span><small>Según OT visibles</small></div></article></section></>;
  }

  return <><div className="page-heading"><span className="section-kicker">Cuenta</span><h1>{titleByView[view]}</h1><p>Configuración activa de la sesión.</p></div><section className="panel source-panel"><div className="source-checks"><span><CheckCircle2 size={17} /> Organización: {tenantName}</span><span><UsersRound size={17} /> Rol: {roleLabel(viewerRole)}</span><span><ShieldCheck size={17} /> Datos filtrados por RLS</span><span><Settings size={17} /> Panel preparado para configuración avanzada</span></div></section></>;
}

function MobileNav({ active, navigate }: { active: View; navigate: (view: View) => void }) {
  return <nav className="app-mobile-nav">{mainNavigation.map(({ id, label, icon: Icon }) => <button className={active === id ? 'active' : ''} key={id} onClick={() => navigate(id)} type="button"><Icon size={19} /><span>{label === 'Órdenes de trabajo' ? 'OT' : label.replace('Vista ', '')}</span></button>)}<button className="mobile-create-button" onClick={() => navigate('create')} type="button"><Plus size={24} /></button></nav>;
}

export default function App({
  tenantId,
  tenantName,
  viewerId,
  viewerName,
  viewerRole,
  onLogout,
}: AppProps) {
  const [view, setView] = useState<View>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const query = useQuery({
    queryKey: ['work-orders', tenantId],
    queryFn: () => listAccessibleWorkOrders(getSupabaseClient(), tenantId),
    enabled: Boolean(tenantId),
  });
  const orders = query.data ?? [];
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const openDetail = (id: string) => { setSelectedOrderId(id); setView('detail'); };

  let content;
  if (query.isLoading) content = <LoadingOrders />;
  else if (query.error) content = <OrdersError message={query.error.message} retry={() => void query.refetch()} />;
  else if (view === 'orders') content = <OrdersPage orders={orders} create={() => setView('create')} open={openDetail} />;
  else if (view === 'detail') content = <Detail order={selectedOrder} back={() => setView('orders')} />;
  else if (view === 'create') content = <CreateOrder tenantId={tenantId} canManage={viewerRole === 'admin_cliente'} cancel={() => setView('orders')} created={() => setView('orders')} />;
  else if (view === 'planning') content = <Planning orders={orders} open={openDetail} />;
  else if (view === 'technician') content = <Technician orders={orders} viewerId={viewerId} />;
  else if (['technicians', 'clients', 'assets', 'reports', 'audit', 'checklists', 'templates', 'catalogs', 'settings'].includes(view)) content = <SimpleSummaryPage view={view} orders={orders} tenantName={tenantName} viewerRole={viewerRole} />;
  else content = <Dashboard orders={orders} viewerName={viewerName} openOrders={() => setView('orders')} openDetail={openDetail} />;

  return (
    <div className="app-shell">
      <Sidebar active={view} open={menuOpen} tenantName={tenantName} viewerRole={viewerRole} navigate={setView} close={() => setMenuOpen(false)} logout={onLogout} />
      <div className="app-workspace"><Topbar viewerName={viewerName} viewerRole={viewerRole} menu={() => setMenuOpen(true)} create={() => setView('create')} /><main className="main-content">{content}</main></div>
      <MobileNav active={view} navigate={setView} />
    </div>
  );
}
