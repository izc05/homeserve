import { describe, expect, it } from 'vitest';
import { quickCreateWorkOrderSchema } from '../forms/quickCreateWorkOrderSchema';
import { buildQuickWorkOrderInput, QUICK_WORK_ORDER_REQUIREMENTS } from './quickWorkOrder';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const INSTALLATION_ID = '33333333-3333-4333-8333-333333333333';
const LOCATION_ID = '44444444-4444-4444-8444-444444444444';
const ASSET_ID = '55555555-5555-4555-8555-555555555555';

describe('quickCreateWorkOrderSchema', () => {
  it('accepts a minimal quick fault without location or asset', () => {
    const parsed = quickCreateWorkOrderSchema.parse({
      clientId: CLIENT_ID,
      installationId: INSTALLATION_ID,
      locationId: '',
      assetId: '',
      title: 'Luz averiada en habitación 312',
      description: '',
      priority: 'normal',
    });

    expect(parsed.locationId).toBe('');
    expect(parsed.assetId).toBe('');
  });

  it('requires client, installation and a meaningful problem title', () => {
    const result = quickCreateWorkOrderSchema.safeParse({
      clientId: '',
      installationId: '',
      locationId: '',
      assetId: '',
      title: 'x',
      description: '',
      priority: 'normal',
    });

    expect(result.success).toBe(false);
  });
});

describe('buildQuickWorkOrderInput', () => {
  it('creates an unassigned breakdown draft without forcing an asset or schedule', () => {
    const values = quickCreateWorkOrderSchema.parse({
      clientId: CLIENT_ID,
      installationId: INSTALLATION_ID,
      locationId: '',
      assetId: '',
      title: '  Fuga de agua en aseo  ',
      description: '  Revisar llave de corte  ',
      priority: 'urgente',
    });

    expect(buildQuickWorkOrderInput(TENANT_ID, values)).toEqual({
      tenantId: TENANT_ID,
      installationId: INSTALLATION_ID,
      locationId: null,
      assetId: null,
      technicianId: null,
      title: 'Fuga de agua en aseo',
      description: 'Revisar llave de corte',
      type: 'averia',
      priority: 'urgente',
      plannedAt: null,
      dueAt: null,
      estimatedMinutes: null,
      instructions: null,
      safetyNotes: null,
      expectedResult: null,
      requirements: QUICK_WORK_ORDER_REQUIREMENTS,
    });
  });

  it('keeps optional structured location and asset when they are already known', () => {
    const values = quickCreateWorkOrderSchema.parse({
      clientId: CLIENT_ID,
      installationId: INSTALLATION_ID,
      locationId: LOCATION_ID,
      assetId: ASSET_ID,
      title: 'Equipo sin alimentación',
      description: '',
      priority: 'alta',
    });

    expect(buildQuickWorkOrderInput(TENANT_ID, values)).toMatchObject({
      locationId: LOCATION_ID,
      assetId: ASSET_ID,
      technicianId: null,
      type: 'averia',
      priority: 'alta',
    });
  });

  it('does not require unavailable signature or report features for quick closure', () => {
    expect(QUICK_WORK_ORDER_REQUIREMENTS).toEqual({
      checklist: false,
      initialPhotos: false,
      finalPhotos: true,
      measurements: false,
      materials: false,
      technicianSignature: false,
      responsibleSignature: false,
      finalFunctionalTest: false,
      report: false,
      administrativeReview: true,
    });
  });

  it('rejects an empty tenant before any backend call', () => {
    const values = quickCreateWorkOrderSchema.parse({
      clientId: CLIENT_ID,
      installationId: INSTALLATION_ID,
      locationId: '',
      assetId: '',
      title: 'Avería general',
      description: '',
      priority: 'normal',
    });

    expect(() => buildQuickWorkOrderInput('', values)).toThrow('Selecciona una organización');
  });
});
