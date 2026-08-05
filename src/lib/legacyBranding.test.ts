import { describe, expect, it } from 'vitest';
import { normalizeLegacyBrandLabel, normalizeLegacyBrandText } from './legacyBranding';

describe('legacyBranding', () => {
  it.each([
    ['Administración Demo HomeServe', 'Administración Demo IsiVoltPro'],
    ['Técnico Demo HomeServe', 'Técnico Demo IsiVoltPro'],
    ['HomeServe', 'IsiVoltPro'],
  ])('normaliza la etiqueta exacta %s', (legacy, expected) => {
    expect(normalizeLegacyBrandLabel(legacy)).toBe(expected);
  });

  it('no sustituye nombres reales o textos que solo contienen una palabra parecida', () => {
    expect(normalizeLegacyBrandLabel('Empresa HomeServe Granada')).toBe('Empresa HomeServe Granada');
    expect(normalizeLegacyBrandLabel('IsiVoltPro')).toBe('IsiVoltPro');
  });

  it('normaliza únicamente frases antiguas conocidas dentro de una descripción', () => {
    expect(normalizeLegacyBrandText('Asignada a Técnico Demo HomeServe')).toBe('Asignada a Técnico Demo IsiVoltPro');
    expect(normalizeLegacyBrandText('Servicio prestado por Empresa HomeServe Granada')).toBe('Servicio prestado por Empresa HomeServe Granada');
  });
});
