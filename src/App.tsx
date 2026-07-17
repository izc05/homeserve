import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  Files,
  Home,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

type AppView = 'dashboard' | 'orders' | 'planning' | 'detail' | 'create' | 'technician';
type OrderStatus =
  | 'BORRADOR'
  | 'ASIGNADA'
  | 'ACEPTADA'
  | 'EN CURSO'
  | 'BLOQUEADA'
  | 'PENDIENTE VALIDACIÓN'
  | 'COMPLETADA';

type Order = {
  id: string;
  title: string;
  site: string;
  technician: string;
  status: OrderStatus;
  priority: 'Alta' | 'Media' | 'Baja';
  date: string;
  icon: LucideIcon;
};

const navigation: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'orders', label: 'Órdenes de trabajo', icon: ClipboardList },
  { id: 'planning', label: 'Planificación', icon: CalendarDays },
  { id: 'technician', label: 'Vista técnico', icon: Wrench },
];

const managementLinks = [
  { label: 'Técnicos', icon: UsersRound },
  { label: 'Clientes / Instalaciones', icon: Building2 },
  { label: 'Equipos', icon: Boxes },
  { label: 'Informes', icon: BarChart3 },
  { label: 'Auditoría', icon: ShieldCheck },
];

const configurationLinks = [
  { label: 'Checklists', icon: ListChecks },
  { label: 'Plantillas', icon: Files },
  { label: 'Catálogos', icon: SlidersHorizontal },
  { label: 'Ajustes', icon: Settings },
];

const orders: Order[] = [
  {
    id: 'OT-2026-00039',
    title: 'Instalación solar · Revisión anual',
    site: 'Isla Solar Fotovoltaica',
    technician: 'Carlos Gómez',
    status: 'ASIGNADA',
    priority: 'Alta',
    date: 'Hoy 09:30',
    icon: Boxes,
  },
  {
    id: 'OT-2026-00038',
    title: 'Mantenimiento preventivo del inversor',
    site: 'Nave Industrial Norte',
    technician: 'María López',
    status: 'EN CURSO',
    priority: 'Media',
    date: 'Hoy 08:15',
    icon: Wrench,
  },
  {
    id: 'OT-2026-00037',
    title: 'Revisión de cuadro eléctrico',
    site: 'Centro Comercial Plaza',
    technician: 'Juan Pérez',
    status: 'PENDIENTE VALIDACIÓN',
    priority: 'Media',
    date: 'Ayer 17:45',
    icon: FileCheck2,
  },
  {
    id: 'OT-2026-00036',
    title: 'Sustitución de fusibles',
    site: 'Edificio Oficinas Central',
    technician: 'Carlos Gómez',
    status: 'COMPLETADA',
    priority: 'Baja',
    date: '16/07/2026',
    icon: CheckCircle2,
  },
  {
    id: 'OT-2026-00035',
    title: 'Diagnóstico de fallo de alimentación',
    site: 'Planta Producción A',
    technician: 'Antonio Ruiz',
    status: 'BLOQUEADA',
    priority: 'Alta',
    date: '15/07/2026',
    icon: AlertTriangle,
  },
];

const metrics = [
  { label: 'OT abiertas', value: 24, detail: '12 asignadas a técnicos', icon: ClipboardList, tone: 'red' },
  { label: 'OT completadas', value: 8, detail: 'Esta semana', icon: CheckCircle2, tone: 'green' },
  { label: 'Pendientes validar', value: 5, detail: 'Requieren revisión', icon: Clock3, tone: 'orange' },
  { label: 'OT bloqueadas', value: 2, detail: 'Requieren atención', icon: AlertTriangle, tone: 'purple' },
] as const;

const statusClass = (status: OrderStatus) =>
  `status status-${status.toLowerCase().replaceAll(' ', '-').replaceAll('ó', 'o')}`;

