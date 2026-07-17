import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Plus,
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
import type { WorkOrderListItem } from './features/work-orders/api/workOrdersRepository';
import DemoCreateWorkOrder from './features/work-orders/demo/DemoCreateWorkOrder';
import DemoEditWorkOrder from './features/work-orders/demo/DemoEditWorkOrder';
import PersistentWorkOrderDetailWorkspace from './features/work-orders/demo/PersistentWorkOrderDetailWorkspace';
import { demoWorkOrders, DEMO_TECHNICIAN_ID, DEMO_TENANT_ID } from './features/work-orders/demo/demoWorkOrders';

type DemoView = 'dashboard' | 'orders' | 'planning' | 'technician' | 'detail' | 'create' | 'edit';
type DetailTab = 'detail' | 'execution' | 'tasks' | 'photos' | 'documents' | 'history';

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

function DemoDashboard({ orders, name, open }: { orders: WorkOrderListItem[]; name: string; open: (id: string) => void }) {
  const openCount = orders.filter((order) => !['VALIDADA', 'CANCELADA'].includes(order.status)).length;
  const blocked = orders.filter((order) => order.status === 'BLOQUEADA').length;
  const review = orders.filter((order) => order.status === 'FINALIZADA_TECNICO').length;
  const validated = orders.filter((order) => order.status === 'VALIDADA').length;
  return (
    <>
      <div className="page-heading"><span className="section-kicker">Panel central</span><h1>Hola, {name.split(' ')[0]} 👋</h1><p>Prototipo operativo con datos ficticios guardados en este navegador.</p></div>
      <section className="metrics-grid">
        {[
          [openCount, 'OT abiertas', ClipboardList, 'red'],
          [validated, 'OT validadas', CheckCircle2, 'green'],
          [review, 'Pendientes validar', CalendarDays, 'orange'],
          [blocked, 'OT bloqueadas', ShieldCheck, 'purple'],
        ].map(([value, label, Icon, tone]) => {
          const MetricIcon = Icon as typeof ClipboardList;
          return <article className="metric-card" key={String(label)}><span className={`metric-icon tone-${tone}`}><MetricIcon size={23} /></span><div className="metric-content"><strong>{String(value)}</strong><span>{String(label)}</span><small>Persistencia local activa</small></div></article>;
        })}
      </section>
      <section className="dashboard-grid dashboard-grid-top demo-dashboard-grid">
        <article className="panel recent-orders-panel">
          <div className="panel-heading"><h2>Órdenes recientes</h2><span className="demo-data-badge">Guardado local</span></div>
          <div className="recent-order-list">{orders.slice(0, 6).map((order) => <button className="recent-order" key={order.id} onClick={() => open(order.id)} type="button"><span className="order-icon"><Wrench size={20} /></span><span className="order-main"><strong>{order.code}</strong><span>{order.title}</span><small>{order.siteName} · {order.locationName}</small></span><span className="order-meta"><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><small>{compactDate(order.plannedAt)}</small></span></button>)}</div>
        </article>
        <article className="panel source-panel">
          <div className="panel-heading"><h2>Qué puedes probar</h2><Zap size={22} /></div>
          <div className="source-checks"><span><CheckCircle2 size={17} /> Cambiar de perfil</span><span><CheckCircle2 size={17} /> Crear y editar OT</span><span><CheckCircle2 size={17} /> Guardar tareas y evidencias</span><span><CheckCircle2 size={17} /> Imprimir un parte</span></div>
        </article>
      </section>
    </>
  );
}

