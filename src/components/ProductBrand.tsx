import { House, Zap } from 'lucide-react';
import { useProductBrand } from '../config/productBrand';

type ProductBrandProps = {
  className?: string;
  variant?: 'auth' | 'navigation' | 'compact' | 'inverse';
};

export default function ProductBrand({ className = '', variant = 'navigation' }: ProductBrandProps) {
  const brand = useProductBrand();
  const Symbol = brand.icon === 'home' ? House : Zap;

  return (
    <div
      aria-label={brand.ariaLabel}
      className={`product-brand product-brand--${variant} ${className}`.trim()}
      data-brand={brand.key}
      role="group"
    >
      <span className="product-brand-logo-frame" aria-hidden="true">
        <span className="product-brand-symbol"><Symbol fill={brand.icon === 'zap' ? 'currentColor' : 'none'} size={22} /></span>
        <span className="product-brand-wordmark">
          {brand.wordmarkStart}<span>{brand.wordmarkAccent}</span>{brand.wordmarkEnd}
        </span>
      </span>
      <span className="product-brand-copy">
        <span className="product-brand-title-row">
          <strong>{brand.productName}</strong>
          <span className="product-brand-demo">{brand.badge}</span>
        </span>
        <span className="product-brand-descriptor">{brand.descriptor}</span>
        <small>{brand.supportingText}</small>
      </span>
    </div>
  );
}

export function ProductBrandFooter({ className = '' }: { className?: string }) {
  const brand = useProductBrand();
  return <footer className={className}>{brand.footerText}</footer>;
}

export const DemoBrandFooter = ProductBrandFooter;