function BrandMark() {
  return (
    <span className="brand-symbol" aria-hidden="true">
      <Zap size={25} strokeWidth={2.8} />
    </span>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="login-page">
      <section className="login-card" aria-label="Acceso a IsiVoltPro OT">
        <div className="login-form-panel">
          <div className="login-brand">
            <BrandMark />
            <div>
              <strong>IsiVoltPro <span>OT</span></strong>
              <small>Gestión de órdenes de trabajo</small>
            </div>
          </div>

          <div className="login-copy">
            <span className="section-kicker">Acceso profesional</span>
            <h1>Todo el mantenimiento bajo control</h1>
            <p>Entra al panel de coordinación o consulta tus trabajos asignados desde el móvil.</p>
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              onLogin();
            }}
          >
            <label>
              Usuario o correo
              <span className="input-shell"><UserRound size={18} /><input defaultValue="isicio@isivoltpro.com" type="email" /></span>
            </label>
            <label>
              Contraseña
              <span className="input-shell"><ShieldCheck size={18} /><input defaultValue="isivoltpro" type="password" /></span>
            </label>
            <button className="text-link login-help" type="button">¿Has olvidado tu contraseña?</button>
            <button className="primary-button login-button" type="submit">Iniciar sesión</button>
          </form>

          <p className="login-disclaimer">Vista de desarrollo. La autenticación real se conectará mediante Supabase.</p>
        </div>
        <div className="login-visual" aria-hidden="true">
          <div className="visual-grid" />
          <div className="visual-message">
            <span><Wrench size={21} /></span>
            <strong>Trabajo técnico, información clara.</strong>
            <small>Planifica, ejecuta, documenta y valida cada intervención.</small>
          </div>
        </div>
      </section>
    </main>
  );
}

function Sidebar({
  active,
  open,
  onClose,
  onNavigate,
  onLogout,
}: {
  active: AppView;
  open: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <button className={`sidebar-backdrop ${open ? 'visible' : ''}`} onClick={onClose} aria-label="Cerrar menú" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-brand-row">
          <div className="brand">
            <BrandMark />
            <div>
              <strong>IsiVoltPro OT</strong>
              <span>Gestión de órdenes de trabajo</span>
            </div>
          </div>
          <button className="icon-button sidebar-close" onClick={onClose} aria-label="Cerrar menú"><X size={20} /></button>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-caption">Panel central</span>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              className={`nav-item ${active === id ? 'active' : ''}`}
              key={id}
              onClick={() => {
                onNavigate(id);
                onClose();
              }}
              type="button"
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}

          {managementLinks.map(({ label, icon: Icon }) => (
            <button className="nav-item muted-nav" key={label} type="button"><Icon size={19} /><span>{label}</span></button>
          ))}

          <span className="nav-caption nav-caption-spaced">Configuración</span>
          {configurationLinks.map(({ label, icon: Icon }) => (
            <button className="nav-item muted-nav" key={label} type="button"><Icon size={19} /><span>{label}</span></button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="organisation-card" type="button">
            <span className="avatar avatar-small">IZ</span>
            <span><strong>IsiVoltPro Mantenimiento</strong><small>Administrador</small></span>
            <ChevronDown size={17} />
          </button>
          <button className="logout-button" onClick={onLogout} type="button"><LogOut size={18} /> Cerrar sesión</button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenu, onCreate }: { onMenu: () => void; onCreate: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Abrir menú"><Menu size={21} /></button>
      <label className="search-box">
        <Search size={18} />
        <input placeholder="Buscar OT, equipo, ubicación..." />
        <kbd>⌘K</kbd>
      </label>
      <div className="topbar-actions">
        <button className="icon-button notification-button" aria-label="Notificaciones"><Bell size={20} /><span>6</span></button>
        <button className="user-menu" type="button">
          <span className="avatar">IZ</span>
          <span><strong>Isi Zafra</strong><small>Coordinador</small></span>
          <ChevronDown size={17} />
        </button>
        <button className="primary-button top-create" onClick={onCreate} type="button"><Plus size={18} /> Nueva OT</button>
      </div>
    </header>
  );
}

function MetricCards() {
  return (
    <section className="metrics-grid" aria-label="Resumen de órdenes">
      {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
        <article className="metric-card" key={label}>
          <span className={`metric-icon tone-${tone}`}><Icon size={23} /></span>
          <div className="metric-content"><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>
          <button className="metric-link" type="button">Ver detalle <ChevronRight size={14} /></button>
        </article>
      ))}
    </section>
  );
}

