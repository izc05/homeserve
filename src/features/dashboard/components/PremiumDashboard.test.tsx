// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PremiumDashboard from './PremiumDashboard';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';

const requirements = {
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
};

function workOrder(overrides: Partial<WorkOrderListItem> = {}): WorkOrderListItem {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    tenantId: '20000000-0000-4000-8000-000000000001',
    code: 'OT-2026-00001',
    title: 'Revisión de instalación',
    description: null,
    type: 'revision',
    priority: 'normal',
    status: 'BORRADOR',
    siteId: '30000000-0000-4000-8000-000000000001',
    locationId: null,
    assetId: null,
    assignedTo: null,
    createdBy: '40000000-0000-4000-8000-000000000001',
    plannedAt: null,
    dueAt: null,
    estimatedMinutes: null,
    instructions: null,
    safetyNotes: null,
    expectedResult: null,
    requirements,
    blockReason: null,
    blockNotes: null,
    createdAt: '2026-07-20T08:00:00.000Z',
    updatedAt: '2026-07-20T08:00:00.000Z',
    clientId: '50000000-0000-4000-8000-000000000001',
    clientName: 'Cliente Solar E2E',
    siteName: 'Cubierta E2E',
    locationName: null,
    assignedToName: null,
    assetName: null,
    assetType: null,
    assetReference: null,
    assetCriticality: null,
    assetStatus: null,
    ...overrides,
  };
}

describe('dashboard administrativo premium', () => {
  afterEach(() => cleanup());

  it('deriva los cuatro contadores del conjunto real recibido', () => {
    render(<PremiumDashboard
      orders={[
        workOrder(),
        workOrder({ id: '2', code: 'OT-2', status: 'EN_CURSO' }),
        workOrder({ id: '3', code: 'OT-3', status: 'FINALIZADA_TECNICO' }),
        workOrder({ id: '4', code: 'OT-4', status: 'BLOQUEADA' }),
        workOrder({ id: '5', code: 'OT-5', status: 'VALIDADA' }),
      ]}
      viewerName="Admin Demo"
      openOrders={vi.fn()}
      openDetail={vi.fn()}
    />);

    const indicators = screen.getByRole('region', { name: 'Indicadores operativos' });
    expect(within(indicators).getByText('OT abiertas').previousSibling?.textContent).toBe('4');
    expect(within(indicators).getByText('En curso').previousSibling?.textContent).toBe('1');
    expect(within(indicators).getByText('Pendientes de validación').previousSibling?.textContent).toBe('1');
    expect(within(indicators).getByText('Bloqueadas').previousSibling?.textContent).toBe('1');
  });

  it('selecciona el foco primero por estado y después por prioridad', () => {
    const orders = [
      workOrder({ id: 'assigned', code: 'OT-ASSIGNED', status: 'ASIGNADA', priority: 'critica' }),
      workOrder({ id: 'blocked-low', code: 'OT-BLOCKED-LOW', status: 'BLOQUEADA', priority: 'baja' }),
      workOrder({ id: 'blocked-high', code: 'OT-BLOCKED-HIGH', status: 'BLOQUEADA', priority: 'alta' }),
      workOrder({ id: 'validated', code: 'OT-VALIDATED', status: 'VALIDADA', priority: 'critica' }),
    ];

    render(<PremiumDashboard orders={orders} viewerName="Admin Demo" openOrders={vi.fn()} openDetail={vi.fn()} />);

    const focus = screen.getByRole('region', { name: 'Siguiente actuación en foco' });
    expect(within(focus).getByRole('heading', { name: 'Resolver bloqueo' })).toBeTruthy();
    expect(within(focus).getByText('OT-BLOCKED-HIGH')).toBeTruthy();
    expect(within(focus).queryByText('OT-BLOCKED-LOW')).toBeNull();
  });

  it('abre la OT en foco y una orden reciente con los callbacks existentes', () => {
    const openDetail = vi.fn();
    render(<PremiumDashboard
      orders={[
        workOrder({ id: 'focus', code: 'OT-FOCUS', status: 'EN_CURSO' }),
        workOrder({ id: 'recent', code: 'OT-RECENT', status: 'VALIDADA', updatedAt: '2026-07-21T09:00:00.000Z' }),
      ]}
      viewerName="Admin Demo"
      openOrders={vi.fn()}
      openDetail={openDetail}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir OT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir OT-RECENT' }));

    expect(openDetail).toHaveBeenNthCalledWith(1, 'focus');
    expect(openDetail).toHaveBeenNthCalledWith(2, 'recent');
  });

  it('abre el listado completo desde las dos acciones de navegación', () => {
    const openOrders = vi.fn();
    render(<PremiumDashboard orders={[workOrder()]} viewerName="Admin Demo" openOrders={openOrders} openDetail={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Ver todas/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ver listado completo/ }));

    expect(openOrders).toHaveBeenCalledTimes(2);
  });

  it('expone estados vacíos y mantiene el footer exacto', () => {
    render(<PremiumDashboard orders={[]} viewerName="Admin Demo" openOrders={vi.fn()} openDetail={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Sin actuaciones pendientes' })).toBeTruthy();
    expect(screen.getByText('Sin órdenes visibles')).toBeTruthy();
    expect(screen.getByText('Sin carga asignada')).toBeTruthy();
    expect(screen.getByText('Sin próximas OT')).toBeTruthy();
    expect(screen.getByText('Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro')).toBeTruthy();
  });
});
