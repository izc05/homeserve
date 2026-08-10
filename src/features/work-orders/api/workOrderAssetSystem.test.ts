import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAsset } from './workOrderCommands';

function assetClient(systemId: string | null) {
  const single = vi.fn().mockResolvedValue({
    data: {
      id: 'asset-a',
      instalacion_id: 'install-a',
      ubicacion_id: null,
      sistema_id: systemId,
      nombre: 'Bomba 1',
    },
    error: null,
  });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });

  return {
    client: { from, auth: { getUser } } as unknown as SupabaseClient,
    from,
    insert,
    select,
  };
}

describe('createAsset technical system compatibility', () => {
  it('creates an asset without system when none is selected', async () => {
    const mock = assetClient(null);

    const created = await createAsset(mock.client, {
      tenantId: 'tenant-a',
      installationId: 'install-a',
      name: 'Bomba 1',
    });

    expect(mock.from).toHaveBeenCalledWith('activos');
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-a',
      instalacion_id: 'install-a',
      sistema_id: null,
      nombre: 'Bomba 1',
    }));
    expect(created.systemId).toBeNull();
  });

  it('persists the optional system id when supplied', async () => {
    const mock = assetClient('system-a');

    const created = await createAsset(mock.client, {
      tenantId: 'tenant-a',
      installationId: 'install-a',
      systemId: 'system-a',
      name: 'Bomba 1',
      type: 'bomba',
    });

    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
      sistema_id: 'system-a',
      nombre: 'Bomba 1',
      tipo: 'bomba',
    }));
    expect(mock.select).toHaveBeenCalledWith('id,instalacion_id,ubicacion_id,sistema_id,nombre');
    expect(created.systemId).toBe('system-a');
  });
});
