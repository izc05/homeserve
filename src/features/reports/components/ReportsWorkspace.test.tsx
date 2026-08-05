// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import ReportsWorkspace from './ReportsWorkspace';

const orderQuery = {
  select: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
};

vi.mock('../../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => orderQuery,
    storage: { from: () => ({ createSignedUrl: vi.fn() }) },
  }),
}));

function workOrder(overrides: Partial<WorkOrderListItem> = {}): WorkOrderListItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: '22222222-2222-4222-8222-222222222222',
    code: 'OT-2026-00031',
    title: 'Fallo de climatización',
    description: 'No arranca la UTA.',
    type: 'averia',
    priority: 'urgente',
    status: 'FINALIZADA_TECNICO',
    siteId: '33333333-3333-4333-8333-333333333333',
    clientId: '44444444-4444-4444-8444-444444444444',
    clientName: 'Hospital Demo',
    siteName: 'Quirófano 3',
    siteAddress: 'Calle Salud 1',
    siteContactName: null,
    siteContactPhone: null,
    siteContactEmail: null,
    locationId: null,
    locationName: null,
    assetId: null,
    assetName: null,
    assetType: null,
    assetReference: null,
    assetCriticality: null,
    assetStatus: null,
    assignedTo: '55555555-5555-4555-8555-555555555555',
    assignedToName: 'Técnico Demo IsiVoltPro',
    createdBy: '66666666-6666-4666-8666-666666666666',
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
      technicianSignature: false,
      responsibleSignature: false,
      finalFunctionalTest: true,
      report: true,
      administrativeReview: true,
    },
    blockReason: null,
    blockNotes: null,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-05T08:00:00.000Z',
    ...overrides,
  };
}

function renderWorkspace(orders = [workOrder()]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const open = vi.fn();
  const result = render(<QueryClientProvider client={client}><ReportsWorkspace orders={orders} open={open} /></QueryClientProvider>);
  return { ...result, open };
}

describe('ReportsWorkspace', () => {
  beforeEach(() => {
    orderQuery.select.mockReturnValue(orderQuery);
    orderQuery.in.mockReturnValue(orderQuery);
    orderQuery.order.mockResolvedValue({ data: [], error: null });
  });

  it('presenta jerarquía completa sin una advertencia roja dominante', async () => {
    const { container } = renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Informes' })).toBeTruthy();
    expect(screen.getByText('Generación PDF en desarrollo')).toBeTruthy();
    expect(screen.getByText('OT abiertas')).toBeTruthy();
    expect(screen.getByText('Pendientes de validación')).toBeTruthy();
    expect(screen.getByText('OT-2026-00031')).toBeTruthy();
    expect(screen.getByText('Hospital Demo')).toBeTruthy();
    expect(screen.getByText('Quirófano 3')).toBeTruthy();
    expect(container.querySelector('[data-label="Cliente e instalación"]')).toBeTruthy();
    expect(container.querySelector('.reports-development-note')?.classList.contains('error')).toBe(false);
    await waitFor(() => expect(orderQuery.in).toHaveBeenCalledWith('ot_id', ['11111111-1111-4111-8111-111111111111']));
  });

  it('convierte las acciones en controles contextuales y abre la OT', () => {
    const { open } = renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir OT' }));
    expect(open).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    expect(screen.getByRole('button', { name: 'Generar' })).toBeDisabled();
  });

  it('filtra por búsqueda sin cortar los datos principales', () => {
    renderWorkspace([
      workOrder(),
      workOrder({ id: '77777777-7777-4777-8777-777777777777', code: 'OT-2026-00032', title: 'Revisión eléctrica', clientName: 'Industria Sur', siteName: 'Nave 2' }),
    ]);

    fireEvent.change(screen.getByLabelText('Buscar informes'), { target: { value: 'Industria Sur' } });
    expect(screen.queryByText('OT-2026-00031')).toBeNull();
    expect(screen.getByText('OT-2026-00032')).toBeTruthy();
    expect(screen.getByText('Industria Sur')).toBeTruthy();
  });
});
