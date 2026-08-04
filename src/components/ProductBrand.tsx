import { Zap } from 'lucide-react';

export const DEMO_FOOTER_TEXT = 'IsiVoltPro OT · Parte del ecosistema IsiVoltPro';

type ProductBrandProps = {
  className?: string;
  variant?: 'auth' | 'navigation' | 'compact' | 'inverse';
};

export default function ProductBrand({ className = '', variant = 'navigation' }: ProductBrandProps) {
  return (
    <div
      aria-label="IsiVoltPro OT · Gestión profesional de órdenes de trabajo"
      className={`product-brand product-brand--${variant} ${className}`.trim()}
      role="group"
    >
      <span className="product-brand-logo-frame" aria-hidden="true">
        <span className="product-brand-symbol"><Zap color="#facc15" fill="currentColor" size={22} /></span>
        <span className="product-brand-wordmark">ISI<span>VOLT</span>PRO</span>
      </span>
      <span className="product-brand-copy">
        <span className="product-brand-title-row">
          <strong>IsiVoltPro OT</strong>
          <span className="product-brand-demo">Operaciones</span>
        </span>
        <span className="product-brand-descriptor">Gestión de órdenes de trabajo</span>
        <small>Una aplicación del ecosistema IsiVoltPro</small>
      </span>
    </div>
  );
}

export function DemoBrandFooter({ className = '' }: { className?: string }) {
  return <footer className={className}>{DEMO_FOOTER_TEXT}</footer>;
}
