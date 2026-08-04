import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const authSource = readFileSync(new URL('../AuthApp.tsx', import.meta.url), 'utf8');
const reportSource = readFileSync(
  new URL('../../supabase/functions/generate-work-order-report/index.ts', import.meta.url),
  'utf8',
);

describe('tenant branding contract', () => {
  it('uses the organisation branding after authentication', () => {
    expect(authSource).toContain("select('id,nombre,branding_key')");
    expect(authSource).toContain('setActiveProductBrand(membership.brandKey)');
    expect(authSource).toContain('Cargando {brand.productName}');
    expect(authSource).not.toContain('Cargando HomeServe Operaciones');
  });

  it('derives PDF branding from the reserved tenant instead of request input', () => {
    expect(reportSource).toContain('maybeOne(client, "tenants", report.tenant_id)');
    expect(reportSource).toContain('data.tenant.branding_key');
    expect(reportSource).toContain('HomeServe OT Demo');
    expect(reportSource).toContain('document.setAuthor(brand.productName)');
    expect(reportSource).toContain('currentPage.drawText(brand.footer');
    expect(reportSource).not.toContain('body.brandingKey');
  });
});
