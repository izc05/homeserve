export const DEMO_FOOTER_TEXT = 'Desarrollado por IsiVoltPro';

export const PRODUCT_NAME = 'IsiVoltPro OT';
export const PRODUCT_DESCRIPTOR = 'Gestión profesional de órdenes de trabajo';

type ProductBrandProps = {
  className?: string;
  variant?: 'auth' | 'navigation' | 'compact' | 'inverse';
};

export default function ProductBrand({ className = '', variant = 'navigation' }: ProductBrandProps) {
  return (
    <div
      aria-label={`${PRODUCT_NAME} · ${PRODUCT_DESCRIPTOR}`}
      className={`product-brand product-brand--${variant} ${className}`.trim()}
      role="group"
    >
      <span className="product-brand-logo-frame" aria-label="IsiVoltPro" role="img">
        <span className="product-brand-symbol" aria-hidden="true">I</span>
        <span className="product-brand-wordmark" aria-hidden="true">
          <span>IsiVolt</span><strong>Pro</strong>
        </span>
      </span>
      <span className="product-brand-copy">
        <span className="product-brand-title-row">
          <strong>{PRODUCT_NAME}</strong>
        </span>
        <span className="product-brand-descriptor">{PRODUCT_DESCRIPTOR}</span>
        <small>Desarrollado por IsiVoltPro</small>
      </span>
    </div>
  );
}

export function DemoBrandFooter({ className = '' }: { className?: string }) {
  return <footer className={className}>{DEMO_FOOTER_TEXT}</footer>;
}
