import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { acceptWorkOrder, startWorkOrderVisit } from '../../work-orders/api/workOrderLifecycle';
import { assignWorkOrder } from '../../work-orders/api/workOrderAssignment';
import { toCreateWorkOrderRpcArgs, type CreateWorkOrderInput } from '../../work-orders/api/workOrderCommands';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import { visibleNavigationForRole } from '../technicianAccess';
import { createTechnicianActionGuard, groupTechnicianOrders } from '../technicianMobile';

const orderId = '11111111-1111-4111-8111-111111111111';
const technicianId = '22222222-2222-4222-8222-222222222222';

function createInput(technicianIdValue: string | null): CreateWorkOrderInput {
  return {
    tenantId: '33333333-3333-4333-8333-333333333333',
    installationId: '44444444-4444-4444-8444-444444444444',
    locationId: null,
    assetId: null,
    technicianId: technicianIdValue,
    title: 'Revisión del inversor',
    description: null,
    type: 'revision',
    priority: 'alta',
    plannedAt: null,
    dueAt: null,
    estimatedMinutes: 60,
    instructions: null,
    safetyNotes: null,
    expectedResult: null,
    requirements: {
      checklist: true,
      initialPhotos: false,
      finalPhotos: true,
      measurements: false,
      materials: false,
      technicianSignature: true,
      responsibleSignature: false,
      finalFunctionalTest: true,
      report: true,
      administrativeReview: true,
    },
  };
}

function lifecycleClient(status: 'ASIGNADA' | 'ACEPTADA', rpcData: object) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { estado: status, configuracion: {} }, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const rpc = vi.fn().mockResolvedValue({ data: rpcData, error: null });
  const client = { from: vi.fn(() => ({ select })), rpc } as unknown as SupabaseClient;
  return { client, rpc };
}

function mobileOrder(id: string, assignedTo: string, status: WorkOrderListItem['status']): WorkOrderListItem {
  return {
    id,
    tenantId: 'tenant-1',
    code: `OT-${id}`,
    title: 'Trabajo técnico',
    description: null,
    type: 'revision',
    priority: 'normal',
    status,
    siteId: 'site-1',
    locationId: null,
    assetId: null,
    assignedTo,
    createdBy: 'manager-1',
    plannedAt: '2026-07-20T08:00:00.000Z',
    dueAt: null,
    estimatedMinutes: 60,
    instructions: null,
    safetyNotes: null,
    expectedResult: null,
    requirements: {
      checklist: false,
      initialPhotos: false,
      finalPhotos: false,
      measurements: false,
      materials: false,
      technicianSignature: false,
      responsibleSignature: false,
      finalFunctionalTest: false,
      report: false,
      administrativeReview: false,
    },
    blockReason: null,
    blockNotes: null,
    createdAt: '2026-07-20T07:00:00.000Z',
    updatedAt: '2026-07-20T07:30:00.000Z',
    siteName: 'Planta norte',
    locationName: null,
    assignedToName: 'Ana Ruiz',
    assetName: null,
    assetType: null,
    assetReference: null,
    assetCriticality: null,
    assetStatus: null,
  };
}

describe('technician work order operations', () => {
  it('crea un borrador cuando no se selecciona técnico', () => {
    expect(toCreateWorkOrderRpcArgs(createInput(null)).technician_uuid).toBeNull();
  });

  it('asigna una OT mediante la RPC transaccional', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { id: orderId, codigo_ot: 'OT-2026-001', estado: 'ASIGNADA', assigned_to: technicianId },
      error: null,
    });
    const result = await assignWorkOrder({ rpc } as unknown as SupabaseClient, {
      workOrderId: orderId,
      technicianId,
      plannedAt: null,
      reason: null,
    });

    expect(rpc).toHaveBeenCalledWith('assign_work_order', expect.objectContaining({ work_order_uuid: orderId, technician_uuid: technicianId }));
    expect(result).toMatchObject({ id: orderId, status: 'ASIGNADA', assignedTo: technicianId });
  });

  it('conserva el borrador cuando falla la asignación', async () => {
    const draft = Object.freeze({ id: orderId, status: 'BORRADOR' as const });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('Failed to fetch') });

    await expect(assignWorkOrder({ rpc } as unknown as SupabaseClient, {
      workOrderId: draft.id,
      technicianId,
      plannedAt: null,
      reason: null,
    })).rejects.toThrow('Failed to fetch');
    expect(draft.status).toBe('BORRADOR');
  });

  it('reintenta sobre la misma OT sin llamar a create_work_order', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('network') })
      .mockResolvedValueOnce({ data: { id: orderId, codigo_ot: 'OT-2026-001', estado: 'ASIGNADA', assigned_to: technicianId }, error: null });
    const client = { rpc } as unknown as SupabaseClient;
    const input = { workOrderId: orderId, technicianId, plannedAt: null, reason: null };

    await expect(assignWorkOrder(client, input)).rejects.toThrow('network');
    await expect(assignWorkOrder(client, input)).resolves.toMatchObject({ id: orderId, status: 'ASIGNADA' });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(['assign_work_order', 'assign_work_order']);
  });

  it('acepta la OT y espera la confirmación de Supabase', async () => {
    const { client, rpc } = lifecycleClient('ASIGNADA', { id: orderId, estado: 'ACEPTADA' });

    await expect(acceptWorkOrder(client, orderId)).resolves.toMatchObject({ id: orderId, estado: 'ACEPTADA' });
    expect(rpc).toHaveBeenCalledWith('accept_work_order', { work_order_uuid: orderId });
  });

  it('inicia una intervención solo después de aceptar la OT', async () => {
    const visitId = '55555555-5555-4555-8555-555555555555';
    const { client, rpc } = lifecycleClient('ACEPTADA', { id: visitId, ot_id: orderId, estado: 'EN_CURSO', fecha_inicio: '2026-07-20T08:00:00.000Z', fecha_fin: null });

    await expect(startWorkOrderVisit(client, orderId)).resolves.toMatchObject({ id: visitId, ot_id: orderId, estado: 'EN_CURSO' });
    expect(rpc).toHaveBeenCalledWith('start_work_order_visit', { work_order_uuid: orderId });
  });

  it('limita la navegación del técnico a su zona operativa', () => {
    expect(visibleNavigationForRole('tecnico')).toBe('technician');
    expect(visibleNavigationForRole('tecnico_externo')).toBe('technician');
    expect(visibleNavigationForRole('coordinador')).toBe('management');
  });

  it('bloquea una segunda pulsación hasta finalizar la primera acción', () => {
    const guard = createTechnicianActionGuard();
    expect(guard.acquire()).toBe(true);
    expect(guard.acquire()).toBe(false);
    guard.release();
    expect(guard.acquire()).toBe(true);
  });

  it('muestra exclusivamente las OT asignadas al técnico autenticado', () => {
    const ownAssigned = mobileOrder('1', technicianId, 'ASIGNADA');
    const otherAssigned = mobileOrder('2', 'another-technician', 'ASIGNADA');
    const groups = groupTechnicianOrders([ownAssigned, otherAssigned], technicianId, new Date(2026, 6, 20, 10));

    expect(groups.pendientes.map((order) => order.id)).toEqual(['1']);
    expect(Object.values(groups).flat().some((order) => order.id === '2')).toBe(false);
  });
});
