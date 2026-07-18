import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Home,
  LogOut,
  Menu,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  UsersRound,
  Wrench,
  Zap,
} from 'lucide-react';
import DemoAccessPanel, { type DemoRole } from './features/demo/DemoAccessPanel';
import {
  clearDemoState,
  createDefaultOrderMemory,
  loadDemoState,
  saveDemoState,
  type DemoOrderMemory,
} from './features/demo/demoPersistence';
import {
  DemoAssetsScreen,
  DemoInstallationsScreen,
  DemoReportsScreen,
  DemoTechniciansScreen,
  type DemoInstallationSeed,
} from './features/demo/DemoModuleScreens';
import DemoPlanningScreen from './features/demo/DemoPlanningScreen';
import DemoTechnicianScreen, { type TechnicianQuickAction } from './features/demo/DemoTechnicianScreen';
import type { WorkOrderListItem } from './features/work-orders/api/workOrdersRepository';
import DemoCreateWorkOrder, { type DemoCreateAssetSeed, type DemoCreateInstallationSeed } from './features/work-orders/demo/DemoCreateWorkOrder';
import DemoEditWorkOrder from './features/work-orders/demo/DemoEditWorkOrder';
import PersistentWorkOrderDetailWorkspace from './features/work-orders/demo/PersistentWorkOrderDetailWorkspace';
import { demoWorkOrders, DEMO_TECHNICIAN_ID, DEMO_TENANT_ID } from './features/work-orders/demo/demoWorkOrders';

type DemoView = 'dashboard' | 'orders' | 'planning' | 'technician' | 'technicians' | 'installations' | 'assets' | 'reports' | 'detail' | 'create' | 'edit';
type DetailTab = 'detail' | 'execution' | 'tasks' | 'photos' | 'documents' | 'history';
type OrderStatusFilter = 'all' | 'open' | WorkOrderListItem['status'];

const roleNames: Record<DemoRole, string> = {
  admin_cliente: 'Administrador',
  coordinador: 'Coordinador',
  tecnico: 'Técnico',
  cliente_lectura: 'Solo lectura',
};

const viewerNames: Record<DemoRole, string> = {
  admin_cliente: 'Isi Administrador',
  coordinador: 'Isi Coordinador',
  tecnico: 'Carlos Martínez',
  cliente_lectura: 'Usuario Consulta',
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

const priorityLabels: Record<WorkOrderListItem['priority'], string> = {
  baja: 'Baja',
  normal: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
  critica: 'Crítica',
};

function compactDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit' }).format(new Date(value));
}

