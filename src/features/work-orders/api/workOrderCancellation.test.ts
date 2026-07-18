import { describe, expect, it, vi } from 'vitest';
import { cancelWorkOrder, canCancelWorkOrder } from './workOrderCancellation';

describe('workOrderCancellation', () => {
  it('bloquea anulaciones sin motivo suficiente', async () => {
    const supabase = { rpc: vi.fn() };

    await expect(cancelWorkOrder(supabase as any, { workOrderId: 'ot-1', reason: 'no' })).rejects.toThrow(
      'motivo de anulación',
    );
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('llama al RPC con motivo normalizado', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          id: 'ot-1',
          codigo_ot: 'OT-001',
          estado: 'CANCELADA',
          deleted_at: '2026-07-18T10:00:00.000Z',
        },
        error: null,
      }),
    };

    const result = await cancelWorkOrder(supabase as any, {
      workOrderId: 'ot-1',
      reason: '  Duplicada por error  ',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('soft_delete_work_order', {
      work_order_uuid: 'ot-1',
      reason_text: 'Duplicada por error',
    });
    expect(result).toEqual({
      id: 'ot-1',
      code: 'OT-001',
      status: 'CANCELADA',
      deletedAt: '2026-07-18T10:00:00.000Z',
    });
  });

  it('solo permite anular estados abiertos', () => {
    expect(canCancelWorkOrder('ASIGNADA')).toBe(true);
    expect(canCancelWorkOrder('EN_CURSO')).toBe(true);
    expect(canCancelWorkOrder('FINALIZADA_TECNICO')).toBe(false);
    expect(canCancelWorkOrder('VALIDADA')).toBe(false);
    expect(canCancelWorkOrder('CANCELADA')).toBe(false);
  });
});
