import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { reviewWorkOrder } from './workOrderReview';

describe('revisión administrativa de OT', () => {
  it('envía la decisión y la nota normalizada a la RPC existente', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { id: 'order-1', estado: 'VALIDADA', revision_admin_estado: 'validada' },
      error: null,
    });

    const result = await reviewWorkOrder({ rpc } as unknown as SupabaseClient, {
      workOrderId: 'order-1',
      decision: 'validada',
      notes: '  Evidencias revisadas  ',
    });

    expect(rpc).toHaveBeenCalledWith('review_work_order', {
      work_order_uuid: 'order-1',
      decision_text: 'validada',
      notes_text: 'Evidencias revisadas',
    });
    expect(result.estado).toBe('VALIDADA');
  });

  it('impide enviar una revisión sin nota', async () => {
    await expect(reviewWorkOrder({} as SupabaseClient, {
      workOrderId: 'order-1',
      decision: 'correccion_solicitada',
      notes: '   ',
    })).rejects.toThrow('Indica una nota de revisión');
  });

  it('propaga el error seguro de Supabase', async () => {
    const error = new Error('La revisión no es válida');
    const rpc = vi.fn().mockResolvedValue({ data: null, error });

    await expect(reviewWorkOrder({ rpc } as unknown as SupabaseClient, {
      workOrderId: 'order-1',
      decision: 'validada',
      notes: 'Revisión completa',
    })).rejects.toBe(error);
  });
});
