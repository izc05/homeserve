import { useState } from 'react';

export const DEMO_FOOTER_TEXT = 'Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro';

type ProductBrandProps = {
  className?: string;
  variant?: 'auth' | 'navigation' | 'compact' | 'inverse';
};

const logoSource = `${import.meta.env.BASE_URL}brand/homeserve-logo-red.png`;

export default function ProductBrand({ className = '', variant = 'navigation' }: ProductBrandProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div
      aria-label="HomeServe Operaciones · Gestión de órdenes de trabajo · Demostración"
      className={`product-brand product-brand--${variant} ${className}`.trim()}
      role="group"
    >
      <span className="product-brand-logo-frame">
        {logoFailed ? (
          <span aria-label="HomeServe" className="product-brand-logo-fallback" role="img">HomeServe</span>
        ) : (
          <img
            alt="HomeServe"
            decoding="async"
            height="58"
            onError={() => setLogoFailed(true)}
            src={logoSource}
            width="198"
          />
        )}
      </span>
      <span className="product-brand-copy">
        <span className="product-brand-title-row">
          <strong>HomeServe Operaciones</strong>
          <span className="product-brand-demo">Demostración</span>
        </span>
        <span className="product-brand-descriptor">Gestión de órdenes de trabajo</span>
        <small>Desarrollado por IsiVoltPro</small>
      </span>
    </div>
  );
}

export function DemoBrandFooter({ className = '' }: { className?: string }) {
  return <footer className={className}>{DEMO_FOOTER_TEXT}</footer>;
}
