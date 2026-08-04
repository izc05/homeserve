import { useEffect, useState, type ComponentType } from 'react';
import {
  Boxes,
  ClipboardList,
  Gauge,
  QrCode,
  ShieldCheck,
  Snowflake,
  type LucideProps,
} from 'lucide-react';

const ROTATION_INTERVAL_MS = 7_000;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const sceneBackgrounds = [
  'data:image/webp;base64,UklGRooAAABXRUJQVlA4IH4AAACQBQCdASpgAGAAPrVaqVAnJSOioOgA4BaJaQVntYgAMfV0gc8ignEfZSZOra+XwVqWRjjYgAD+8iJcq9XmVUHxlU8s6QzXb9EKdNbTqrA+i6Z7LuyzgKEOiZlYIGTwCjLAQ78prtqDeRzjv5znEvrRDZWnyI0wkMQ7907YmAA=',
  'data:image/webp;base64,UklGRpIAAABXRUJQVlA4IIYAAADQBQCdASpgAGAAPrVaqVAnJSOioOgA4BaJaQDHIHUADv0KUs0Gye64p/HjevpEUdBS8rfdfJ4AAP7xlYwZbbTwiY9HRJK7eOqn7suclGG+2wPkIytqN9HAZbC5Az29mh0RvtwmNuiMAIWGW9B98cNfLx5hAmZ5qBVx3KIn0bgiDhWjgFAAAA==',
  'data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAACQBQCdASpgAGAAPrVaqVAnJSOioOgA4BaJaQZ6nSoAK0sigLwYoZvM9Ono3jvn21AuV9ePAAD+8U2uDLbYqLk/WKaNpYHDfU0RpQr/kkt/FqVftbfuDsg3IQD+jH1faXOGi08nF/iTk6B3Qe2IAAAA',
  'data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAABwBQCdASpgAGAAPrVaqVAnJSOioOgA4BaJaQDOZKAADv0Jc59tQDNliUKC3jxu2oFyvrx4AP7yIl2ygUBcMRhtieGHdZ1bGlYVGuPW/DCMiRPUToBXPCNSrGXABKoNnQrC3B9t5S2gPrbgubMDSw2j1AA=',
  'data:image/webp;base64,UklGRooAAABXRUJQVlA4IH4AAADQBQCdASpgAGAAPrVaqVAnJSOioOgA4BaJaQiRTgVlABL3rpA8Ovbm469izb7TndjaI3ROPsagAP68nLVpNIvOIw1sBFSeI/g/TCx9icCauBKi851u8vF1LzVwdzbVIWMbpEqQ7OhQ5RD5HMBEu26km/IVQCRC/N5xxVAAAAA=',
  'data:image/webp;base64,UklGRnIAAABXRUJQVlA4IGYAAABQBQCdASpgAGAAPrVaqVAnJSOioOgA4BaJaQDUjAJ+nkRa+Cs5JP48btqBcr69lQeeZAAA/vHcjwTTZA7k/S6Swv5NaU14aRFhpt18XBchIwM5PHX76RvOKEkP/Th9k8c2ty6kAAA=',
] as const;

type Scene = {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: ComponentType<LucideProps>;
  background: string;
};

