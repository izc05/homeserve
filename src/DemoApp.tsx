import { useMemo, useState } from 'react';
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
  Search,
  ShieldCheck,
  UsersRound,
  Wrench,
  Zap,
} from 'lucide-react';
import DemoAccessPanel, { type DemoRole } from './features/demo/DemoAccessPanel';
import type { WorkOrderListItem } from './features/work-orders/api/workOrdersRepository';
import DemoCreateWorkOrder from './features/work-orders/demo/DemoCreateWorkOrder';
import WorkOrderDetailWorkspace from './features/work-orders/demo/WorkOrderDetailWorkspace';
import { demoWorkOrders, DEMO_TECHNICIAN_ID, DEMO_TENANT_ID } from './features/work-orders/demo/demoWorkOrders';

type DemoView = 'dashboard' | 'orders' | 'planning' | 'technician' | 'detail' | 'create';

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
      <div className="page-heading"><span className="section-kicker">Panel central</span><h1>Hola, {name.split(' ')[0]} 👋</h1><p>Prototipo operativo con datos ficticios del entorno hospitalario.</p></div>
      <section className="metrics-grid">
        {[
          [openCount, 'OT abiertas', ClipboardList, 'red'],
          [validated, 'OT validadas', CheckCircle2, 'green'],
          [review, 'Pendientes validar', CalendarDays, 'orange'],
          [blocked, 'OT bloqueadas', ShieldCheck, 'purple'],
        ].map(([value, label, Icon, tone]) => {
          const MetricIcon = Icon as typeof ClipboardList;
          return <article className="metric-card" key={String(label)}><span className={`metric-icon tone-${tone}`}><MetricIcon size={23} /></span><div className="metric-content"><strong>{String(value)}</strong><span>{String(label)}</span><small>Datos de demostración</small></div></article>;
        })}
      </section>
      <section className="dashboard-grid dashboard-grid-top demo-dashboard-grid">
        <article className="panel recent-orders-panel">
          <div className="panel-heading"><h2>Órdenes recientes</h2><span className="demo-data-badge">Demo local</span></div>
          <div className="recent-order-list">
            {orders.slice(0, 6).map((order) => <button className="recent-order" key={order.id} onClick={() => open(order.id)} type="button"><span className="order-icon"><Wrench size={20} /></span><span className="order-main"><strong>{order.code}</strong><span>{order.title}</span><small>{order.siteName} · {order.locationName}</small></span><span className="order-meta"><span className={statusClass(order.status)}>{statusLabels[order.status]}</span><small>{compactDate(order.plannedAt)}</small></span></button>)}
          </div>
        </article>
        <article className="panel source-panel">
          <div className="panel-heading"><h2>Qué puedes probar</h2><Zap size={22} /></div>
          <div className="source-checks"><span><CheckCircle2 size={17} /> Cambiar de perfil</span><span><CheckCircle2 size={17} /> Crear una OT temporal</span><span><CheckCircle2 size={17} /> Simular estados y tareas</span><span><CheckCircle2 size={17} /> Revisar vista móvil</span></div>
        </article>
      </section>
    </>
  );
}

function DemoOrders({ orders, open, create }: { orders: WorkOrderListItem[]; open: (id: string) => void; create: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => [order.code, order.title, order.locationName, order.assignedToName].some((value) => value?.toLowerCase().includes(term)));
  }, [orders, search]);
  return <><div className="page-heading page-heading-row"><div><span className="section-kicker">Gestión diaria</span><h1>Órdenes de trabajo</h1><p>{filtered.length} órdenes ficticias disponibles.</p></div><button className="primary-button" onClick={create} type="button"><Plus size={18} /> Nueva OT</button></div><section className="panel table-panel"><div className="filters-row"><label className="table-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar OT, título o ubicación" value={search} /></label><span className="demo-data-badge">Modo demo</span></div><div className="orders-table"><div className="orders-table-row orders-table-head"><span>ID</span><span>Trabajo</span><span>Instalación / ubicación</span><span>Técnico</span><span>Estado</span><span>Prioridad</span><span>Fecha</span><span /></div>{filtered.map((order) => <button className="orders-table-row" key={order.id} onClick={() => open(order.id)} type="button"><strong>{order.code}</strong><span>{order.title}</span><span>{order.siteName} · {order.locationName}</span><span>{order.assignedToName ?? 'Sin asignar'}</span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i></span><span>{order.priority}</span><span>{compactDate(order.plannedAt)}</span><span><ChevronRight size={17} /></span></button>)}</div></section></>;
}

