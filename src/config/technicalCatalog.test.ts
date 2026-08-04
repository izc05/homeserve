import { describe, expect, it } from 'vitest';
import {
  INSTALLATION_SECTORS,
  TECHNICAL_SPECIALTIES,
  TECHNICAL_SPECIALTY_KEYS,
  isTechnicalSpecialtyKey,
  technicalSpecialtyLabel,
} from './technicalCatalog';

describe('technicalCatalog', () => {
  it('trata fotovoltaica como una especialidad más del catálogo', () => {
    expect(TECHNICAL_SPECIALTY_KEYS[0]).toBe('general');
    expect(TECHNICAL_SPECIALTY_KEYS).toContain('fotovoltaica');
    expect(TECHNICAL_SPECIALTY_KEYS).toContain('climatizacion');
    expect(TECHNICAL_SPECIALTY_KEYS).toContain('pci');
    expect(TECHNICAL_SPECIALTY_KEYS).toContain('gases_medicinales');
    expect(TECHNICAL_SPECIALTIES.length).toBeGreaterThanOrEqual(20);
  });

  it('incluye sectores de instalaciones no energéticos', () => {
    const sectors = INSTALLATION_SECTORS.map(([key]) => key);
    expect(sectors).toContain('hospitalario');
    expect(sectors).toContain('industrial');
    expect(sectors).toContain('residencial');
  });

  it('resuelve etiquetas y valida claves conocidas', () => {
    expect(technicalSpecialtyLabel('electricidad_bt')).toBe('Electricidad BT');
    expect(technicalSpecialtyLabel('desconocida')).toBe('desconocida');
    expect(isTechnicalSpecialtyKey('fotovoltaica')).toBe(true);
    expect(isTechnicalSpecialtyKey('inventada')).toBe(false);
  });
});