const scenes: Scene[] = [
  {
    id: 'work-orders',
    label: 'Órdenes de trabajo',
    title: 'Planifica, asigna y valida cada intervención.',
    description: 'Coordinación, ejecución técnica, evidencias y cierre en un flujo claro.',
    icon: ClipboardList,
    background: sceneBackgrounds[0],
  },
  {
    id: 'tools-qr',
    label: 'Herramientas QR y NFC',
    title: 'Controla herramientas mediante QR y NFC.',
    description: 'Una escena limpia para identificar, prestar y devolver material con trazabilidad.',
    icon: QrCode,
    background: sceneBackgrounds[1],
  },
  {
    id: 'inventory',
    label: 'Inventario y almacén',
    title: 'Inventario y almacén siempre actualizados.',
    description: 'Consulta existencias, ubicaciones, responsables y movimientos desde una sola vista.',
    icon: Boxes,
    background: sceneBackgrounds[2],
  },
  {
    id: 'electrical',
    label: 'Inspecciones eléctricas',
    title: 'Inspecciones técnicas con información trazable.',
    description: 'Mediciones, defectos, evidencias y documentación vinculadas a cada instalación.',
    icon: Gauge,
    background: sceneBackgrounds[3],
  },
  {
    id: 'climate',
    label: 'Climatización y refrigeración',
    title: 'Cálculos y registros para climatización y refrigeración.',
    description: 'Parámetros operativos, equipos y revisiones presentados de forma técnica y legible.',
    icon: Snowflake,
    background: sceneBackgrounds[4],
  },
  {
    id: 'compliance',
    label: 'Legionella y PCI',
    title: 'Controles reglamentarios documentados.',
    description: 'Puntos de control, revisiones, fotografías y próximas actuaciones preparados para auditoría.',
    icon: ShieldCheck,
    background: sceneBackgrounds[5],
  },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(REDUCED_MOTION_QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

function SceneMockup({ sceneId }: { sceneId: string }) {
  return (
    <div className={`ecosystem-mockup ecosystem-mockup--${sceneId}`} aria-hidden="true">
      <div className="ecosystem-mockup-window">
        <div className="ecosystem-mockup-topbar">
          <span className="ecosystem-mockup-brand">IsiVolt<strong>Pro</strong></span>
          <span className="ecosystem-mockup-status">Sistema conectado</span>
        </div>
        <div className="ecosystem-mockup-body">
          <aside className="ecosystem-mockup-nav"><i /><i /><i /><i /></aside>
          <div className="ecosystem-mockup-content">
            <div className="ecosystem-mockup-heading"><span /><small /></div>
            <div className="ecosystem-mockup-kpis"><i /><i /><i /></div>
            <div className="ecosystem-mockup-stage">
              <span className="mockup-primary" />
              <span className="mockup-secondary" />
              <span className="mockup-accent" />
              <span className="mockup-detail" />
            </div>
          </div>
        </div>
      </div>
      <div className="ecosystem-mobile-card"><span /><strong /><small /><i /></div>
    </div>
  );
}

export default function AuthEcosystemVisual() {
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % scenes.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [reducedMotion]);

  const activeScene = scenes[activeIndex];
  const ActiveIcon = activeScene.icon;

  return (
    <section className="auth-visual" aria-label="Ecosistema de aplicaciones IsiVoltPro">
      <div className="auth-scenes" aria-hidden="true">
        {scenes.map((scene, index) => (
          <div
            className={`auth-scene ${index === activeIndex ? 'is-active' : ''}`}
            key={scene.id}
            style={{ backgroundImage: `url(${scene.background})` }}
          >
            <SceneMockup sceneId={scene.id} />
          </div>
        ))}
      </div>
      <div className="auth-visual-vignette" aria-hidden="true" />
      <div className="auth-visual-copy" aria-live="polite">
        <span className="auth-visual-icon"><ActiveIcon size={23} /></span>
        <small className="auth-visual-label">{activeScene.label}</small>
        <strong>{activeScene.title}</strong>
        <p>{activeScene.description}</p>
      </div>
      <div className="auth-scene-indicators" aria-label="Seleccionar escena del ecosistema">
        {scenes.map((scene, index) => (
          <button
            aria-label={`Mostrar ${scene.label}`}
            aria-pressed={index === activeIndex}
            className={index === activeIndex ? 'is-active' : ''}
            key={scene.id}
            onClick={() => setActiveIndex(index)}
            type="button"
          />
        ))}
      </div>
    </section>
  );
}

export { ROTATION_INTERVAL_MS, scenes };