function DemoOrders({ orders, open, create, canCreate }: { orders: WorkOrderListItem[]; open: (id: string) => void; create: () => void; canCreate: boolean }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | WorkOrderListItem['status']>('all');
  const [priority, setPriority] = useState<'all' | WorkOrderListItem['priority']>('all');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !term || [order.code, order.title, order.locationName, order.assignedToName].some((value) => value?.toLowerCase().includes(term));
      return matchesText && (status === 'all' || order.status === status) && (priority === 'all' || order.priority === priority);
    });
  }, [orders, priority, search, status]);

  const clearFilters = () => { setSearch(''); setStatus('all'); setPriority('all'); };
  return <><div className="page-heading page-heading-row"><div><span className="section-kicker">Gestión diaria</span><h1>Órdenes de trabajo</h1><p>{filtered.length} de {orders.length} órdenes ficticias.</p></div>{canCreate && <button className="primary-button" onClick={create} type="button"><Plus size={18} /> Nueva OT</button>}</div><section className="panel table-panel"><div className="filters-row demo-filters-row"><label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar OT, título o ubicación" value={search} /></label><select aria-label="Filtrar por estado" onChange={(event) => setStatus(event.target.value as typeof status)} value={status}><option value="all">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Filtrar por prioridad" onChange={(event) => setPriority(event.target.value as typeof priority)} value={priority}><option value="all">Todas las prioridades</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="filter-button" onClick={clearFilters} type="button"><RotateCcw size={15} /> Limpiar</button></div><div className="orders-table"><div className="orders-table-row orders-table-head"><span>ID</span><span>Trabajo</span><span>Instalación / ubicación</span><span>Técnico</span><span>Estado</span><span>Prioridad</span><span>Fecha</span><span /></div>{filtered.length === 0 ? <p className="empty-table">No hay órdenes que coincidan con los filtros.</p> : filtered.map((order) => <button className="orders-table-row" key={order.id} onClick={() => open(order.id)} type="button"><strong>{order.code}</strong><span>{order.title}</span><span>{order.siteName} · {order.locationName}</span><span>{order.assignedToName ?? 'Sin asignar'}</span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i></span><span>{priorityLabels[order.priority]}</span><span>{compactDate(order.plannedAt)}</span><span><ChevronRight size={17} /></span></button>)}</div></section></>;
}

