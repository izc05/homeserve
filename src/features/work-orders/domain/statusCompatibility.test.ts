import { describe, expect, it } from 'vitest';
import { WORK_ORDER_STATUSES } from '../types/workOrder';
import {
  inferBlockReasonFromLegacyStatus,
  normalizeWorkOrderStatus,
} from './statusCompatibility';

describe('legacy work-order status compatibility', () => {
  it.each([
    ['BORRADOR', 'BORRADOR'],
    ['NUEVA', 'BORRADOR'],
    ['ASIGNADA', 'ASIGNADA'],
    ['ACEPTADA', 'ACEPTADA'],
    ['EN_CURSO', 'EN_CURSO'],
    ['PAUSADA', 'BLOQUEADA'],
    ['PENDIENTE_MATERIAL', 'BLOQUEADA'],
    ['PENDIENTE_CLIENTE', 'BLOQUEADA'],
    ['FINALIZADA', 'FINALIZADA_TECNICO'],
    ['FIRMADA', 'FINALIZADA_TECNICO'],
    ['INFORME_GENERADO', 'FINALIZADA_TECNICO'],
    ['VALIDADA', 'VALIDADA'],
    ['CERRADA', 'VALIDADA'],
    ['CANCELADA', 'CANCELADA'],
  ])('normaliza %s como %s', (legacy, expected) => {
    expect(normalizeWorkOrderStatus(legacy)).toBe(expected);
  });

  it('rechaza un estado desconocido en lugar de inventar un valor por defecto', () => {
    expect(() => normalizeWorkOrderStatus('DESCONOCIDA')).toThrow(
      'Estado de OT heredado no reconocido: DESCONOCIDA',
    );
  });

  it('acepta FINALIZADA_TECNICO como estado canónico sin convertirlo', () => {
    expect(normalizeWorkOrderStatus('FINALIZADA_TECNICO')).toBe('FINALIZADA_TECNICO');
    expect(inferBlockReasonFromLegacyStatus('FINALIZADA_TECNICO')).toBeNull();
  });

  it.each(WORK_ORDER_STATUSES)('acepta el estado canónico %s sin conversión', (status) => {
    expect(normalizeWorkOrderStatus(status)).toBe(status);
  });

  it('deriva el motivo de bloqueo solo cuando el estado heredado lo permite', () => {
    expect(inferBlockReasonFromLegacyStatus('PENDIENTE_MATERIAL')).toBe('MATERIAL');
    expect(inferBlockReasonFromLegacyStatus('PENDIENTE_CLIENTE')).toBe('RESPONSABLE');
    expect(inferBlockReasonFromLegacyStatus('PAUSADA')).toBe('OTRO');
    expect(inferBlockReasonFromLegacyStatus('EN_CURSO')).toBeNull();
  });
});
