import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { listAssetMaintenanceHistory, listWorkOrderAssetHistory } from './assetHistoryRepository';

function createQueryMock(data: unknown[], error: unknown = null) {
  const result = Promise.resolve({ data, error });
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: result.then.bind(result),
  };
  return chain;
}

describe('assetHistoryRepository', () => {
  it('consulta histórico por activo con filtros de organización', async () => {
    const rows = [{
      id: 'hist-1',
      tenant_id: 'tenant-1',
      activo_id: 'asset-1',
      ot_id: 'ot-1',
      mantenimiento_programado_id: null,
      plan_id: null,
      fecha: '2026-07-18',
      tipo: 'preventivo',
      titulo: 'Revisión validada',
      descripcion: null,
      tecnico_id: 'tech-1',
      estado_final: 'ot_validada',
      proxima_accion: null,
      origen: 'ot_validada',
      fecha_inicio: null,
      fecha_fin: null,
      trabajo_previsto: null,
      trabajo_realizado: 'Trabajo realizado',
      resultado: 'validada',
      estado_activo_final: 'correcto',
      proxima_fecha: '2026-08-18',
      observaciones: null,
      created_at: '2026-07-18T10:00:00.000Z',
    }];
    const query = createQueryMock(rows);
    const supabase = { from: vi.fn(() => query) };

    const result = await listAssetMaintenanceHistory(supabase as unknown as SupabaseClient, {
      tenantId: 'tenant-1',
      assetId: 'asset-1',
      limit: 20,
    });

    expect(supabase.from).toHaveBeenCalledWith('historial_mantenimiento');
    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(query.eq).toHaveBeenCalledWith('activo_id', 'asset-1');
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(result[0]).toMatchObject({
      id: 'hist-1',
      tenantId: 'tenant-1',
      assetId: 'asset-1',
      workOrderId: 'ot-1',
      title: 'Revisión validada',
      nextDate: '2026-08-18',
    });
  });

  it('consulta histórico desde una OT concreta', async () => {
    const query = createQueryMock([]);
    const supabase = { from: vi.fn(() => query) };

    await listWorkOrderAssetHistory(supabase as unknown as SupabaseClient, {
      tenantId: 'tenant-1',
      workOrderId: 'ot-1',
    });

    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(query.eq).toHaveBeenCalledWith('ot_id', 'ot-1');
    expect(query.limit).toHaveBeenCalledWith(10);
  });

  it('bloquea consultas sin organización', async () => {
    const supabase = { from: vi.fn() };

    await expect(listAssetMaintenanceHistory(supabase as unknown as SupabaseClient, { tenantId: '' })).rejects.toThrow(
      'Selecciona una organización',
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