function DemoPlanning({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const planned = [...orders].filter((order) => order.plannedAt).sort((a, b) => String(a.plannedAt).localeCompare(String(b.plannedAt)));
  return <><div className="page-heading"><span className="section-kicker">Organización</span><h1>Planificación</h1><p>Agenda simulada guardada en el navegador.</p></div><section className="panel planning-list-panel"><div className="day-plan-list">{planned.map((order) => <button key={order.id} onClick={() => open(order.id)} type="button"><time>{compactDate(order.plannedAt)}</time><span><strong>{order.title}</strong><small>{order.assignedToName ?? 'Sin asignar'} · {order.locationName}</small></span><ChevronRight size={17} /></button>)}</div></section></>;
}

function DemoTechnician({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const own = orders.filter((order) => order.assignedTo === DEMO_TECHNICIAN_ID);
  return <><div className="page-heading"><span className="section-kicker">Zona técnico</span><h1>Mis órdenes asignadas</h1><p>Vista filtrada para Carlos Martínez.</p></div><section className="panel demo-tech-list">{own.map((order) => <button key={order.id} onClick={() => open(order.id)} type="button"><span className="order-icon"><Wrench size={20} /></span><span><strong>{order.code}</strong><b>{order.title}</b><small>{order.locationName}</small></span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i><ChevronRight size={17} /></span></button>)}</section></>;
}

export default function DemoApp() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const [view, setView] = useState<DemoView>('dashboard');
  const [state, setState] = useState(() => loadDemoState(demoWorkOrders));
  const [selectedId, setSelectedId] = useState('');
  const [detailTab, setDetailTab] = useState<DetailTab>('detail');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => saveDemoState(state), [state]);

  if (!role) return <DemoAccessPanel onStart={(nextRole) => { setRole(nextRole); setView(nextRole === 'tecnico' ? 'technician' : 'dashboard'); }} />;

  const orders = state.orders;
  const viewerName = viewerNames[role];
  const canManage = role === 'admin_cliente' || role === 'coordinador';
  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const selectedMemory = selected ? state.memory[selected.id] ?? createDefaultOrderMemory(selected) : null;
  const open = (id: string) => { setSelectedId(id); setDetailTab('detail'); setView('detail'); };
  const navigate = (next: DemoView) => { setView(next); setMenuOpen(false); };
  const updateOrder = (orderId: string, changes: Partial<WorkOrderListItem>) => setState((current) => ({ ...current, orders: current.orders.map((order) => order.id === orderId ? { ...order, ...changes } : order) }));
  const updateMemory = (orderId: string, updater: (current: DemoOrderMemory) => DemoOrderMemory) => setState((current) => {
    const order = current.orders.find((item) => item.id === orderId);
    if (!order) return current;
    const existing = current.memory[orderId] ?? createDefaultOrderMemory(order);
    return { ...current, memory: { ...current.memory, [orderId]: updater(existing) } };
  });
  const addHistory = (orderId: string, title: string, detail: string) => updateMemory(orderId, (current) => ({ ...current, history: [...current.history, { id: crypto.randomUUID(), title, detail, date: new Date().toISOString() }] }));
  const resetDemo = () => {
    if (!window.confirm('¿Restablecer todas las órdenes y evidencias de la demostración?')) return;
    clearDemoState();
    setState(loadDemoState(demoWorkOrders));
    setSelectedId('');
    setView('dashboard');
  };

  let content;
  if (view === 'orders') content = <DemoOrders canCreate={canManage} orders={orders} open={open} create={() => setView('create')} />;
  else if (view === 'planning') content = <DemoPlanning orders={orders} open={open} />;
  else if (view === 'technician') content = <DemoTechnician orders={orders} open={open} />;
  else if (view === 'detail') content = <PersistentWorkOrderDetailWorkspace activeTab={detailTab} memory={selectedMemory} onBack={() => setView('orders')} onEdit={() => setView('edit')} onTabChange={setDetailTab} onUpdateMemory={(updater) => selected && updateMemory(selected.id, updater)} onUpdateOrder={(changes) => selected && updateOrder(selected.id, changes)} order={selected} viewerRole={role} />;
  else if (view === 'edit' && selected && canManage) content = <DemoEditWorkOrder order={selected} onCancel={() => setView('detail')} onSave={(changes) => { updateOrder(selected.id, changes); addHistory(selected.id, 'Orden editada', `Cambios guardados por ${roleNames[role]}.`); setView('detail'); }} />;
  else if (view === 'create' && canManage) content = <DemoCreateWorkOrder tenantId={DEMO_TENANT_ID} orders={orders} onCancel={() => setView('orders')} onCreate={(order) => { setState((current) => ({ ...current, orders: [order, ...current.orders], memory: { ...current.memory, [order.id]: createDefaultOrderMemory(order) } })); setSelectedId(order.id); setDetailTab('detail'); setView('detail'); }} />;
  else content = <DemoDashboard orders={orders} name={viewerName} open={open} />;

  const navigation = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'orders' as const, label: 'Órdenes de trabajo', icon: ClipboardList },
    { id: 'planning' as const, label: 'Planificación', icon: CalendarDays },
    { id: 'technician' as const, label: 'Vista técnico', icon: Wrench },
  ];

  return <div className="app-shell"><button className={`sidebar-backdrop ${menuOpen ? 'visible' : ''}`} onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" /><aside className={`sidebar ${menuOpen ? 'open' : ''}`}><div className="sidebar-brand-row"><div className="brand"><span className="brand-symbol"><Zap size={25} /></span><div><strong>IsiVoltPro OT</strong><span>Prototipo sin Supabase</span></div></div></div><nav className="sidebar-nav"><span className="nav-caption">Panel demo</span>{navigation.map(({ id, label, icon: Icon }) => <button className={`nav-item ${view === id ? 'active' : ''}`} key={id} onClick={() => navigate(id)} type="button"><Icon size={19} /><span>{label}</span></button>)}<span className="nav-caption nav-caption-spaced">Próximos módulos</span><button className="nav-item muted-nav" type="button"><UsersRound size={19} /> Técnicos</button><button className="nav-item muted-nav" type="button"><Building2 size={19} /> Instalaciones</button><button className="nav-item muted-nav" type="button"><BarChart3 size={19} /> Informes</button></nav><div className="sidebar-footer"><div className="organisation-card"><span className="avatar avatar-small">OT</span><span><strong>Hospital PTS · Demo</strong><small>{roleNames[role]}</small></span></div><button className="logout-button demo-reset-button" onClick={resetDemo} type="button"><RotateCcw size={18} /> Restablecer demo</button><button className="logout-button" onClick={() => setRole(null)} type="button"><LogOut size={18} /> Cambiar perfil</button></div></aside><div className="app-workspace"><header className="topbar"><button className="icon-button menu-button" onClick={() => setMenuOpen(true)} type="button"><Menu size={21} /></button><label className="search-box"><Search size={18} /><input placeholder="Buscar en el prototipo..." /><kbd>Local</kbd></label><div className="topbar-actions"><button className="icon-button notification-button" type="button"><Bell size={20} /><span>2</span></button><div className="user-menu"><span className="avatar">{viewerName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span><strong>{viewerName}</strong><small>{roleNames[role]}</small></span></div>{canManage && <button className="primary-button top-create" onClick={() => setView('create')} type="button"><Plus size={18} /> Nueva OT</button>}</div></header><main className="main-content"><div className="demo-context-banner"><ShieldCheck size={17} /><span><strong>Modo demo local:</strong> los cambios permanecen tras recargar y no modifican Supabase.</span></div>{content}</main></div></div>;
}