function DemoPlanning({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const planned = [...orders].filter((order) => order.plannedAt).sort((a, b) => String(a.plannedAt).localeCompare(String(b.plannedAt)));
  return <><div className="page-heading"><span className="section-kicker">Organización</span><h1>Planificación</h1><p>Agenda simulada de la organización.</p></div><section className="panel planning-list-panel"><div className="day-plan-list">{planned.map((order) => <button key={order.id} onClick={() => open(order.id)} type="button"><time>{compactDate(order.plannedAt)}</time><span><strong>{order.title}</strong><small>{order.assignedToName ?? 'Sin asignar'} · {order.locationName}</small></span><ChevronRight size={17} /></button>)}</div></section></>;
}

function DemoTechnician({ orders, open }: { orders: WorkOrderListItem[]; open: (id: string) => void }) {
  const own = orders.filter((order) => order.assignedTo === DEMO_TECHNICIAN_ID);
  return <><div className="page-heading"><span className="section-kicker">Zona técnico</span><h1>Mis órdenes asignadas</h1><p>Vista filtrada para Carlos Martínez.</p></div><section className="panel demo-tech-list">{own.map((order) => <button key={order.id} onClick={() => open(order.id)} type="button"><span className="order-icon"><Wrench size={20} /></span><span><strong>{order.code}</strong><b>{order.title}</b><small>{order.locationName}</small></span><span><i className={statusClass(order.status)}>{statusLabels[order.status]}</i><ChevronRight size={17} /></span></button>)}</section></>;
}

export default function DemoApp() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const [view, setView] = useState<DemoView>('dashboard');
  const [orders, setOrders] = useState<WorkOrderListItem[]>(() => demoWorkOrders);
  const [selectedId, setSelectedId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  if (!role) return <DemoAccessPanel onStart={(nextRole) => { setRole(nextRole); setView(nextRole === 'tecnico' ? 'technician' : 'dashboard'); }} />;

  const viewerName = viewerNames[role];
  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const open = (id: string) => { setSelectedId(id); setView('detail'); };
  const navigate = (next: DemoView) => { setView(next); setMenuOpen(false); };
  const updateOrder = (orderId: string, changes: Partial<WorkOrderListItem>) => setOrders((current) => current.map((order) => order.id === orderId ? { ...order, ...changes } : order));

  let content;
  if (view === 'orders') content = <DemoOrders orders={orders} open={open} create={() => setView('create')} />;
  else if (view === 'planning') content = <DemoPlanning orders={orders} open={open} />;
  else if (view === 'technician') content = <DemoTechnician orders={orders} open={open} />;
  else if (view === 'detail') content = <WorkOrderDetailWorkspace order={selected} viewerRole={role} demoMode onBack={() => setView('orders')} onDemoUpdate={updateOrder} />;
  else if (view === 'create') content = <DemoCreateWorkOrder tenantId={DEMO_TENANT_ID} orders={orders} onCancel={() => setView('orders')} onCreate={(order) => { setOrders((current) => [order, ...current]); setSelectedId(order.id); setView('detail'); }} />;
  else content = <DemoDashboard orders={orders} name={viewerName} open={open} />;

  const navigation = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'orders' as const, label: 'Órdenes de trabajo', icon: ClipboardList },
    { id: 'planning' as const, label: 'Planificación', icon: CalendarDays },
    { id: 'technician' as const, label: 'Vista técnico', icon: Wrench },
  ];

  return <div className="app-shell"><button className={`sidebar-backdrop ${menuOpen ? 'visible' : ''}`} onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" /><aside className={`sidebar ${menuOpen ? 'open' : ''}`}><div className="sidebar-brand-row"><div className="brand"><span className="brand-symbol"><Zap size={25} /></span><div><strong>IsiVoltPro OT</strong><span>Prototipo sin Supabase</span></div></div></div><nav className="sidebar-nav"><span className="nav-caption">Panel demo</span>{navigation.map(({ id, label, icon: Icon }) => <button className={`nav-item ${view === id ? 'active' : ''}`} key={id} onClick={() => navigate(id)} type="button"><Icon size={19} /><span>{label}</span></button>)}<span className="nav-caption nav-caption-spaced">Próximos módulos</span><button className="nav-item muted-nav" type="button"><UsersRound size={19} /> Técnicos</button><button className="nav-item muted-nav" type="button"><Building2 size={19} /> Instalaciones</button><button className="nav-item muted-nav" type="button"><BarChart3 size={19} /> Informes</button></nav><div className="sidebar-footer"><div className="organisation-card"><span className="avatar avatar-small">OT</span><span><strong>Hospital PTS · Demo</strong><small>{roleNames[role]}</small></span></div><button className="logout-button" onClick={() => setRole(null)} type="button"><LogOut size={18} /> Cambiar perfil</button></div></aside><div className="app-workspace"><header className="topbar"><button className="icon-button menu-button" onClick={() => setMenuOpen(true)} type="button"><Menu size={21} /></button><label className="search-box"><Search size={18} /><input placeholder="Buscar en el prototipo..." /><kbd>Demo</kbd></label><div className="topbar-actions"><button className="icon-button notification-button" type="button"><Bell size={20} /><span>2</span></button><div className="user-menu"><span className="avatar">{viewerName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span><strong>{viewerName}</strong><small>{roleNames[role]}</small></span></div><button className="primary-button top-create" onClick={() => setView('create')} type="button"><Plus size={18} /> Nueva OT</button></div></header><main className="main-content"><div className="demo-context-banner"><ShieldCheck size={17} /><span><strong>Modo demo independiente:</strong> no requiere Supabase y no modifica datos reales.</span></div>{content}</main></div></div>;
}
