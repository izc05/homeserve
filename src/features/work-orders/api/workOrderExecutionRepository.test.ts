import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  checklistProgress,
  listWorkOrderChecklist,
  saveWorkOrderChecklistResponse,
} from './workOrderExecutionRepository';

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  tenant_id: '22222222-2222-4222-8222-222222222222',
  ot_id: '33333333-3333-4333-8333-333333333333',
  plantilla_item_id: 'seguridad',
  orden: 20,
  punto: 'Seguridad',
  titulo: null,
  descripcion: 'Revisar condiciones.',
  obligatorio: true,
  requiere_foto: false,
  resultado: null,
  tipo_respuesta: 'ok_ko_na',
  observaciones: null,
  completed_by: null,
  completed_at: null,
};

function queryClient() {
  const finalOrder = vi.fn(async () => ({ data: [row], error: null }));
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValueOnce(chain).mockImplementation(finalOrder);
  const rpc = vi.fn(async () => ({ data: { ...row, resultado: 'ok', observaciones: 'Correcto' }, error: null }));
  return {
    client: { from: vi.fn(() => chain), rpc } as unknown as SupabaseClient,
    chain,
    rpc,
  };
}

describe('work order execution repository', () => {
  it('lee el checklist en el orden persistido y calcula el progreso', async () => {
    const { client, chain } = queryClient();
    const result = await listWorkOrderChecklist(client, row.ot_id);

    expect(chain.eq).toHaveBeenCalledWith('ot_id', row.ot_id);
    expect(chain.order).toHaveBeenNthCalledWith(1, 'orden', { ascending: true });
    expect(result[0]).toMatchObject({ point: 'Seguridad', responseType: 'ok_ko_na', result: null });
    expect(checklistProgress(result)).toEqual({ completed: 0, conforming: 0, total: 1 });
    expect(checklistProgress([{ ...result[0], result: 'ok' }])).toEqual({ completed: 1, conforming: 1, total: 1 });
  });

  it('guarda solo respuesta y observaciones mediante la RPC segura', async () => {
    const { client, rpc } = queryClient();
    const result = await saveWorkOrderChecklistResponse(client, {
      responseId: row.id,
      result: ' ok ',
      observations: ' Correcto ',
    });

    expect(rpc).toHaveBeenCalledWith('save_work_order_checklist_response_v2', {
      checklist_response_uuid: row.id,
      result_text: 'ok',
      numeric_value: null,
      observations_text: 'Correcto',
    });
    expect(result).toMatchObject({ result: 'ok', observations: 'Correcto' });
  });
});
