import { describe, expect, it } from 'vitest';
import { PRODUCT_BRANDS, resolveProductBrand } from './productBrand';

describe('configuración de marca del producto', () => {
  it('usa IsiVoltPro OT por defecto', () => {
    expect(resolveProductBrand({ hostname: 'ot.isivoltpro.es' })).toBe('isivoltpro');
    expect(PRODUCT_BRANDS.isivoltpro.demo).toBe(false);
  });

  it('detecta la demostración HomeServe por dominio', () => {
    expect(resolveProductBrand({ hostname: 'demo-homeserve.isivoltpro.es' })).toBe('homeserve-demo');
    expect(PRODUCT_BRANDS['homeserve-demo'].demo).toBe(true);
  });

  it('permite previsualizar una marca mediante query o variable de entorno', () => {
    expect(resolveProductBrand({ search: '?brand=homeserve-demo' })).toBe('homeserve-demo');
    expect(resolveProductBrand({ hostname: 'demo-homeserve.isivoltpro.es', envBrand: 'isivoltpro' })).toBe('isivoltpro');
  });
});
