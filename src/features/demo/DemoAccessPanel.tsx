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
    description: 'Ve dashboard, planificación, usuarios y todas las órdenes.',
    icon: ShieldCheck,
  },
  {
    id: 'coordinador',
    title: 'Coordinador',
    description: 'Organiza trabajos, revisa carga y consulta el estado operativo.',
    icon: UsersRound,
  },
  {
    id: 'tecnico',
    title: 'Técnico',
    description: 'Prueba la experiencia móvil con únicamente sus OT asignadas.',
    icon: Wrench,
  },
  {
    id: 'cliente_lectura',
    title: 'Solo lectura',
    description: 'Consulta información sin acciones de edición o gestión.',
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
            <div><strong>IsiVoltPro <b>OT</b></strong><small>Prototipo navegable sin Supabase</small></div>
          </div>
          <span className="section-kicker">Modo demostración</span>
          <h1>Explora toda la aplicación sin configurar nada</h1>
          <p>Los datos son ficticios y se guardan únicamente durante esta sesión del navegador. No se envía información a Supabase ni se modifica la base real.</p>
          <div className="demo-access-safety">
            <span><ShieldCheck size={18} /> Sin conexión de escritura</span>
            <span><Building2 size={18} /> Entorno hospitalario ficticio</span>
            <span><Zap size={18} /> Acceso inmediato</span>
          </div>
        </div>
        <div className="demo-role-grid">
          <div className="demo-role-heading">
            <strong>Elige el perfil que quieres probar</strong>
            <small>Puedes salir y entrar con otro rol en cualquier momento.</small>
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
