import { describe, expect, it } from 'vitest';
import {
  createWorkOrderSchema,
  localDateTimeToIso,
} from './createWorkOrderSchema';

const validValues = {
  title: 'Revisar cuadro principal',
  description: '',
  installationId: '11111111-1111-4111-8111-111111111111',
  locationId: '',
  assetId: '',
  technicianId: '',
  type: 'revision' as const,
  priority: 'normal' as const,
  plannedAt: '2026-07-18T08:00',
  dueAt: '2026-07-18T12:00',
  estimatedMinutes: 90,
  instructions: '',
  safetyNotes: '',
  expectedResult: '',
  checklist: true,
  initialPhotos: false,
  finalPhotos: true,
  measurements: false,
  materials: false,
  technicianSignature: true,
  responsibleSignature: false,
  finalFunctionalTest: false,
  report: true,
  administrativeReview: true,
};

describe('createWorkOrderSchema', () => {
  it('acepta una OT coherente', () => {
    expect(createWorkOrderSchema.safeParse(validValues).success).toBe(true);
  });

  it('rechaza una fecha límite anterior a la prevista', () => {
    const result = createWorkOrderSchema.safeParse({
      ...validValues,
      dueAt: '2026-07-18T07:00',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'dueAt')).toBe(true);
    }
  });

  it('rechaza títulos demasiado cortos', () => {
    expect(createWorkOrderSchema.safeParse({ ...validValues, title: 'OT' }).success).toBe(false);
  });
});

describe('localDateTimeToIso', () => {
  it('convierte un datetime-local válido a UTC', () => {
    const result = localDateTimeToIso('2026-07-18T08:00');
    expect(result).not.toBeNull();
    expect(new Date(result ?? '').toISOString()).toBe(result);
  });

  it('devuelve null cuando no hay fecha', () => {
    expect(localDateTimeToIso('')).toBeNull();
  });
});
