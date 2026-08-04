// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ProductBrand, { DemoBrandFooter, DEMO_FOOTER_TEXT } from './ProductBrand';

afterEach(cleanup);

describe('ProductBrand', () => {
  it('renders the accessible IsiVoltPro OT identity', () => {
    render(<ProductBrand variant="auth" />);

    expect(screen.getByRole('group', { name: /IsiVoltPro OT · Gestión profesional/ })).toBeTruthy();
    expect(screen.getByText('IsiVoltPro OT')).toBeTruthy();
    expect(screen.getByText('Gestión de órdenes de trabajo')).toBeTruthy();
    expect(screen.getByText('Operaciones')).toBeTruthy();
    expect(screen.getByText('Una aplicación del ecosistema IsiVoltPro')).toBeTruthy();
  });

  it('uses its own vector identity without third-party brand images', () => {
    const { container } = render(<ProductBrand variant="inverse" />);

    expect(container.querySelector('.product-brand--inverse')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText(/HomeServe/i)).toBeNull();
  });

  it('preserves the exact IsiVoltPro ecosystem footer', () => {
    render(<DemoBrandFooter className="test-footer" />);
    expect(screen.getByText(DEMO_FOOTER_TEXT).textContent).toBe(
      'IsiVoltPro OT · Parte del ecosistema IsiVoltPro',
    );
  });
});
