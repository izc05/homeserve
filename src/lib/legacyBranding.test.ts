import { describe, expect, it } from 'vitest';
import { normalizeLegacyBrandLabel, normalizeLegacyBrandText } from './legacyBranding';

const legacyBrand = ['Home', 'Serve'].join('');

describe('legacyBranding', () => {
  it.each([
    [`Administración Demo ${legacyBrand}`, 'Administración Demo IsiVoltPro'],
    [`Técnico Demo ${legacyBrand}`, 'Técnico Demo IsiVoltPro'],
    [legacyBrand, 'IsiVoltPro'],
  ])('normaliza la etiqueta exacta %s', (legacy, expected) => {
    expect(normalizeLegacyBrandLabel(legacy)).toBe(expected);
  });

  it('no sustituye nombres reales o textos que solo contienen una palabra parecida', () => {
    expect(normalizeLegacyBrandLabel(`Empresa ${legacyBrand} Granada`)).toBe(`Empresa ${legacyBrand} Granada`);
    expect(normalizeLegacyBrandLabel('IsiVoltPro')).toBe('IsiVoltPro');
  });

  it('normaliza únicamente frases antiguas conocidas dentro de una descripción', () => {
    expect(normalizeLegacyBrandText(`Asignada a Técnico Demo ${legacyBrand}`)).toBe('Asignada a Técnico Demo IsiVoltPro');
    expect(normalizeLegacyBrandText(`Servicio prestado por Empresa ${legacyBrand} Granada`)).toBe(`Servicio prestado por Empresa ${legacyBrand} Granada`);
  });
});
