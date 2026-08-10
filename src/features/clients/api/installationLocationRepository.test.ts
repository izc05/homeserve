import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createInstallationLocation,
  listInstallationLocations,
  mapInstallationLocation,
  setInstallationLocationStatus,
  updateInstallationLocation,
} from './installationLocationRepository';

const row = {
  id: 'loc-a',
  tenant_id: 'tenant-a',
  instalacion_id: 'install-a',
  nombre: 'Sala de cuadros',
  codigo: 'SC-01',
  tipo: 'sala_tecnica',
  descripcion: 'Planta baja',
  estado: 'activo' as 'activo' | 'inactivo',
  created_at: '2026-08-10T08:00:00Z',
  updated_at: '2026-08-10T08:00:00Z',
};

function listClient(rows = [row]) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const isDeleted = vi.fn().mockReturnValue({ order });
  const eqInstallation = vi.fn().mockReturnValue({ is: isDeleted });
  const eqTenant = vi.fn().mockReturnValue({ eq: eqInstallation });
  const select = vi.fn().mockReturnValue({ eq: eqTenant });
  const from = vi.fn().mockReturnValue({ select });
  return {
    client: { from } as unknown as SupabaseClient,
    from,
    select,
    eqTenant,
    eqInstallation,
    isDeleted,
    order,
  };
}

function createClient(created = row) {
  const single = vi.fn().mockResolvedValue({ data: created, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  return { client: { from } as unknown as SupabaseClient, from, insert };
}

function updateClient(updated = row) {
  const single = vi.fn().mockResolvedValue({ data: updated, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const isDeleted = vi.fn().mockReturnValue({ select });
  const eqId = vi.fn().mockReturnValue({ is: isDeleted });
  const eqInstallation = vi.fn().mockReturnValue({ eq: eqId });
  const eqTenant = vi.fn().mockReturnValue({ eq: eqInstallation });
  const update = vi.fn().mockReturnValue({ eq: eqTenant });
  const from = vi.fn().mockReturnValue({ update });
  return {
    client: { from } as unknown as SupabaseClient,
    from,
    update,
    eqTenant,
    eqInstallation,
    eqId,
    isDeleted,
  };
}

describe('installationLocationRepository', () => {
  it('maps database rows to the location domain model', () => {
    expect(mapInstallationLocation(row)).toEqual({
      id: 'loc-a',
      tenantId: 'tenant-a',
      installationId: 'install-a',
      name: 'Sala de cuadros',
      code: 'SC-01',
      type: 'sala_tecnica',
      description: 'Planta baja',
      status: 'activo',
      createdAt: '2026-08-10T08:00:00Z',
      updatedAt: '2026-08-10T08:00:00Z',
    });
  });

  it('lists only locations scoped to tenant and installation', async () => {
    const mock = listClient();

    const locations = await listInstallationLocations(mock.client, 'tenant-a', 'install-a');

    expect(mock.from).toHaveBeenCalledWith('ubicaciones');
    expect(mock.eqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-a');
    expect(mock.eqInstallation).toHaveBeenCalledWith('instalacion_id', 'install-a');
    expect(mock.isDeleted).toHaveBeenCalledWith('deleted_at', null);
    expect(mock.order).toHaveBeenCalledWith('nombre', { ascending: true });
    expect(locations).toHaveLength(1);
  });

  it('creates a location with normalized optional fields', async () => {
    const mock = createClient();

    await createInstallationLocation(mock.client, {
      tenantId: 'tenant-a',
      installationId: 'install-a',
      name: '  Sala de cuadros  ',
      code: '  SC-01  ',
      type: '  sala_tecnica  ',
      description: '  Planta baja  ',
      status: 'activo',
    });

    expect(mock.insert).toHaveBeenCalledWith({
      tenant_id: 'tenant-a',
      instalacion_id: 'install-a',
      nombre: 'Sala de cuadros',
      codigo: 'SC-01',
      tipo: 'sala_tecnica',
      descripcion: 'Planta baja',
      estado: 'activo',
    });
  });

  it('updates only the requested tenant installation and location', async () => {
    const mock = updateClient();

    await updateInstallationLocation(mock.client, 'tenant-a', 'install-a', 'loc-a', {
      name: 'Cuarto eléctrico',
      code: '',
      type: 'sala_tecnica',
      description: '',
      status: 'activo',
    });

    expect(mock.eqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-a');
    expect(mock.eqInstallation).toHaveBeenCalledWith('instalacion_id', 'install-a');
    expect(mock.eqId).toHaveBeenCalledWith('id', 'loc-a');
    expect(mock.isDeleted).toHaveBeenCalledWith('deleted_at', null);
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Cuarto eléctrico',
      codigo: null,
      tipo: 'sala_tecnica',
      descripcion: null,
      estado: 'activo',
    }));
  });

  it('changes status by soft state without exposing physical deletion', async () => {
    const mock = updateClient({ ...row, estado: 'inactivo' });

    const result = await setInstallationLocationStatus(mock.client, 'tenant-a', 'install-a', 'loc-a', 'inactivo');

    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ estado: 'inactivo' }));
    expect(mock.eqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-a');
    expect(mock.eqInstallation).toHaveBeenCalledWith('instalacion_id', 'install-a');
    expect(mock.eqId).toHaveBeenCalledWith('id', 'loc-a');
    expect(result.status).toBe('inactivo');
  });
});
