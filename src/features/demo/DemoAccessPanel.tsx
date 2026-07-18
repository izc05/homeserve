import { Building2, Eye, ShieldCheck, UsersRound, Wrench, Zap } from 'lucide-react';

export type DemoRole = 'admin_cliente' | 'coordinador' | 'tecnico' | 'cliente_lectura';

type DemoAccessPanelProps = {
  onStart: (role: DemoRole) => void;
};

const roles: Array<{
  id: DemoRole;
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  {
    id: 'admin_cliente',
    title: 'Administrador',
    description: 'Ve dashboard, planificación, técnicos, clientes, activos y todas las órdenes.',
    icon: ShieldCheck,
  },
  {
    id: 'coordinador',
    title: 'Coordinador',
    description: 'Organiza preventivos, correctivos, carga de técnicos y revisiones de cierre.',
    icon: UsersRound,
  },
  {
    id: 'tecnico',
    title: 'Técnico',
    description: 'Prueba la experiencia móvil con sus OT asignadas, fotos, checklist y firmas.',
    icon: Wrench,
  },
  {
    id: 'cliente_lectura',
    title: 'Solo lectura',
    description: 'Consulta instalaciones, activos, informes y estado de trabajos sin editar.',
    icon: Eye,
  },
];

export default function DemoAccessPanel({ onStart }: DemoAccessPanelProps) {
  return (
    <main className="demo-access-page">
      <section className="demo-access-card">
        <div className="demo-access-intro">
          <div className="auth-logo demo-logo">
            <span><Zap size={27} strokeWidth={2.8} /></span>
            <div><strong>IsiVoltPro <b>OT</b></strong><small>Fotovoltaica y mantenimiento</small></div>
          </div>
          <span className="section-kicker">Modo presentación</span>
          <h1>Explora la aplicación para una empresa de fotovoltaica y mantenimiento</h1>
          <p>Los datos son ficticios y están orientados a instalaciones FV, preventivos, correctivos, técnicos, equipos, checklist, fotos, informes y trazabilidad de OT.</p>
          <div className="demo-access-safety">
            <span><ShieldCheck size={18} /> Sin tocar datos reales</span>
            <span><Building2 size={18} /> Clientes e instalaciones FV</span>
            <span><Zap size={18} /> Lista para presentar</span>
          </div>
        </div>
        <div className="demo-role-grid">
          <div className="demo-role-heading">
            <strong>Elige el perfil que quieres enseñar</strong>
            <small>Puedes salir y entrar con otro rol durante la presentación.</small>
          </div>
          {roles.map(({ id, title, description, icon: Icon }) => (
            <button key={id} className="demo-role-card" onClick={() => onStart(id)} type="button">
              <span><Icon size={22} /></span>
              <div><strong>{title}</strong><small>{description}</small></div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
