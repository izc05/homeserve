import { describe, expect, it } from 'vitest';
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

  it('deriva el motivo de bloqueo solo cuando el estado heredado lo permite', () => {
    expect(inferBlockReasonFromLegacyStatus('PENDIENTE_MATERIAL')).toBe('MATERIAL');
    expect(inferBlockReasonFromLegacyStatus('PENDIENTE_CLIENTE')).toBe('RESPONSABLE');
    expect(inferBlockReasonFromLegacyStatus('PAUSADA')).toBe('OTRO');
    expect(inferBlockReasonFromLegacyStatus('EN_CURSO')).toBeNull();
  });
});
