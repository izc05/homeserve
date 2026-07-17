import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  ListChecks,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';

const metrics = [
  { label: 'Sin asignar', value: 3, icon: AlertTriangle, tone: 'danger' },
  { label: 'En curso', value: 8, icon: Activity, tone: 'active' },
  { label: 'Bloqueadas', value: 2, icon: Clock3, tone: 'warning' },
  { label: 'Por revisar', value: 5, icon: ClipboardCheck, tone: 'success' },
] as const;

const workflow = [
  ['1', 'Crear y preparar', 'El coordinador define trabajo, requisitos y checklist.'],
  ['2', 'Asignar y enviar', 'La OT se entrega únicamente al técnico seleccionado.'],
  ['3', 'Ejecutar', 'El técnico registra checklist, fotos, mediciones y materiales.'],
  ['4', 'Revisar y validar', 'El responsable comprueba la evidencia y genera el PDF final.'],
] as const;

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand">
          <div className="brand-mark"><Wrench size={22} /></div>
          <div>
            <strong>IsiVoltPro OT</strong>
            <span>Gestión técnica</span>
          </div>
        </div>

        <nav>
          <a className="nav-item active" href="#dashboard"><Activity size={19} /> Inicio</a>
          <a className="nav-item" href="#work-orders"><ClipboardCheck size={19} /> Órdenes de trabajo</a>
          <a className="nav-item" href="#planning"><Clock3 size={19} /> Planificación</a>
          <a className="nav-item" href="#technicians"><Users size={19} /> Técnicos</a>
          <a className="nav-item" href="#reports"><FileText size={19} /> Informes</a>
          <a className="nav-item" href="#settings"><Settings size={19} /> Configuración</a>
        </nav>

        <div className="sidebar-note">
          <ListChecks size={18} />
          <div>
            <strong>Zona técnico separada</strong>
            <span>Solo muestra las OT asignadas.</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">Panel central</span>
            <h1>Control de órdenes de trabajo</h1>
            <p>Crear, asignar, seguir, revisar y validar desde una única aplicación.</p>
          </div>
          <button className="primary-button" type="button"><ClipboardCheck size={18} /> Nueva OT</button>
        </header>

        <section className="metrics-grid" aria-label="Resumen de órdenes">
          {metrics.map(({ label, value, icon: Icon, tone }) => (
            <article className={`metric-card ${tone}`} key={label}>
              <span className="metric-icon"><Icon size={22} /></span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel product-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Producto acordado</span>
                <h2>Un sistema, dos experiencias</h2>
              </div>
              <span className="status-pill"><CheckCircle2 size={15} /> Alcance definido</span>
            </div>

            <div className="experience-grid">
              <div className="experience-card">
                <Users size={24} />
                <h3>Panel central</h3>
                <p>Administradores y coordinadores gestionan todas las OT, técnicos, fechas, revisiones e informes.</p>
                <ul>
                  <li>Creación y asignación</li>
                  <li>Seguimiento por estado</li>
                  <li>Correcciones y validación</li>
                  <li>PDF versionado</li>
                </ul>
              </div>
              <div className="experience-card technician">
                <Wrench size={24} />
                <h3>Zona técnico</h3>
                <p>El técnico recibe una interfaz móvil centrada únicamente en ejecutar sus trabajos.</p>
                <ul>
                  <li>Aceptar e iniciar</li>
                  <li>Checklist y fotografías</li>
                  <li>Materiales y firmas</li>
                  <li>Enviar para revisión</li>
                </ul>
              </div>
            </div>
          </article>

          <aside className="panel foundation-panel">
            <span className="eyebrow">Fundación técnica</span>
            <h2>Antes de añadir pantallas</h2>
            <div className="foundation-list">
              <div><CheckCircle2 size={18} /><span><strong>Supabase</strong> como fuente oficial</span></div>
              <div><CheckCircle2 size={18} /><span><strong>RLS</strong> para permisos reales</span></div>
              <div><CheckCircle2 size={18} /><span><strong>TypeScript</strong> estricto</span></div>
              <div><CheckCircle2 size={18} /><span><strong>Storage privado</strong> para evidencias</span></div>
              <div><CheckCircle2 size={18} /><span><strong>Auditoría</strong> de acciones críticas</span></div>
            </div>
          </aside>
        </section>

        <section className="panel workflow-panel" id="work-orders">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Flujo oficial</span>
              <h2>Ciclo completo de una OT</h2>
            </div>
          </div>
          <div className="workflow-grid">
            {workflow.map(([number, title, description]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer>
          Base inicial del proyecto. La siguiente fase es autenticación, migración Supabase y pruebas de permisos.
        </footer>
      </main>
    </div>
  );
}
