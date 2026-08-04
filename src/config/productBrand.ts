import { useEffect, useState } from 'react';

export type ProductBrandKey = 'isivoltpro' | 'homeserve-demo';

export type ProductBrandConfig = {
  key: ProductBrandKey;
  productName: string;
  wordmarkStart: string;
  wordmarkAccent: string;
  wordmarkEnd: string;
  badge: string;
  descriptor: string;
  supportingText: string;
  footerText: string;
  ariaLabel: string;
  documentTitle: string;
  description: string;
  themeColor: string;
  manifestFilename: string;
  icon: 'zap' | 'home';
  demo: boolean;
};

export const PRODUCT_BRANDS: Record<ProductBrandKey, ProductBrandConfig> = {
  isivoltpro: {
    key: 'isivoltpro',
    productName: 'IsiVoltPro OT',
    wordmarkStart: 'ISI',
    wordmarkAccent: 'VOLT',
    wordmarkEnd: 'PRO',
    badge: 'Operaciones',
    descriptor: 'Gestión de órdenes de trabajo',
    supportingText: 'Una aplicación del ecosistema IsiVoltPro',
    footerText: 'IsiVoltPro OT · Parte del ecosistema IsiVoltPro',
    ariaLabel: 'IsiVoltPro OT · Gestión profesional de órdenes de trabajo',
    documentTitle: 'IsiVoltPro OT · Gestión de órdenes de trabajo',
    description: 'IsiVoltPro OT: gestión profesional de órdenes de trabajo, técnicos, clientes, instalaciones e informes de mantenimiento.',
    themeColor: '#172033',
    manifestFilename: 'manifest.webmanifest',
    icon: 'zap',
    demo: false,
  },
  'homeserve-demo': {
    key: 'homeserve-demo',
    productName: 'HomeServe OT Demo',
    wordmarkStart: 'HOME',
    wordmarkAccent: 'SERVE',
    wordmarkEnd: '',
    badge: 'Demostración',
    descriptor: 'Gestión de órdenes de trabajo',
    supportingText: 'Versión demostrativa basada en IsiVoltPro OT',
    footerText: 'HomeServe OT Demo · Demostración creada con IsiVoltPro OT',
    ariaLabel: 'HomeServe OT Demo · Gestión profesional de órdenes de trabajo',
    documentTitle: 'HomeServe OT Demo · Gestión de órdenes de trabajo',
    description: 'Entorno demostrativo de gestión de órdenes de trabajo basado en IsiVoltPro OT.',
    themeColor: '#e30613',
    manifestFilename: 'manifest-homeserve.webmanifest',
    icon: 'home',
    demo: true,
  },
};

type RuntimeBrandInput = {
  hostname?: string;
  pathname?: string;
  search?: string;
  envBrand?: string;
};

const BRAND_EVENT = 'isivoltpro:brand-change';

function normalizeBrandKey(value: string | null | undefined): ProductBrandKey | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'homeserve' || normalized === 'homeserve-demo') return 'homeserve-demo';
  if (normalized === 'isivoltpro' || normalized === 'isivoltpro-ot') return 'isivoltpro';
  return null;
}

export function resolveProductBrand(input: RuntimeBrandInput = {}): ProductBrandKey {
  const envBrand = normalizeBrandKey(input.envBrand);
  if (envBrand) return envBrand;

  const params = new URLSearchParams(input.search ?? '');
  const queryBrand = normalizeBrandKey(params.get('brand'));
  if (queryBrand) return queryBrand;

  const hostname = (input.hostname ?? '').toLowerCase();
  const pathname = (input.pathname ?? '').toLowerCase();
  if (hostname.includes('homeserve') || pathname.includes('/homeserve-demo')) return 'homeserve-demo';
  return 'isivoltpro';
}

function browserRuntimeBrand(): ProductBrandKey {
  if (typeof window === 'undefined') {
    return normalizeBrandKey(import.meta.env.VITE_PRODUCT_BRAND) ?? 'isivoltpro';
  }

  return resolveProductBrand({
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    search: window.location.search,
    envBrand: import.meta.env.VITE_PRODUCT_BRAND,
  });
}

let activeBrandKey: ProductBrandKey = browserRuntimeBrand();

function setMeta(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (element) element.content = value;
}

export function applyProductBrand(key: ProductBrandKey = activeBrandKey): ProductBrandConfig {
  activeBrandKey = key;
  const brand = PRODUCT_BRANDS[key];
  if (typeof document === 'undefined') return brand;

  document.documentElement.dataset.productBrand = key;
  document.title = brand.documentTitle;
  setMeta('application-name', brand.productName);
  setMeta('description', brand.description);
  setMeta('theme-color', brand.themeColor);

  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest) manifest.href = `${import.meta.env.BASE_URL}${brand.manifestFilename}`;
  return brand;
}

export function setActiveProductBrand(key: ProductBrandKey | string | null | undefined) {
  const normalized = normalizeBrandKey(key) ?? browserRuntimeBrand();
  applyProductBrand(normalized);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(BRAND_EVENT, { detail: normalized }));
}

export function resetProductBrandFromRuntime() {
  setActiveProductBrand(browserRuntimeBrand());
}

export function getProductBrand(): ProductBrandConfig {
  return PRODUCT_BRANDS[activeBrandKey];
}

export function useProductBrand(): ProductBrandConfig {
  const [brand, setBrand] = useState(() => getProductBrand());

  useEffect(() => {
    const listener = () => setBrand(getProductBrand());
    window.addEventListener(BRAND_EVENT, listener);
    return () => window.removeEventListener(BRAND_EVENT, listener);
  }, []);

  return brand;
}
