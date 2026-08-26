// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import { safeCompletionError } from '../api/workOrderCompletionRepository';
import WorkOrderCompletionPanel, { WorkOrderVisitSummaryPanel } from './WorkOrderCompletionPanel';

const mocks = vi.hoisted(() => ({
  listChecklist: vi.fn(),
  listPhotos: vi.fn(),
  loadSupport: vi.fn(),
  listParticipants: vi.fn(),
  listVisits: vi.fn(),
  closeVisit: vi.fn(),
  finalizeOrder: vi.fn(),
  startVisit: vi.fn(),
}));

vi.mock('../api/workOrderExecutionRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/workOrderExecutionRepository')>();
  return { ...actual, listWorkOrderChecklist: mocks.listChecklist };
});

vi.mock('../api/workOrderPhotoRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/workOrderPhotoRepository')>();
  return { ...actual, listWorkOrderPhotos: mocks.listPhotos };
});

vi.mock('../api/workOrderCompletionRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/workOrderCompletionRepository')>();
  return { ...actual, loadWorkOrderCompletionSupport: mocks.loadSupport };
});

vi.mock('../api/workOrderTeamRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/workOrderTeamRepository')>();
  return {
    ...actual,
    listWorkOrderParticipants: mocks.listParticipants,
    listWorkOrderVisits: mocks.listVisits,
    closeMyWorkOrderVisit: mocks.closeVisit,
    finalizeWorkOrderTechnical: mocks.finalizeOrder,
  };
});

vi.mock('../api/workOrderLifecycle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/workOrderLifecycle')>();
  return { ...actual, startWorkOrderVisit: mocks.startVisit };
});

const technicianId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const order: WorkOrderListItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  tenantId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  code: 'OT-2026-00004',
  title: 'Intervención técnica demo',
  description: null,
  type: 'revision',
  priority: 'normal',
  status: 'EN_CURSO',
  siteId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  locationId: null,
  assetId: null,
  assignedTo: technicianId,
  createdBy: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  plannedAt: null,
  dueAt: null,
  estimatedMinutes: null,
  instructions: null,
  safetyNotes: null,
  expectedResult: null,
  requirements: {
    checklist: true,
    initialPhotos: true,
    finalPhotos: true,
    measurements: false,
    materials: false,
    technicianSignature: false,
    responsibleSignature: false,
    finalFunctionalTest: false,
    report: false,
    administrativeReview: true,
  },
  blockReason: null,
  blockNotes: null,
  createdAt: '2026-07-22T06:00:00Z',
  updatedAt: '2026-07-22T06:10:00Z',
  clientName: 'Cliente demo',
  siteName: 'Instalación demo',
  siteAddress: 'Calle Demostración 1, Madrid',
  locationName: null,
  assignedToName: 'Técnico demo',
  assetName: null,
  assetType: null,
  assetReference: null,
  assetCriticality: null,
  assetStatus: null,
};

const checklist = [{
  id: 'check-1', tenantId: order.tenantId, workOrderId: order.id, templateItemId: 'identificacion', order: 10,
  point: 'Identificación', description: null, required: true, requiresPhoto: false, result: 'ok', responseType: 'ok_ko_na' as const,
  observations: null, completedBy: technicianId, completedAt: '2026-07-22T06:11:00Z',
}];

const photos = [
  { id: 'photo-i', tenantId: order.tenantId, workOrderId: order.id, checklistResponseId: null, category: 'initial' as const, storedType: 'inicial' as const, bucket: 'ot-photos', path: 'initial.jpg', filename: 'initial.jpg', mimeType: 'image/jpeg', sizeBytes: 100, createdBy: technicianId, createdAt: '2026-07-22T06:12:00Z', signedUrl: 'https://example.test/initial' },
  { id: 'photo-f', tenantId: order.tenantId, workOrderId: order.id, checklistResponseId: null, category: 'final' as const, storedType: 'final' as const, bucket: 'ot-photos', path: 'final.jpg', filename: 'final.jpg', mimeType: 'image/jpeg', sizeBytes: 100, createdBy: technicianId, createdAt: '2026-07-22T06:13:00Z', signedUrl: 'https://example.test/final' },
];

const responsibleParticipant = {
  id: 'participant-1', workOrderId: order.id, technicianId, technicianName: 'Técnico demo', role: 'responsable' as const,
  status: 'activo' as const, addedAt: '2026-07-22T06:00:00Z', removedAt: null, reason: null,
};

function visit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'visit-1', workOrderId: order.id, technicianId, technicianName: 'Técnico demo', status: 'FINALIZADA',
    startedAt: '2026-07-22T06:00:00Z', finishedAt: '2026-07-22T07:00:00Z', workDone: 'Ajuste y prueba realizados',
    diagnosis: null, tests: 'Prueba correcta', recommendations: null, pendingWork: null, closeReason: null, nextAction: null,
    result: 'trabajo_completado', ...overrides,
  };
}

