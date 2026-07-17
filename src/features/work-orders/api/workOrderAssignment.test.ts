import { describe, expect, it } from 'vitest';
import { toAssignWorkOrderRpcArgs } from './workOrderAssignment';

describe('toAssignWorkOrderRpcArgs', () => {
  it('prepara la asignación con planificación y motivo normalizado', () => {
    expect(toAssignWorkOrderRpcArgs({
      workOrderId: '11111111-1111-4111-8111-111111111111',
      technicianId: '22222222-2222-4222-8222-222222222222',
      plannedAt: '2026-07-19T08:00:00.000Z',
      reason: '  Cambio de turno  ',
    })).toEqual({
      work_order_uuid: '11111111-1111-4111-8111-111111111111',
      technician_uuid: '22222222-2222-4222-8222-222222222222',
      planned_at_value: '2026-07-19T08:00:00.000Z',
      reassignment_reason_text: 'Cambio de turno',
    });
  });

  it('envía motivo nulo cuando está vacío', () => {
    expect(toAssignWorkOrderRpcArgs({
      workOrderId: '11111111-1111-4111-8111-111111111111',
      technicianId: '22222222-2222-4222-8222-222222222222',
      plannedAt: null,
      reason: '   ',
    }).reassignment_reason_text).toBeNull();
  });
});
