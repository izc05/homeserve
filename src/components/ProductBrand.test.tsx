// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ProductBrand, { DemoBrandFooter, DEMO_FOOTER_TEXT } from './ProductBrand';

afterEach(cleanup);

describe('ProductBrand', () => {
  it('renders the complete IsiVoltPro OT identity', () => {
    render(<ProductBrand variant="auth" />);

    expect(screen.getByRole('img', { name: 'IsiVoltPro' })).toBeTruthy();
    expect(screen.getByText('IsiVoltPro OT')).toBeTruthy();
    expect(screen.getByText('Gestión profesional de órdenes de trabajo')).toBeTruthy();
    expect(screen.getAllByText('Desarrollado por IsiVoltPro').length).toBeGreaterThan(0);
    expect(screen.getByRole('group', { name: /IsiVoltPro OT/ })).toBeTruthy();
  });

  it('does not expose third-party branding', () => {
    const { container } = render(<ProductBrand />);
    expect(container.textContent).not.toMatch(/HomeServe/i);
    expect(container.textContent).not.toMatch(/Demostración/i);
  });

  it('preserves the IsiVoltPro footer', () => {
    render(<DemoBrandFooter className="test-footer" />);
    expect(screen.getByText(DEMO_FOOTER_TEXT).textContent).toBe('Desarrollado por IsiVoltPro');
  });
});
