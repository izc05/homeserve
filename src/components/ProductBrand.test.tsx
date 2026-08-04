// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setActiveProductBrand } from '../config/productBrand';
import ProductBrand, { ProductBrandFooter } from './ProductBrand';

afterEach(() => {
  cleanup();
  setActiveProductBrand('isivoltpro');
});

describe('ProductBrand', () => {
  it('renderiza la identidad accesible de IsiVoltPro OT', () => {
    setActiveProductBrand('isivoltpro');
    render(<ProductBrand variant="auth" />);

    expect(screen.getByRole('group', { name: /IsiVoltPro OT · Gestión profesional/ })).toBeTruthy();
    expect(screen.getByText('IsiVoltPro OT')).toBeTruthy();
    expect(screen.getByText('Operaciones')).toBeTruthy();
    expect(screen.getByText('Una aplicación del ecosistema IsiVoltPro')).toBeTruthy();
  });

  it('renderiza HomeServe como demostración del mismo producto', () => {
    setActiveProductBrand('homeserve-demo');
    render(<ProductBrand variant="inverse" />);

    expect(screen.getByRole('group', { name: /HomeServe OT Demo/ })).toBeTruthy();
    expect(screen.getByText('HomeServe OT Demo')).toBeTruthy();
    expect(screen.getByText('Demostración')).toBeTruthy();
    expect(screen.getByText('Versión demostrativa basada en IsiVoltPro OT')).toBeTruthy();
  });

  it('mantiene una identidad vectorial propia sin imágenes de terceros', () => {
    const { container } = render(<ProductBrand variant="inverse" />);
    expect(container.querySelector('.product-brand--inverse')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('adapta el pie a la marca activa', () => {
    setActiveProductBrand('homeserve-demo');
    render(<ProductBrandFooter className="test-footer" />);
    expect(screen.getByText('HomeServe OT Demo · Demostración creada con IsiVoltPro OT')).toBeTruthy();
  });
});