function fakeClient() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: technicianId } }, error: null }) } } as never;
}

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('finalización guiada de OT con visitas separadas', () => {
  beforeEach(() => {
    mocks.listChecklist.mockReset().mockResolvedValue(checklist);
    mocks.listPhotos.mockReset().mockResolvedValue(photos);
    mocks.loadSupport.mockReset().mockResolvedValue({ technicianSignatures: 0, responsibleSignatures: 0, reports: 0, latestVisit: null });
    mocks.listParticipants.mockReset().mockResolvedValue([responsibleParticipant]);
    mocks.listVisits.mockReset().mockResolvedValue([]);
    mocks.closeVisit.mockReset().mockResolvedValue(visit());
    mocks.finalizeOrder.mockReset().mockResolvedValue({ id: order.id, estado: 'FINALIZADA_TECNICO' });
    mocks.startVisit.mockReset().mockResolvedValue(visit({ status: 'EN_CURSO', finishedAt: null }));
  });

  afterEach(() => cleanup());

  it('solo permite al responsable finalizar la OT cuando no quedan visitas activas', async () => {
    let complete!: (value: unknown) => void;
    mocks.finalizeOrder.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    render(<WorkOrderCompletionPanel order={order} canComplete client={fakeClient()} />, { wrapper: wrapper() });

    const button = await screen.findByRole('button', { name: 'Finalizar OT' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Resumen técnico global/), { target: { value: 'Revisión y prueba completadas' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que todas las visitas/ }));
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: /Finalizar OT|Finalizando OT/ }));
    await waitFor(() => expect(mocks.finalizeOrder).toHaveBeenCalledTimes(1));
    expect((await screen.findByRole('button', { name: 'Finalizando OT…' }) as HTMLButtonElement).disabled).toBe(true);

    complete({ id: order.id, estado: 'FINALIZADA_TECNICO' });
    expect(await screen.findByText(/OT finalizada técnicamente y enviada/)).toBeTruthy();
  });

  it('mantiene bloqueado el cierre global cuando falta una evidencia requerida', async () => {
    mocks.listPhotos.mockResolvedValue([photos[0]]);
    render(<WorkOrderCompletionPanel order={order} canComplete client={fakeClient()} />, { wrapper: wrapper() });

    expect(await screen.findByText(/Pendiente: fotografías finales/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Resumen técnico global/), { target: { value: 'Trabajo realizado' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que todas las visitas/ }));
    expect((screen.getByRole('button', { name: 'Finalizar OT' }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.finalizeOrder).not.toHaveBeenCalled();
  });

  it('cierra únicamente la visita propia y mantiene bloqueado el cierre global mientras haya visitas activas', async () => {
    mocks.listVisits.mockResolvedValue([visit({ status: 'EN_CURSO', finishedAt: null, workDone: null })]);
    render(<WorkOrderCompletionPanel order={order} canComplete client={fakeClient()} />, { wrapper: wrapper() });

    const closeButton = await screen.findByRole('button', { name: 'Cerrar mi visita' });
    expect((closeButton as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText(/Queda 1 visita en curso/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Finalizar OT' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Trabajo realizado en esta visita/), { target: { value: 'Diagnóstico y ajuste terminados' } });
    expect((closeButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(closeButton);
    await waitFor(() => expect(mocks.closeVisit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      workOrderId: order.id,
      workDone: 'Diagnóstico y ajuste terminados',
      result: 'trabajo_completado',
    })));
  });

  it('muestra un error seguro sin filtrar detalles inesperados', () => {
    expect(safeCompletionError(new Error('duplicate key value contains sensitive row'))).toBe('No se pudo finalizar la intervención. Revisa los requisitos y vuelve a intentarlo.');
    expect(safeCompletionError(new Error('No se puede finalizar: checklist incompleto'))).toBe('No se puede finalizar: checklist incompleto');
  });

  it('muestra el histórico real de visitas y el estado vacío', async () => {
    mocks.listVisits.mockResolvedValueOnce([visit()]);
    const first = render(<WorkOrderVisitSummaryPanel workOrderId={order.id} displayDate={(value) => value || 'Sin fecha'} client={fakeClient()} />, { wrapper: wrapper() });
    expect(await screen.findByText(/Ajuste y prueba realizados/)).toBeTruthy();
    expect(screen.getByText('Técnico demo')).toBeTruthy();
    first.unmount();

    mocks.listVisits.mockResolvedValueOnce([]);
    render(<WorkOrderVisitSummaryPanel workOrderId="other-order" displayDate={(value) => value || 'Sin fecha'} client={fakeClient()} />, { wrapper: wrapper() });
    expect(await screen.findByText('Sin visitas registradas')).toBeTruthy();
  });

  it('presenta firma e informe requeridos como pendientes, no completados', async () => {
    render(<WorkOrderCompletionPanel order={{ ...order, requirements: { ...order.requirements, technicianSignature: true, report: true } }} canComplete client={fakeClient()} />, { wrapper: wrapper() });
    expect(await screen.findByText(/Pendiente:.*firma del técnico.*informe técnico/i)).toBeTruthy();
    expect(screen.getByText('Firma del técnico').closest('.completion-requirement')?.textContent).toContain('Pendiente');
    expect(screen.getByText('Informe técnico').closest('.completion-requirement')?.textContent).toContain('Pendiente');
  });
});