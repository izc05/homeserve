import { describe, expect, it } from 'vitest';
import { installationTechnicalSystemFormSchema } from './technicalSystemSchema';

describe('installationTechnicalSystemFormSchema', () => {
  it('accepts a valid technical system', () => {
    expect(installationTechnicalSystemFormSchema.parse({
      name: 'Electricidad BT',
      code: 'ELEC',
      specialty: 'electricidad_bt',
      description: 'Cuadros y distribución',
      criticality: 'alta',
      status: 'activo',
    })).toEqual({
      name: 'Electricidad BT',
      code: 'ELEC',
      specialty: 'electricidad_bt',
      description: 'Cuadros y distribución',
      criticality: 'alta',
      status: 'activo',
    });
  });

  it('rejects short names and invalid status/criticality values', () => {
    expect(() => installationTechnicalSystemFormSchema.parse({
      name: 'X',
      code: '',
      specialty: 'general',
      description: '',
      criticality: 'extrema',
      status: 'averiado',
    })).toThrow();
  });

  it('keeps specialty as flexible text instead of a rigid global catalog', () => {
    const parsed = installationTechnicalSystemFormSchema.parse({
      name: 'Sistema cliente especial',
      specialty: 'sistema_especifico_cliente',
      criticality: 'media',
      status: 'activo',
    });

    expect(parsed.specialty).toBe('sistema_especifico_cliente');
  });
});
