import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TechnicalSystemStatus } from '../types/technicalSystem';
import {
  createInstallationTechnicalSystem,
  listInstallationTechnicalSystems,
  mapInstallationTechnicalSystem,
  setInstallationTechnicalSystemStatus,
  updateInstallationTechnicalSystem,
} from './installationTechnicalSystemRepository';

const row = {
  id: 'sys-a',
  tenant_id: 'tenant-a',
  instalacion_id: 'install-a',
  nombre: 'Electricidad BT',
  codigo: 'ELEC',
  especialidad: 'electricidad_bt',
  descripcion: 'Cuadros y distribución de baja tensión',
  criticidad: 'alta' as const,
  estado: 'activo' as TechnicalSystemStatus,
  created_at: '2026-08-10T10:00:00Z',
  updated_at: '2026-08-10T10:00:00Z',
};

function listClient(rows = [row]) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const isDeleted = vi.fn().mockReturnValue({ order });
  const eqInstallation = vi.fn().mockReturnValue({ is: isDeleted });
  const eqTenant = vi.fn().mockReturnValue({ eq: eqInstallation });
  const select = vi.fn().mockReturnValue({ eq: eqTenant });
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from } as unknown as SupabaseClient, from, eqTenant, eqInstallation, isDeleted, order };
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
  return { client: { from } as unknown as SupabaseClient, from, update, eqTenant, eqInstallation, eqId, isDeleted };
}

describe('installationTechnicalSystemRepository', () => {
  it('maps database rows to the technical system domain model', () => {
    expect(mapInstallationTechnicalSystem(row)).toEqual({
      id: 'sys-a',
      tenantId: 'tenant-a',
      installationId: 'install-a',
      name: 'Electricidad BT',
      code: 'ELEC',
      specialty: 'electricidad_bt',
      description: 'Cuadros y distribución de baja tensión',
      criticality: 'alta',
      status: 'activo',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    });
  });

  it('lists only systems scoped to tenant and installation', async () => {
    const mock = listClient();
    const systems = await listInstallationTechnicalSystems(mock.client, 'tenant-a', 'install-a');

    expect(mock.from).toHaveBeenCalledWith('sistemas_instalacion');
    expect(mock.eqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-a');
    expect(mock.eqInstallation).toHaveBeenCalledWith('instalacion_id', 'install-a');
    expect(mock.isDeleted).toHaveBeenCalledWith('deleted_at', null);
    expect(mock.order).toHaveBeenCalledWith('nombre', { ascending: true });
    expect(systems).toHaveLength(1);
  });

  it('creates a system with normalized optional fields', async () => {
    const mock = createClient();

    await createInstallationTechnicalSystem(mock.client, {
      tenantId: 'tenant-a',
      installationId: 'install-a',
      name: '  Electricidad BT  ',
      code: '  ELEC  ',
      specialty: '  electricidad_bt  ',
      description: '  Cuadros y distribución  ',
      criticality: 'alta',
      status: 'activo',
    });

    expect(mock.insert).toHaveBeenCalledWith({
      tenant_id: 'tenant-a',
      instalacion_id: 'install-a',
      nombre: 'Electricidad BT',
      codigo: 'ELEC',
      especialidad: 'electricidad_bt',
      descripcion: 'Cuadros y distribución',
      criticidad: 'alta',
      estado: 'activo',
    });
  });

  it('updates only the requested tenant installation and system', async () => {
    const mock = updateClient();

    await updateInstallationTechnicalSystem(mock.client, 'tenant-a', 'install-a', 'sys-a', {
      name: 'Distribución eléctrica',
      code: '',
      specialty: 'electricidad_bt',
      description: '',
      criticality: 'critica',
      status: 'fuera_servicio',
    });

    expect(mock.eqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-a');
    expect(mock.eqInstallation).toHaveBeenCalledWith('instalacion_id', 'install-a');
    expect(mock.eqId).toHaveBeenCalledWith('id', 'sys-a');
    expect(mock.isDeleted).toHaveBeenCalledWith('deleted_at', null);
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Distribución eléctrica',
      codigo: null,
      especialidad: 'electricidad_bt',
      descripcion: null,
      criticidad: 'critica',
      estado: 'fuera_servicio',
    }));
  });

  it('changes status without exposing physical deletion', async () => {
    const mock = updateClient({ ...row, estado: 'inactivo' as TechnicalSystemStatus });

    const result = await setInstallationTechnicalSystemStatus(mock.client, 'tenant-a', 'install-a', 'sys-a', 'inactivo');

    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ estado: 'inactivo' }));
    expect(mock.eqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-a');
    expect(mock.eqInstallation).toHaveBeenCalledWith('instalacion_id', 'install-a');
    expect(mock.eqId).toHaveBeenCalledWith('id', 'sys-a');
    expect(result.status).toBe('inactivo');
  });
});