function OrdersDonut() {
  return (
    <article className="panel orders-status-panel">
      <div className="panel-heading"><h2>Estado de órdenes</h2><button className="filter-button" type="button">Este mes <ChevronDown size={15} /></button></div>
      <div className="donut-layout">
        <div className="donut"><div><strong>39</strong><span>Órdenes</span></div></div>
        <ul className="legend-list">
          <li><i className="legend-red" /><span>Asignada</span><strong>12</strong><small>31%</small></li>
          <li><i className="legend-orange" /><span>En curso</span><strong>9</strong><small>23%</small></li>
          <li><i className="legend-yellow" /><span>Pendiente validación</span><strong>5</strong><small>13%</small></li>
          <li><i className="legend-purple" /><span>Pendiente material</span><strong>4</strong><small>10%</small></li>
          <li><i className="legend-gray" /><span>Bloqueada</span><strong>2</strong><small>5%</small></li>
          <li><i className="legend-green" /><span>Completada</span><strong>8</strong><small>18%</small></li>
        </ul>
      </div>
      <button className="text-link panel-link" type="button">Ver detalle <ChevronRight size={15} /></button>
    </article>
  );
}

function RecentOrders({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="panel recent-orders-panel">
      <div className="panel-heading"><h2>OT recientes</h2><button className="text-link" onClick={onOpen} type="button">Ver todas <ChevronRight size={15} /></button></div>
      <div className="recent-order-list">
        {orders.map(({ id, title, site, status, date, icon: Icon }) => (
          <button className="recent-order" key={id} onClick={onOpen} type="button">
            <span className="order-icon"><Icon size={20} /></span>
            <span className="order-main"><strong>{id}</strong><span>{title}</span><small>{site}</small></span>
            <span className="order-meta"><span className={statusClass(status)}>{status}</span><small>{date}</small></span>
          </button>
        ))}
      </div>
    </article>
  );
}

function ActivityPanel() {
  const activity = [
    { icon: ClipboardList, text: 'Isi asignó OT-2026-00039 a Carlos Gómez', time: 'Hace 10 minutos', tone: 'blue' },
    { icon: CheckCircle2, text: 'Carlos Gómez completó OT-2026-00036', time: 'Hace 1 hora', tone: 'green' },
    { icon: Camera, text: 'María López subió fotos a OT-2026-00038', time: 'Hace 2 horas', tone: 'purple' },
    { icon: AlertTriangle, text: 'Tú bloqueaste OT-2026-00035', time: 'Hace 3 horas', tone: 'red' },
  ] as const;

  return (
    <div className="right-stack">
      <article className="panel activity-panel">
        <div className="panel-heading"><h2>Actividad reciente</h2><button className="text-link" type="button">Ver todo <ChevronRight size={15} /></button></div>
        <div className="activity-list">
          {activity.map(({ icon: Icon, text, time, tone }) => (
            <div className="activity-item" key={text}><span className={`activity-icon tone-${tone}`}><Icon size={17} /></span><span><strong>{text}</strong><small>{time}</small></span></div>
          ))}
        </div>
      </article>
      <article className="panel alert-panel">
        <div className="panel-heading"><h2>Alertas</h2><button className="text-link" type="button">Ver todas <ChevronRight size={15} /></button></div>
        <div className="alert-row"><span className="activity-icon tone-red"><AlertTriangle size={17} /></span><span><strong>2 OT bloqueadas requieren atención</strong><button className="text-link" type="button">Ver detalles <ChevronRight size={14} /></button></span></div>
        <div className="alert-row"><span className="activity-icon tone-orange"><Clock3 size={17} /></span><span><strong>5 OT pendientes de validación</strong><button className="text-link" type="button">Revisar ahora <ChevronRight size={14} /></button></span></div>
      </article>
    </div>
  );
}

