import { describe, expect, it } from 'vitest';
import { installationLocationFormSchema } from './locationSchema';

describe('installationLocationFormSchema', () => {
  it('accepts a minimal active location', () => {
    expect(installationLocationFormSchema.parse({
      name: 'Sala de cuadros',
      code: '',
      type: '',
      description: '',
      status: 'activo',
    })).toEqual({
      name: 'Sala de cuadros',
      code: '',
      type: '',
      description: '',
      status: 'activo',
    });
  });

  it('allows an inactive location while preserving optional context', () => {
    expect(installationLocationFormSchema.parse({
      name: 'Habitación 312',
      code: 'P3-H312',
      type: 'habitación',
      description: 'Zona de hospitalización',
      status: 'inactivo',
    })).toMatchObject({
      name: 'Habitación 312',
      status: 'inactivo',
    });
  });

  it('rejects a location without a meaningful name', () => {
    expect(installationLocationFormSchema.safeParse({
      name: 'x',
      code: '',
      type: '',
      description: '',
      status: 'activo',
    }).success).toBe(false);
  });
});
