import {
  ArrowRight,
  Boxes,
  Building2,
  Calculator,
  ClipboardCheck,
  Droplets,
  FileText,
  Flame,
  Gauge,
  QrCode,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

type Product = {
  name: string;
  description: string;
  icon: LucideIcon;
  status: 'available' | 'planned';
  category: string;
  href?: string;
};

const products: Product[] = [
  {
    name: 'IsiVoltPro OT',
    description: 'Ciclo completo de órdenes de trabajo: creación, asignación, ejecución técnica, evidencias, firmas, revisión e informe.',
    icon: ClipboardCheck,
    status: 'available',
    category: 'Operaciones',
    href: import.meta.env.BASE_URL,
  },
  {
    name: 'Activos QR / NFC',
    description: 'Identificación de equipos, historial, documentación, revisiones y acceso inmediato desde móvil.',
    icon: QrCode,
    status: 'planned',
    category: 'Activos',
  },
  {
    name: 'Inventario y almacén',
    description: 'Control de material, herramientas, maletines, movimientos, entregas y existencias.',
    icon: Boxes,
    status: 'planned',
    category: 'Logística',
  },
  {
    name: 'Inspecciones eléctricas',
    description: 'Checklists REBT, mediciones, defectos, fotografías, cálculos e informes técnicos.',
    icon: Zap,
    status: 'planned',
    category: 'Electricidad',
  },
  {
    name: 'RITE y climatización',
    description: 'Revisiones, mantenimiento, refrigeración, conductos, UTA, aerotermia y cálculos térmicos.',
    icon: Snowflake,
    status: 'planned',
    category: 'Climatización',
  },
  {
    name: 'PCI',
    description: 'Inventario, revisiones y trazabilidad de extintores, BIE, detección, grupos y sistemas de protección.',
    icon: Flame,
    status: 'planned',
    category: 'Seguridad',
  },
  {
    name: 'Legionella',
    description: 'Puntos de control, purgas, temperaturas, desinfecciones, muestras y registros periódicos.',
    icon: Droplets,
    status: 'planned',
    category: 'Sanidad ambiental',
  },
  {
    name: 'Cálculos técnicos',
    description: 'Herramientas rápidas para electricidad, climatización, refrigeración, hidráulica y mantenimiento.',
    icon: Calculator,
    status: 'planned',
    category: 'Utilidades',
  },
  {
    name: 'Informes y documentación',
    description: 'Plantillas, certificados, presupuestos, partes, informes PDF y archivo centralizado.',
    icon: FileText,
    status: 'planned',
    category: 'Documentación',
  },
];

const pillars = [
  { icon: ShieldCheck, title: 'Seguridad real', text: 'Permisos por rol, trazabilidad y protección de datos desde la base de datos.' },
  { icon: Gauge, title: 'Trabajo conectado', text: 'Un mismo usuario, una misma organización y módulos que comparten información útil.' },
  { icon: Building2, title: 'Escalable', text: 'Preparado para mantenimiento hospitalario, industrial, terciario y empresas de servicios.' },
];

function Brand() {
  return (
    <a className="eco-brand" href="#top" aria-label="IsiVoltPro, inicio">
      <span className="eco-brand-symbol"><Zap size={23} fill="currentColor" /></span>
      <span className="eco-wordmark">ISI<span>VOLT</span>PRO</span>
    </a>
  );
}

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  const content = (
    <>
      <div className="eco-card-top">
        <span className="eco-card-icon"><Icon size={23} /></span>
        <span className={`eco-status eco-status-${product.status}`}>
          {product.status === 'available' ? 'Disponible' : 'En planificación'}
        </span>
      </div>
      <span className="eco-category">{product.category}</span>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <span className="eco-card-action">
        {product.status === 'available' ? 'Abrir aplicación' : 'Próximamente'}
        {product.status === 'available' && <ArrowRight size={17} />}
      </span>
    </>
  );

  return product.href ? (
    <a className="eco-product-card eco-product-card-active" href={product.href}>{content}</a>
  ) : (
    <article className="eco-product-card">{content}</article>
  );
}

export default function EcosystemApp() {
  return (
    <div className="eco-page" id="top">
      <header className="eco-header">
        <Brand />
        <nav aria-label="Navegación principal">
          <a href="#ecosistema">Ecosistema</a>
          <a href="#vision">Visión</a>
          <a className="eco-nav-button" href={import.meta.env.BASE_URL}>Entrar en OT</a>
        </nav>
      </header>

      <main>
        <section className="eco-hero">
          <div className="eco-hero-copy">
            <span className="eco-eyebrow"><Sparkles size={16} /> Tecnología para mantenimiento técnico</span>
            <h1>Un ecosistema de herramientas para controlar el mantenimiento de principio a fin.</h1>
            <p>IsiVoltPro reúne operaciones, técnicos, activos, inspecciones, inventario, cálculos e informes en aplicaciones especializadas que pueden crecer de forma independiente y trabajar conectadas.</p>
            <div className="eco-hero-actions">
              <a className="eco-primary" href={import.meta.env.BASE_URL}><Wrench size={18} /> Abrir IsiVoltPro OT</a>
              <a className="eco-secondary" href="#ecosistema">Explorar módulos <ArrowRight size={17} /></a>
            </div>
            <div className="eco-proof">
              <span><strong>1</strong> aplicación operativa</span>
              <span><strong>8</strong> módulos previstos</span>
              <span><strong>1</strong> identidad IsiVoltPro</span>
            </div>
          </div>
          <div className="eco-hero-visual" aria-hidden="true">
            <div className="eco-orbit eco-orbit-one" />
            <div className="eco-orbit eco-orbit-two" />
            <div className="eco-core"><Zap size={44} fill="currentColor" /><strong>IsiVoltPro</strong><span>Ecosistema técnico</span></div>
            <span className="eco-floating eco-floating-one"><ClipboardCheck size={20} /> OT</span>
            <span className="eco-floating eco-floating-two"><QrCode size={20} /> QR / NFC</span>
            <span className="eco-floating eco-floating-three"><Snowflake size={20} /> RITE</span>
            <span className="eco-floating eco-floating-four"><ShieldCheck size={20} /> PCI</span>
          </div>
        </section>

        <section className="eco-section" id="ecosistema">
          <div className="eco-section-heading">
            <span className="eco-eyebrow">Aplicaciones especializadas</span>
            <h2>Cada herramienta resuelve un trabajo concreto. Juntas forman el ecosistema.</h2>
            <p>La prioridad actual es consolidar IsiVoltPro OT. Los siguientes módulos se incorporarán manteniendo una experiencia, seguridad y estructura comunes.</p>
          </div>
          <div className="eco-products-grid">
            {products.map((product) => <ProductCard key={product.name} product={product} />)}
          </div>
        </section>

        <section className="eco-vision" id="vision">
          <div>
            <span className="eco-eyebrow">Dirección del producto</span>
            <h2>Una plataforma técnica amplia, sin convertir cada aplicación en un programa imposible de usar.</h2>
            <p>Cada módulo tendrá un objetivo claro, pero compartirá usuarios, organizaciones, clientes, instalaciones, activos y documentos cuando aporte valor.</p>
          </div>
          <div className="eco-pillars">
            {pillars.map(({ icon: Icon, title, text }) => (
              <article key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </section>
      </main>

      <footer className="eco-footer">
        <Brand />
        <p>IsiVoltPro · Aplicaciones técnicas para mantenimiento, instalaciones e inspecciones.</p>
      </footer>
    </div>
  );
}