function WorkloadPanel() {
  const technicians = [
    ['Carlos Gómez', 8, 80],
    ['María López', 6, 60],
    ['Juan Pérez', 4, 40],
    ['Antonio Ruiz', 3, 30],
    ['Sin asignar', 2, 20],
  ] as const;
  return (
    <article className="panel workload-panel">
      <div className="panel-heading"><h2>Carga de trabajo por técnico</h2><button className="filter-button" type="button">Este mes <ChevronDown size={15} /></button></div>
      <div className="workload-list">
        {technicians.map(([name, value, percentage], index) => (
          <div className="workload-row" key={name}><span className="avatar avatar-mini">{index === 4 ? '—' : name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><strong>{name}</strong><div className="progress"><i style={{ width: `${percentage}%` }} /></div><b>{value} OT</b><small>{percentage}%</small></div>
        ))}
      </div>
      <p className="panel-footnote">Capacidad estimada sobre 10 OT activas por técnico.</p>
    </article>
  );
}

function PriorityPanel() {
  return (
    <article className="panel priority-panel">
      <div className="panel-heading"><h2>OT por prioridad</h2><button className="filter-button" type="button">Este mes <ChevronDown size={15} /></button></div>
      <div className="priority-list">
        <div><span>Alta</span><strong>12 <small>31%</small></strong><div className="priority-track"><i className="priority-high" /></div></div>
        <div><span>Media</span><strong>18 <small>46%</small></strong><div className="priority-track"><i className="priority-medium" /></div></div>
        <div><span>Baja</span><strong>9 <small>23%</small></strong><div className="priority-track"><i className="priority-low" /></div></div>
      </div>
    </article>
  );
}

function CalendarPanel() {
  return (
    <article className="panel calendar-panel">
      <div className="panel-heading"><div><h2>Calendario</h2><strong className="calendar-date">17 de julio de 2026</strong></div><button className="text-link" type="button">Ver calendario <ChevronRight size={15} /></button></div>
      <div className="agenda-list">
        <div className="agenda-item red"><time>10:00</time><span><strong>Reunión de planificación</strong><small>Sala de reuniones</small></span></div>
        <div className="agenda-item orange"><time>14:30</time><span><strong>Revisión de OT críticas</strong><small>Pendientes de validación</small></span></div>
        <div className="agenda-item green"><time>16:00</time><span><strong>Informe semanal</strong><small>Generar reportes</small></span></div>
      </div>
    </article>
  );
}

function DashboardPage({ onOrders, onDetail }: { onOrders: () => void; onDetail: () => void }) {
  return (
    <>
      <div className="page-heading"><div><span className="section-kicker">Panel central</span><h1>Hola, Isi <span aria-hidden="true">👋</span></h1><p>Resumen general de la actividad de mantenimiento.</p></div></div>
      <MetricCards />
      <section className="dashboard-grid dashboard-grid-top"><OrdersDonut /><RecentOrders onOpen={onDetail} /><ActivityPanel /></section>
      <section className="dashboard-grid dashboard-grid-bottom"><WorkloadPanel /><PriorityPanel /><CalendarPanel /></section>
      <button className="mobile-wide-action" onClick={onOrders} type="button">Ver todas las órdenes <ChevronRight size={17} /></button>
    </>
  );
}

function OrdersPage({ onCreate, onDetail }: { onCreate: () => void; onDetail: () => void }) {
  return (
    <>
      <div className="page-heading page-heading-row"><div><span className="section-kicker">Gestión diaria</span><h1>Órdenes de trabajo</h1><p>Consulta, filtra y abre cada intervención desde una única vista.</p></div><button className="primary-button" onClick={onCreate} type="button"><Plus size={18} /> Nueva OT</button></div>
      <section className="panel table-panel">
        <div className="filters-row">
          <label className="table-search"><Search size={17} /><input placeholder="Buscar por ID, título o ubicación" /></label>
          <button className="filter-button" type="button">Estado <ChevronDown size={15} /></button>
          <button className="filter-button" type="button">Prioridad <ChevronDown size={15} /></button>
          <button className="filter-button" type="button">Técnico <ChevronDown size={15} /></button>
          <button className="filter-button" type="button">Más filtros <SlidersHorizontal size={15} /></button>
        </div>
        <div className="orders-table" role="table" aria-label="Órdenes de trabajo">
          <div className="orders-table-row orders-table-head" role="row"><span>ID</span><span>Trabajo</span><span>Cliente / ubicación</span><span>Técnico</span><span>Estado</span><span>Prioridad</span><span>Fecha</span><span /></div>
          {orders.map((order) => (
            <button className="orders-table-row" key={order.id} onClick={onDetail} role="row" type="button">
              <strong>{order.id}</strong><span>{order.title}</span><span>{order.site}</span><span>{order.technician}</span><span><i className={statusClass(order.status)}>{order.status}</i></span><span><i className={`priority-badge priority-${order.priority.toLowerCase()}`}>{order.priority}</i></span><span>{order.date}</span><span><ChevronRight size={17} /></span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function OrderDetailPage({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="detail-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={18} /> Volver</button>
        <div><span className="section-kicker">Orden de trabajo</span><h1>OT-2026-00038</h1><p>Mantenimiento preventivo del inversor</p></div>
        <span className={statusClass('EN CURSO')}>EN CURSO</span>
        <button className="filter-button detail-actions" type="button">Acciones <ChevronDown size={15} /></button>
      </div>
      <div className="detail-tabs"><button className="active" type="button">Detalle</button><button type="button">Tareas</button><button type="button">Fotos <span>4</span></button><button type="button">Documentos <span>2</span></button><button type="button">Historial</button></div>
      <section className="detail-grid">
        <article className="panel detail-main-card">
          <div className="panel-heading"><h2>Información del trabajo</h2><span className="priority-badge priority-media">Prioridad media</span></div>
          <dl className="detail-definition-grid">
            <div><dt>Cliente</dt><dd>Industrial del Sur, S.L.</dd></div>
            <div><dt>Ubicación</dt><dd>Nave Industrial Norte · Zona 3</dd></div>
            <div><dt>Equipo</dt><dd>Inversor Solar SMA 50kW</dd></div>
            <div><dt>Técnico asignado</dt><dd>María López</dd></div>
            <div><dt>Fecha planificada</dt><dd>17/07/2026 · 08:00</dd></div>
            <div><dt>Tiempo estimado</dt><dd>3 horas</dd></div>
          </dl>
          <div className="description-box"><strong>Descripción</strong><p>Realizar mantenimiento preventivo del inversor solar, revisar ventilación, apriete de conexiones, protecciones y registro de mediciones.</p></div>
          <div className="evidence-grid"><div><Camera size={22} /><strong>4 fotografías</strong><small>Evidencia adjunta</small></div><div><ListChecks size={22} /><strong>8/10 tareas</strong><small>Checklist completado</small></div><div><Clock3 size={22} /><strong>2 h 30 min</strong><small>Tiempo registrado</small></div></div>
        </article>
        <aside className="panel detail-side-card">
          <h2>Seguimiento</h2>
          <div className="timeline">
            <div className="done"><i /><span><strong>OT creada</strong><small>16/07 · 12:20 · Isi Zafra</small></span></div>
            <div className="done"><i /><span><strong>Asignada a María López</strong><small>16/07 · 12:25</small></span></div>
            <div className="done"><i /><span><strong>Trabajo aceptado</strong><small>17/07 · 07:52</small></span></div>
            <div className="current"><i /><span><strong>En ejecución</strong><small>Iniciada a las 08:15</small></span></div>
            <div><i /><span><strong>Pendiente de finalización</strong><small>Esperando evidencias</small></span></div>
          </div>
          <button className="secondary-button" type="button">Contactar con técnico</button>
        </aside>
      </section>
    </>
  );
}

function CreateOrderPage({ onCancel }: { onCancel: () => void }) {
  return (
    <>
      <div className="page-heading"><div><span className="section-kicker">Nueva intervención</span><h1>Crear y asignar OT</h1><p>Define el trabajo, selecciona la ubicación y prepara la asignación.</p></div></div>
      <section className="creation-layout">
        <ol className="creation-steps"><li className="active"><span>1</span><strong>Información</strong></li><li><span>2</span><strong>Asignación</strong></li><li><span>3</span><strong>Checklist</strong></li><li><span>4</span><strong>Confirmar</strong></li></ol>
        <form className="panel creation-form" onSubmit={(event) => event.preventDefault()}>
          <div className="panel-heading"><div><span className="section-kicker">Paso 1 de 4</span><h2>Información básica</h2></div><span className="autosave"><CheckCircle2 size={15} /> Guardado</span></div>
          <div className="form-grid">
            <label className="full-field">Título de la OT<input defaultValue="Revisión del cuadro eléctrico principal" /></label>
            <label>Cliente<select defaultValue="hospital"><option value="hospital">Hospital Universitario</option></select></label>
            <label>Ubicación<select defaultValue="sala"><option value="sala">Sala técnica · Planta 2</option></select></label>
            <label>Tipo de trabajo<select defaultValue="preventivo"><option value="preventivo">Mantenimiento preventivo</option></select></label>
            <label>Prioridad<select defaultValue="media"><option value="media">Media</option><option>Alta</option><option>Baja</option></select></label>
            <label className="full-field">Descripción<textarea defaultValue="Comprobar protecciones, apriete de conexiones, limpieza interior y registrar mediciones eléctricas." rows={5} /></label>
          </div>
          <div className="form-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="primary-button" type="button">Siguiente <ChevronRight size={17} /></button></div>
        </form>
      </section>
    </>
  );
}

function PlanningPage() {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  return (
    <>
      <div className="page-heading page-heading-row"><div><span className="section-kicker">Organización</span><h1>Planificación</h1><p>Distribuye la carga de trabajo y detecta conflictos antes de asignar.</p></div><button className="primary-button" type="button"><Plus size={18} /> Planificar OT</button></div>
      <section className="planning-grid">
        <article className="panel month-panel">
          <div className="panel-heading"><div><span className="section-kicker">Julio 2026</span><h2>Calendario mensual</h2></div><div className="calendar-controls"><button className="icon-button" type="button"><ArrowLeft size={18} /></button><button className="filter-button" type="button">Hoy</button><button className="icon-button" type="button"><ChevronRight size={18} /></button></div></div>
          <div className="month-grid"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>{days.map((day) => <button className={`${day === 17 ? 'selected' : ''} ${[3, 8, 11, 17, 22, 29].includes(day) ? 'has-work' : ''}`} key={day} type="button"><b>{day}</b>{day === 17 && <small>3 OT</small>}</button>)}</div>
        </article>
        <aside className="panel day-plan-panel"><div className="panel-heading"><div><span className="section-kicker">Viernes</span><h2>17 de julio</h2></div><span className="day-count">3 intervenciones</span></div><div className="day-plan-list"><div><time>08:00</time><span><strong>Mantenimiento de inversor</strong><small>María López · Nave Industrial Norte</small></span></div><div><time>10:30</time><span><strong>Revisión de climatización</strong><small>Carlos Gómez · Hospital Universitario</small></span></div><div><time>14:00</time><span><strong>Cuadro eléctrico principal</strong><small>Sin asignar · Sala técnica P2</small></span></div></div></aside>
      </section>
    </>
  );
}

function TechnicianPage() {
  return (
    <section className="technician-preview-page">
      <div className="technician-description"><span className="section-kicker">Zona técnico</span><h1>Trabajo claro, sin distracciones</h1><p>La interfaz móvil muestra únicamente las órdenes asignadas, su prioridad y las acciones necesarias para completar el trabajo.</p><div className="technician-benefits"><span><CheckCircle2 size={18} /> Solo sus OT</span><span><CheckCircle2 size={18} /> Botones grandes</span><span><CheckCircle2 size={18} /> Evidencias guiadas</span></div></div>
      <div className="phone-shell">
        <div className="phone-speaker" />
        <div className="phone-screen">
          <header className="mobile-header"><Menu size={20} /><strong>IsiVoltPro OT</strong><Bell size={19} /></header>
          <main className="mobile-content">
            <h2>Hola, Carlos <span aria-hidden="true">👋</span></h2><p>Estas son tus órdenes de hoy.</p>
            <div className="mobile-metrics"><div><span className="tone-red"><ClipboardList size={19} /></span><strong>5</strong><small>Asignadas</small></div><div><span className="tone-green"><CheckCircle2 size={19} /></span><strong>2</strong><small>En curso</small></div><div><span className="tone-orange"><Clock3 size={19} /></span><strong>1</strong><small>Pendiente</small></div><div><span className="tone-purple"><AlertTriangle size={19} /></span><strong>0</strong><small>Bloqueadas</small></div></div>
            <div className="mobile-section-heading"><h3>Mis OT recientes</h3><button className="text-link" type="button">Ver todas</button></div>
            <div className="mobile-orders">{orders.slice(0, 3).map(({ id, title, site, status, date, icon: Icon }) => <button key={id} type="button"><span className="order-icon"><Icon size={18} /></span><span><strong>{id}</strong><b>{title}</b><small><MapPin size={12} /> {site}</small></span><span><i className={statusClass(status)}>{status}</i><small>{date}</small><ChevronRight size={16} /></span></button>)}</div>
          </main>
          <nav className="mobile-bottom-nav"><button className="active" type="button"><Home size={19} /><span>Inicio</span></button><button type="button"><ClipboardList size={19} /><span>Mis OT</span></button><button className="mobile-plus" type="button"><Plus size={25} /></button><button type="button"><CalendarDays size={19} /><span>Agenda</span></button><button type="button"><MoreHorizontal size={19} /><span>Más</span></button></nav>
        </div>
      </div>
    </section>
  );
}

function MobileQuickNav({ active, onNavigate }: { active: AppView; onNavigate: (view: AppView) => void }) {
  const items = navigation.slice(0, 4);
  return (
    <nav className="app-mobile-nav">
      {items.map(({ id, label, icon: Icon }) => <button className={active === id ? 'active' : ''} key={id} onClick={() => onNavigate(id)} type="button"><Icon size={19} /><span>{label === 'Órdenes de trabajo' ? 'OT' : label.replace('Vista ', '')}</span></button>)}
      <button className="mobile-create-button" onClick={() => onNavigate('create')} type="button"><Plus size={24} /></button>
    </nav>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  const renderView = () => {
    switch (view) {
      case 'orders':
        return <OrdersPage onCreate={() => setView('create')} onDetail={() => setView('detail')} />;
      case 'planning':
        return <PlanningPage />;
      case 'detail':
        return <OrderDetailPage onBack={() => setView('orders')} />;
      case 'create':
        return <CreateOrderPage onCancel={() => setView('orders')} />;
      case 'technician':
        return <TechnicianPage />;
      default:
        return <DashboardPage onOrders={() => setView('orders')} onDetail={() => setView('detail')} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        active={view}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={setView}
        onLogout={() => setAuthenticated(false)}
      />
      <div className="app-workspace">
        <Topbar onMenu={() => setSidebarOpen(true)} onCreate={() => setView('create')} />
        <main className="main-content">{renderView()}</main>
      </div>
      <MobileQuickNav active={view} onNavigate={setView} />
    </div>
  );
}
