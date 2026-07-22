import { describe, expect, it } from 'vitest';
import { evaluateCompletionRequirements, type WorkOrderCompletionSupport } from './workOrderCompletionRepository';
import type { WorkOrderChecklistResponse } from './workOrderExecutionRepository';
import type { WorkOrderPhoto } from './workOrderPhotoRepository';
import type { WorkOrderRequirements } from '../types/workOrder';

const requirements: WorkOrderRequirements = {
  checklist: true,
  initialPhotos: true,
  finalPhotos: true,
  measurements: true,
  materials: true,
  technicianSignature: false,
  responsibleSignature: false,
  finalFunctionalTest: true,
  report: false,
  administrativeReview: true,
};

const support: WorkOrderCompletionSupport = {
  technicianSignatures: 0,
  responsibleSignatures: 0,
  reports: 0,
  latestVisit: null,
};

function checklistRow(overrides: Partial<WorkOrderChecklistResponse>): WorkOrderChecklistResponse {
  return {
    id: 'check-1',
    tenantId: 'tenant-1',
    workOrderId: 'order-1',
    templateItemId: 'identificacion',
    order: 10,
    point: 'Identificación',
    description: null,
    required: true,
    requiresPhoto: false,
    result: 'ok',
    responseType: 'ok_ko_na',
    observations: null,
    completedBy: 'tech-1',
    completedAt: '2026-07-22T06:00:00Z',
    ...overrides,
  };
}

function photo(overrides: Partial<WorkOrderPhoto>): WorkOrderPhoto {
  return {
    id: 'photo-1',
    tenantId: 'tenant-1',
    workOrderId: 'order-1',
    checklistResponseId: null,
    category: 'initial',
    storedType: 'inicial',
    bucket: 'ot-photos',
    path: 'tenant-1/order-1/foto/photo.jpg',
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    createdBy: 'tech-1',
    createdAt: '2026-07-22T06:00:00Z',
    signedUrl: 'https://example.test/signed',
    ...overrides,
  };
}

describe('evaluación de requisitos de finalización', () => {
  it('deriva checklist, fotos y requisitos técnicos de los datos recibidos', () => {
    const checklist = [
      checklistRow({ id: 'initial-state', templateItemId: 'estado_inicial', requiresPhoto: true, result: 'Correcto' }),
      checklistRow({ id: 'measurements', templateItemId: 'mediciones', result: '230 V' }),
      checklistRow({ id: 'materials', templateItemId: 'materiales', result: 'Sin consumo' }),
      checklistRow({ id: 'functional', templateItemId: 'prueba_funcional', result: 'ok' }),
    ];
    const photos = [
      photo({ id: 'initial-photo', checklistResponseId: 'initial-state', category: 'initial' }),
      photo({ id: 'final-photo', category: 'final', storedType: 'final' }),
    ];

    const result = evaluateCompletionRequirements(requirements, checklist, photos, support);

    expect(result.filter((item) => item.required).every((item) => item.complete)).toBe(true);
    expect(result.find((item) => item.id === 'checklist')?.detail).toBe('4 de 4 puntos completados');
    expect(result.find((item) => item.id === 'initial-photos')?.detail).toBe('1 registrada');
    expect(result.find((item) => item.id === 'final-photos')?.detail).toBe('1 registrada');
  });

  it('no sustituye requisitos ausentes por estados completados ficticios', () => {
    const optionalRequirements = Object.fromEntries(
      Object.keys(requirements).map((key) => [key, false]),
    ) as unknown as WorkOrderRequirements;

    const result = evaluateCompletionRequirements(optionalRequirements, [], [], support);

    expect(result.every((item) => !item.required)).toBe(true);
    expect(result.find((item) => item.id === 'checklist')?.complete).toBe(false);
    expect(result.find((item) => item.id === 'initial-photos')?.complete).toBe(false);
    expect(result.find((item) => item.id === 'report')?.detail).toBe('No disponible en esta versión');
  });

  it('marca como pendientes las funciones P2 configuradas que no tienen soporte registrado', () => {
    const p2Requirements = {
      ...requirements,
      checklist: false,
      initialPhotos: false,
      finalPhotos: false,
      measurements: false,
      materials: false,
      finalFunctionalTest: false,
      technicianSignature: true,
      responsibleSignature: true,
      report: true,
    };

    const pending = evaluateCompletionRequirements(p2Requirements, [], [], support)
      .filter((item) => item.required && !item.complete);

    expect(pending.map((item) => item.id)).toEqual([
      'technician-signature',
      'responsible-signature',
      'report',
    ]);
    expect(pending.every((item) => !item.available)).toBe(true);
  });
});