function statusClass(status: WorkOrderListItem['status']): string {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function csvValue(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function safeSlug(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'ot';
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function downloadOrdersCsv(orders: WorkOrderListItem[], prefix = 'ordenes-trabajo'): void {
  const headers = ['codigo', 'titulo', 'estado', 'prioridad', 'instalacion', 'ubicacion', 'equipo', 'tecnico', 'fecha_prevista'];
  const rows = orders.map((order) => [
    order.code,
    order.title,
    statusLabels[order.status],
    priorityLabels[order.priority],
    order.siteName,
    order.locationName ?? '',
    order.assetName ?? '',
    order.assignedToName ?? '',
    order.plannedAt ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeSlug(prefix)}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printOrdersReport(orders: WorkOrderListItem[], title = 'Listado de órdenes de trabajo'): void {
  const printable = window.open('', '_blank', 'noopener,noreferrer,width=950,height=720');
  if (!printable) return;
  const rows = orders.map((order) => `<tr><td>${escapeHtml(order.code)}</td><td>${escapeHtml(order.title)}</td><td>${escapeHtml(statusLabels[order.status])}</td><td>${escapeHtml(priorityLabels[order.priority])}</td><td>${escapeHtml(order.siteName)}</td><td>${escapeHtml(order.locationName ?? '')}</td><td>${escapeHtml(order.assetName ?? '')}</td><td>${escapeHtml(order.assignedToName ?? '')}</td><td>${escapeHtml(compactDate(order.plannedAt))}</td></tr>`).join('');
  printable.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 6px}p{color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:11px}th{background:#f8fafc}</style></head><body><h1>${escapeHtml(title)}</h1><p>${orders.length} registros · ${new Date().toLocaleString('es-ES')}</p><table><thead><tr><th>Código</th><th>Trabajo</th><th>Estado</th><th>Prioridad</th><th>Instalación</th><th>Ubicación</th><th>Equipo</th><th>Técnico</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  printable.document.close();
  printable.focus();
  printable.print();
}

function isOpenOrder(order: WorkOrderListItem): boolean {
  return !['VALIDADA', 'CANCELADA'].includes(order.status);
}

function DemoDashboard({
  orders,
  name,
  open,
  navigate,
  create,
  canCreate,
}: {
  orders: WorkOrderListItem[];
  name: string;
  open: (id: string) => void;
  navigate: (view: DemoView) => void;
  create: () => void;
  canCreate: boolean;
}) {
  const openCount = orders.filter(isOpenOrder).length;
  const blocked = orders.filter((order) => order.status === 'BLOQUEADA').length;
  const review = orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length;
  const validated = orders.filter((order) => order.status === 'VALIDADA').length;
  const metrics: Array<{ value: number; label: string; Icon: typeof ClipboardList; tone: string; helper: string; action: () => void }> = [
    { value: openCount, label: 'OT abiertas', Icon: ClipboardList, tone: 'red', helper: 'Abrir listado de OT', action: () => navigate('orders') },
    { value: validated, label: 'OT validadas', Icon: CheckCircle2, tone: 'green', helper: 'Ver informes e histórico', action: () => navigate('reports') },
    { value: review, label: 'Pendientes validar', Icon: CalendarDays, tone: 'orange', helper: 'Revisar informes', action: () => navigate('reports') },
    { value: blocked, label: 'OT bloqueadas', Icon: ShieldCheck, tone: 'purple', helper: 'Revisar planificación', action: () => navigate('planning') },
  ];
  const quickActions: Array<{ label: string; Icon: typeof ClipboardList; action: () => void; enabled: boolean }> = [
    { label: 'Nueva OT', Icon: Plus, action: create, enabled: canCreate },
    { label: 'Planificación', Icon: CalendarDays, action: () => navigate('planning'), enabled: true },
    { label: 'Vista técnico', Icon: Wrench, action: () => navigate('technician'), enabled: true },
    { label: 'Técnicos', Icon: UsersRound, action: () => navigate('technicians'), enabled: true },
    { label: 'Equipos', Icon: Boxes, action: () => navigate('assets'), enabled: true },
    { label: 'Informes', Icon: BarChart3, action: () => navigate('reports'), enabled: true },
  ];

  return (
    <>
      <div className="page-heading page-heading-row">
        <div><span className="section-kicker">Panel central</span><h1>Hola, {name.split(' ')[0]} 👋</h1><p>Dashboard accionable: métricas, accesos rápidos y órdenes recientes abren pantallas reales.</p></div>
        {canCreate && <button className="primary-button" onClick={create} type="button"><Plus size={18} /> Nueva OT</button>}
      </div>
      <section className="metrics-grid dashboard-clickable-metrics">
        {metrics.map(({ value, label, Icon, tone, helper, action }) => (
          <button className="metric-card dashboard-metric-button" key={label} onClick={action} type="button">
            <span className={`metric-icon tone-${tone}`}><Icon size={23} /></span>
            <div className="metric-content"><strong>{value}</strong><span>{label}</span><small>{helper}</small></div>
            <ChevronRight size={17} />
          </button>
        ))}
      </section>
      <section className="dashboard-grid dashboard-grid-top demo-dashboard-grid">
        <article className="panel recent-orders-panel">
          <div className="panel-heading"><h2>Órdenes recientes</h2><button className="filter-button" onClick={() => navigate('orders')} type="button">Ver todas <ChevronRight size={15} /></button></div>
          <div className="recent-order-list">{orders.slice(0, 6).map((order) => <button className="recent-order" key={order.id} onClick={() => open(order.id)} type="button"><span className="order-icon"><Wrench size={20} /></span><span className="order-main"><strong>{order.code}</strong><span>{order.title}</span><small>{order.siteName} · {order.locationName}</small></span><span className="order-meta"><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><small>{compactDate(order.plannedAt)}</small></span></button>)}</div>
        </article>
        <article className="panel source-panel dashboard-action-panel">
          <div className="panel-heading"><h2>Accesos rápidos</h2><Zap size={22} /></div>
          <div className="dashboard-quick-actions">{quickActions.filter((item) => item.enabled).map(({ label, Icon, action }) => <button key={label} onClick={action} type="button"><Icon size={17} /> {label}</button>)}</div>
          <div className="source-checks"><span><CheckCircle2 size={17} /> Cada acceso navega o crea datos reales de la demo</span><span><CheckCircle2 size={17} /> Las órdenes recientes abren su ficha completa</span><span><CheckCircle2 size={17} /> Los cambios quedan guardados en este navegador</span></div>
        </article>
      </section>
    </>
  );
}

function DemoOrders({ orders, open, create, canCreate }: { orders: WorkOrderListItem[]; open: (id: string) => void; create: () => void; canCreate: boolean }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatusFilter>('all');
  const [priority, setPriority] = useState<'all' | WorkOrderListItem['priority']>('all');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !term || [order.code, order.title, order.locationName, order.assignedToName, order.assetName, order.siteName].some((value) => value?.toLowerCase().includes(term));
      const matchesStatus = status === 'all' || (status === 'open' ? isOpenOrder(order) : order.status === status);
      return matchesText && matchesStatus && (priority === 'all' || order.priority === priority);
    });
  }, [orders, priority, search, status]);

  const orderMetrics: Array<{ label: string; value: number; filter: OrderStatusFilter; Icon: typeof ClipboardList }> = [
    { label: 'Todas', value: orders.length, filter: 'all', Icon: ClipboardList },
    { label: 'Abiertas', value: orders.filter(isOpenOrder).length, filter: 'open', Icon: Wrench },
    { label: 'Bloqueadas', value: orders.filter((order) => order.status === 'BLOQUEADA').length, filter: 'BLOQUEADA', Icon: ShieldCheck },
    { label: 'Por validar', value: orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length, filter: 'FINALIZADA_TECNICO', Icon: CalendarDays },
    { label: 'Validadas', value: orders.filter((order) => order.status === 'VALIDADA').length, filter: 'VALIDADA', Icon: CheckCircle2 },
  ];

  const clearFilters = () => { setSearch(''); setStatus('all'); setPriority('all'); };
  const reportName = status === 'all' ? 'Listado completo de OT' : status === 'open' ? 'OT abiertas' : `OT · ${statusLabels[status]}`;

  return (
    <>
      <div className="page-heading page-heading-row">
        <div><span className="section-kicker">Gestión diaria</span><h1>Órdenes de trabajo</h1><p>{filtered.length} de {orders.length} órdenes ficticias.</p></div>
        {canCreate && <button className="primary-button" onClick={create} type="button"><Plus size={18} /> Nueva OT</button>}
      </div>
      <section className="orders-quick-filter-grid">
        {orderMetrics.map(({ label, value, filter, Icon }) => (
          <button className={status === filter ? 'active' : ''} key={label} onClick={() => setStatus(filter)} type="button">
            <Icon size={17} />
            <span><strong>{value}</strong><small>{label}</small></span>
          </button>
        ))}
      </section>
      <section className="panel table-panel orders-action-panel">
        <div className="filters-row demo-filters-row">
          <label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar OT, título, equipo, instalación o ubicación" value={search} /></label>
          <select aria-label="Filtrar por estado" onChange={(event) => setStatus(event.target.value as OrderStatusFilter)} value={status}>
            <option value="all">Todos los estados</option>
            <option value="open">Todas las abiertas</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select aria-label="Filtrar por prioridad" onChange={(event) => setPriority(event.target.value as typeof priority)} value={priority}>
            <option value="all">Todas las prioridades</option>
            {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="filter-button" onClick={clearFilters} type="button"><RotateCcw size={15} /> Limpiar</button>
          <button className="filter-button" onClick={() => downloadOrdersCsv(filtered, reportName)} type="button"><Download size={15} /> CSV</button>
          <button className="filter-button" onClick={() => printOrdersReport(filtered, reportName)} type="button"><Printer size={15} /> Imprimir</button>
        </div>
        <div className="orders-table">
          <div className="orders-table-row orders-table-head"><span>ID</span><span>Trabajo</span><span>Instalación / ubicación</span><span>Técnico</span><span>Estado</span><span>Prioridad</span><span>Fecha</span><span /></div>
          {filtered.length === 0 ? <p className="empty-table">No hay órdenes que coincidan con los filtros.</p> : filtered.map((order) => <button className="orders-table-row" key={order.id} onClick={() => open(order.id)} type="button"><strong>{order.code}</strong><span>{order.title}</span><span>{order.siteName} · {order.locationName}</span><span>{order.assignedToName ?? 'Sin asignar'}</span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i></span><span>{priorityLabels[order.priority]}</span><span>{compactDate(order.plannedAt)}</span><span><ChevronRight size={17} /></span></button>)}
        </div>
      </section>
    </>
  );
}

function toCreateInstallationSeed(installation: DemoInstallationSeed): DemoCreateInstallationSeed {
  return {
    siteId: installation.siteId,
    siteName: installation.siteName,
    locationId: installation.locationId,
    locationName: installation.locationName,
  };
}

export default function DemoApp() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const [view, setView] = useState<DemoView>('dashboard');
  const [state, setState] = useState(() => loadDemoState(demoWorkOrders));
  const [selectedId, setSelectedId] = useState('');
  const [detailTab, setDetailTab] = useState<DetailTab>('detail');
  const [menuOpen, setMenuOpen] = useState(false);
  const [createAsset, setCreateAsset] = useState<DemoCreateAssetSeed | null>(null);
  const [createInstallation, setCreateInstallation] = useState<DemoCreateInstallationSeed | null>(null);

  useEffect(() => saveDemoState(state), [state]);

  if (!role) return <DemoAccessPanel onStart={(nextRole) => { setRole(nextRole); setView(nextRole === 'tecnico' ? 'technician' : 'dashboard'); }} />;

  const orders = state.orders;
  const viewerName = viewerNames[role];
  const canManage = role === 'admin_cliente' || role === 'coordinador';
  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const selectedMemory = selected ? state.memory[selected.id] ?? createDefaultOrderMemory(selected) : null;
  const open = (id: string) => { setSelectedId(id); setDetailTab('detail'); setView('detail'); };
  const openCreate = (context?: { asset?: DemoCreateAssetSeed | null; installation?: DemoCreateInstallationSeed | null }) => {
    setCreateAsset(context?.asset ?? null);
    setCreateInstallation(context?.installation ?? null);
    setView('create');
    setMenuOpen(false);
  };
  const navigate = (next: DemoView) => {
    if (next !== 'create') {
      setCreateAsset(null);
      setCreateInstallation(null);
    }
    setView(next);
    setMenuOpen(false);
  };
  const updateOrder = (orderId: string, changes: Partial<WorkOrderListItem>) => setState((current) => ({ ...current, orders: current.orders.map((order) => order.id === orderId ? { ...order, ...changes } : order) }));
  const updateMemory = (orderId: string, updater: (current: DemoOrderMemory) => DemoOrderMemory) => setState((current) => {
    const order = current.orders.find((item) => item.id === orderId);
    if (!order) return current;
    const existing = current.memory[orderId] ?? createDefaultOrderMemory(order);
    return { ...current, memory: { ...current.memory, [orderId]: updater(existing) } };
  });
  const addHistory = (orderId: string, title: string, detail: string) => updateMemory(orderId, (current) => ({ ...current, history: [...current.history, { id: newId(), title, detail, date: new Date().toISOString() }] }));
  const resetDemo = () => {
    if (!window.confirm('¿Restablecer todas las órdenes y evidencias de la demostración?')) return;
    clearDemoState();
    setState(loadDemoState(demoWorkOrders));
    setSelectedId('');
    setCreateAsset(null);
    setCreateInstallation(null);
    setView('dashboard');
  };
  const runTechnicianAction = (order: WorkOrderListItem, action: TechnicianQuickAction) => {
    const now = new Date().toISOString();
    const nextStatusByAction: Record<TechnicianQuickAction, WorkOrderListItem['status']> = {
      accept: 'ACEPTADA',
      start: 'EN_CURSO',
      pause: 'BLOQUEADA',
      finish: 'FINALIZADA_TECNICO',
    };
    const titleByAction: Record<TechnicianQuickAction, string> = {
      accept: 'OT aceptada',
      start: 'Trabajo iniciado',
      pause: 'Trabajo pausado',
      finish: 'Trabajo finalizado',
    };
    updateOrder(order.id, {
      status: nextStatusByAction[action],
      updatedAt: now,
      blockReason: action === 'pause' ? 'OTRO' : action === 'start' ? null : order.blockReason,
      blockNotes: action === 'pause' ? 'Pausado desde la vista técnico.' : action === 'start' ? null : order.blockNotes,
    });
    if (action === 'finish') {
      updateMemory(order.id, (current) => ({
        ...current,
        technicianSignature: true,
        timeSpentMinutes: Math.max(current.timeSpentMinutes, order.estimatedMinutes ?? 45),
        history: [...current.history, { id: newId(), title: titleByAction[action], detail: 'El técnico deja la OT pendiente de validación responsable.', date: now }],
      }));
      return;
    }
    addHistory(order.id, titleByAction[action], `${titleByAction[action]} desde la vista de jornada técnico.`);
  };

  let content;
  if (view === 'orders') content = <DemoOrders canCreate={canManage} orders={orders} open={open} create={() => openCreate()} />;
  else if (view === 'planning') content = <DemoPlanningScreen orders={orders} open={open} onReschedule={(orderId, plannedAt, dueAt, note) => { updateOrder(orderId, { plannedAt, dueAt, updatedAt: new Date().toISOString() }); addHistory(orderId, 'Planificación actualizada', note); }} />;
  else if (view === 'technician') content = <DemoTechnicianScreen orders={orders} technicianId={DEMO_TECHNICIAN_ID} technicianName="Carlos Martínez" open={open} onQuickAction={runTechnicianAction} />;
  else if (view === 'technicians') content = <DemoTechniciansScreen orders={orders} open={open} />;
  else if (view === 'installations') content = <DemoInstallationsScreen orders={orders} open={open} onCreateFromInstallation={(installation) => openCreate({ installation: toCreateInstallationSeed(installation) })} />;
  else if (view === 'assets') content = <DemoAssetsScreen orders={orders} open={open} onCreateFromAsset={(asset) => openCreate({ asset })} />;
  else if (view === 'reports') content = <DemoReportsScreen orders={orders} open={open} />;
  else if (view === 'detail') content = <PersistentWorkOrderDetailWorkspace activeTab={detailTab} memory={selectedMemory} onBack={() => setView('orders')} onEdit={() => setView('edit')} onTabChange={setDetailTab} onUpdateMemory={(updater) => selected && updateMemory(selected.id, updater)} onUpdateOrder={(changes) => selected && updateOrder(selected.id, changes)} order={selected} viewerRole={role} />;
  else if (view === 'edit' && selected && canManage) content = <DemoEditWorkOrder order={selected} onCancel={() => setView('detail')} onSave={(changes) => { updateOrder(selected.id, changes); addHistory(selected.id, 'Orden editada', `Cambios guardados por ${roleNames[role]}.`); setView('detail'); }} />;
  else if (view === 'create' && canManage) content = <DemoCreateWorkOrder initialAsset={createAsset} initialInstallation={createInstallation} tenantId={DEMO_TENANT_ID} orders={orders} onCancel={() => { const backView: DemoView = createAsset ? 'assets' : createInstallation ? 'installations' : 'orders'; setCreateAsset(null); setCreateInstallation(null); setView(backView); }} onCreate={(order) => { setState((current) => ({ ...current, orders: [order, ...current.orders], memory: { ...current.memory, [order.id]: createDefaultOrderMemory(order) } })); setCreateAsset(null); setCreateInstallation(null); setSelectedId(order.id); setDetailTab('detail'); setView('detail'); }} />;
  else content = <DemoDashboard canCreate={canManage} create={() => openCreate()} navigate={navigate} orders={orders} name={viewerName} open={open} />;

  const navigation = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'orders' as const, label: 'Órdenes de trabajo', icon: ClipboardList },
    { id: 'planning' as const, label: 'Planificación', icon: CalendarDays },
    { id: 'technician' as const, label: 'Vista técnico', icon: Wrench },
  ];
  const moduleNavigation = [
    { id: 'technicians' as const, label: 'Técnicos', icon: UsersRound },
    { id: 'installations' as const, label: 'Instalaciones', icon: Building2 },
    { id: 'assets' as const, label: 'Equipos', icon: Boxes },
    { id: 'reports' as const, label: 'Informes', icon: BarChart3 },
  ];

  return <div className="app-shell"><button className={`sidebar-backdrop ${menuOpen ? 'visible' : ''}`} onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" /><aside className={`sidebar ${menuOpen ? 'open' : ''}`}><div className="sidebar-brand-row"><div className="brand"><span className="brand-symbol"><Zap size={25} /></span><div><strong>IsiVoltPro OT</strong><span>Prototipo sin Supabase</span></div></div></div><nav className="sidebar-nav"><span className="nav-caption">Panel demo</span>{navigation.map(({ id, label, icon: Icon }) => <button className={`nav-item ${view === id ? 'active' : ''}`} key={id} onClick={() => navigate(id)} type="button"><Icon size={19} /><span>{label}</span></button>)}<span className="nav-caption nav-caption-spaced">Módulos conectados</span>{moduleNavigation.map(({ id, label, icon: Icon }) => <button className={`nav-item ${view === id ? 'active' : ''}`} key={id} onClick={() => navigate(id)} type="button"><Icon size={19} /><span>{label}</span></button>)}</nav><div className="sidebar-footer"><div className="organisation-card"><span className="avatar avatar-small">OT</span><span><strong>Hospital PTS · Demo</strong><small>{roleNames[role]}</small></span></div><button className="logout-button demo-reset-button" onClick={resetDemo} type="button"><RotateCcw size={18} /> Restablecer demo</button><button className="logout-button" onClick={() => setRole(null)} type="button"><LogOut size={18} /> Cambiar perfil</button></div></aside><div className="app-workspace"><header className="topbar"><button className="icon-button menu-button" onClick={() => setMenuOpen(true)} type="button"><Menu size={21} /></button><div className="demo-topbar-title"><strong>{viewerName}</strong><small>{roleNames[role]} · Demo operativo</small></div><div className="topbar-actions">{canManage && <button className="primary-button top-create" onClick={() => openCreate()} type="button"><Plus size={18} /> Nueva OT</button>}</div></header><main className="main-content"><div className="demo-context-banner"><ShieldCheck size={17} /><span><strong>Modo demo local:</strong> todo lo visible en pantalla tiene navegación o acción funcional.</span></div>{content}</main></div></div>;
}
