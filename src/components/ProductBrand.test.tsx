// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ProductBrand, { DemoBrandFooter, DEMO_FOOTER_TEXT } from './ProductBrand';

afterEach(cleanup);

describe('ProductBrand', () => {
  it('renders the official logo and complete demonstration identity', () => {
    render(<ProductBrand variant="auth" />);

    const logo = screen.getByRole('img', { name: 'HomeServe' });
    expect(logo.getAttribute('src')).toContain('/brand/homeserve-logo-red.png');
    expect(logo.getAttribute('width')).toBe('198');
    expect(logo.getAttribute('height')).toBe('58');
    expect(screen.getByText('HomeServe Operaciones')).toBeTruthy();
    expect(screen.getByText('Gestión de órdenes de trabajo')).toBeTruthy();
    expect(screen.getByText('Demostración')).toBeTruthy();
    expect(screen.getByText('Desarrollado por IsiVoltPro')).toBeTruthy();
  });

  it('keeps an accessible HomeServe fallback when the image cannot load', () => {
    render(<ProductBrand />);

    fireEvent.error(screen.getByAltText('HomeServe'));

    const fallback = screen.getByRole('img', { name: 'HomeServe' });
    expect(fallback.tagName).toBe('SPAN');
    expect(fallback.textContent).toBe('HomeServe');
    expect(screen.getByRole('group', { name: /HomeServe Operaciones/ })).toBeTruthy();
  });

  it('preserves the exact demonstration footer', () => {
    render(<DemoBrandFooter className="test-footer" />);
    expect(screen.getByText(DEMO_FOOTER_TEXT).textContent).toBe(
      'Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro',
    );
  });
});
