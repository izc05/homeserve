import { describe, expect, it } from 'vitest';
import {
  allowedNextStatuses,
  assertWorkOrderTransition,
  canTransitionWorkOrder,
  isWorkOrderReadOnly,
} from './lifecycle';

describe('work order lifecycle', () => {
  it('permite el flujo normal desde borrador hasta validada', () => {
    expect(canTransitionWorkOrder('BORRADOR', 'ASIGNADA')).toBe(true);
    expect(canTransitionWorkOrder('ASIGNADA', 'ACEPTADA')).toBe(true);
    expect(canTransitionWorkOrder('ACEPTADA', 'EN_CURSO')).toBe(true);
    expect(canTransitionWorkOrder('EN_CURSO', 'FINALIZADA_TECNICO')).toBe(true);
    expect(canTransitionWorkOrder('FINALIZADA_TECNICO', 'VALIDADA')).toBe(true);
  });

  it('rechaza saltos de estado', () => {
    expect(canTransitionWorkOrder('BORRADOR', 'EN_CURSO')).toBe(false);
    expect(() => assertWorkOrderTransition('ASIGNADA', 'VALIDADA')).toThrow(
      'Transición de OT no permitida',
    );
  });

  it('permite solicitar correcciones', () => {
    expect(allowedNextStatuses('FINALIZADA_TECNICO')).toContain('EN_CURSO');
  });

  it('marca estados finales como solo lectura', () => {
    expect(isWorkOrderReadOnly('VALIDADA')).toBe(true);
    expect(isWorkOrderReadOnly('CANCELADA')).toBe(true);
    expect(isWorkOrderReadOnly('EN_CURSO')).toBe(false);
  });
});
