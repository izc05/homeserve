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
  finalize: vi.fn(),
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

vi.mock('../api/workOrderLifecycle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/workOrderLifecycle')>();
  return { ...actual, finalizeActiveWorkOrderVisit: mocks.finalize };
});

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
  assignedTo: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
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
  observations: null, completedBy: order.assignedTo, completedAt: '2026-07-22T06:11:00Z',
}];

const photos = [
  { id: 'photo-i', tenantId: order.tenantId, workOrderId: order.id, checklistResponseId: null, category: 'initial' as const, storedType: 'inicial' as const, bucket: 'ot-photos', path: 'initial.jpg', filename: 'initial.jpg', mimeType: 'image/jpeg', sizeBytes: 100, createdBy: order.assignedTo!, createdAt: '2026-07-22T06:12:00Z', signedUrl: 'https://example.test/initial' },
  { id: 'photo-f', tenantId: order.tenantId, workOrderId: order.id, checklistResponseId: null, category: 'final' as const, storedType: 'final' as const, bucket: 'ot-photos', path: 'final.jpg', filename: 'final.jpg', mimeType: 'image/jpeg', sizeBytes: 100, createdBy: order.assignedTo!, createdAt: '2026-07-22T06:13:00Z', signedUrl: 'https://example.test/final' },
];

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('finalización guiada de OT', () => {
  beforeEach(() => {
    mocks.listChecklist.mockReset().mockResolvedValue(checklist);
    mocks.listPhotos.mockReset().mockResolvedValue(photos);
    mocks.loadSupport.mockReset().mockResolvedValue({ technicianSignatures: 0, responsibleSignatures: 0, reports: 0, latestVisit: null });
    mocks.finalize.mockReset().mockResolvedValue({ id: 'visit-1', ot_id: order.id, estado: 'FINALIZADA', fecha_inicio: null, fecha_fin: null });
  });

  afterEach(() => cleanup());

  it('exige resumen, confirmación y evita el doble envío', async () => {
    let complete!: (value: unknown) => void;
    mocks.finalize.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    render(<WorkOrderCompletionPanel order={order} canComplete client={{} as never} />, { wrapper: wrapper() });

    const button = await screen.findByRole('button', { name: 'Finalizar intervención' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Resumen del trabajo/), { target: { value: 'Revisión y prueba completadas' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que el resumen/ }));
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar intervención' }));
    fireEvent.click(screen.getByRole('button', { name: /Finalizar intervención|Finalizando/ }));
    await waitFor(() => expect(mocks.finalize).toHaveBeenCalledTimes(1));
    expect((await screen.findByRole('button', { name: 'Finalizando…' }) as HTMLButtonElement).disabled).toBe(true);

    complete({ id: 'visit-1', ot_id: order.id, estado: 'FINALIZADA' });
    expect(await screen.findByText(/Intervención finalizada y enviada/)).toBeTruthy();
  });

  it('mantiene bloqueado el cierre cuando falta una evidencia requerida', async () => {
    mocks.listPhotos.mockResolvedValue([photos[0]]);
    render(<WorkOrderCompletionPanel order={order} canComplete client={{} as never} />, { wrapper: wrapper() });

    expect(await screen.findByText(/Pendiente: fotografías finales/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Resumen del trabajo/), { target: { value: 'Trabajo realizado' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que el resumen/ }));
    expect((screen.getByRole('button', { name: 'Finalizar intervención' }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it('muestra un error seguro sin filtrar detalles inesperados', () => {
    expect(safeCompletionError(new Error('duplicate key value contains sensitive row'))).toBe('No se pudo finalizar la intervención. Revisa los requisitos y vuelve a intentarlo.');
    expect(safeCompletionError(new Error('No se puede finalizar: checklist incompleto'))).toBe('No se puede finalizar: checklist incompleto');
  });

  it('muestra el resumen técnico real y el estado vacío', async () => {
    mocks.loadSupport.mockResolvedValueOnce({
      technicianSignatures: 0,
      responsibleSignatures: 0,
      reports: 0,
      latestVisit: {
        id: 'visit-1', workOrderId: order.id, technicianId: order.assignedTo, status: 'FINALIZADA',
        startedAt: '2026-07-22T06:00:00Z', finishedAt: '2026-07-22T07:00:00Z', workDone: 'Ajuste y prueba realizados',
        diagnosis: null, tests: 'Prueba correcta', recommendations: null, pendingWork: null,
      },
    });
    const first = render(<WorkOrderVisitSummaryPanel workOrderId={order.id} displayDate={(value) => value || 'Sin fecha'} client={{} as never} />, { wrapper: wrapper() });
    expect(await screen.findByText('Ajuste y prueba realizados')).toBeTruthy();
    first.unmount();

    mocks.loadSupport.mockResolvedValueOnce({ technicianSignatures: 0, responsibleSignatures: 0, reports: 0, latestVisit: null });
    render(<WorkOrderVisitSummaryPanel workOrderId="other-order" displayDate={(value) => value || 'Sin fecha'} client={{} as never} />, { wrapper: wrapper() });
    expect(await screen.findByText('Sin resumen técnico')).toBeTruthy();
  });

  it('presenta las funciones P2 requeridas como pendientes, no completadas', async () => {
    render(<WorkOrderCompletionPanel order={{ ...order, requirements: { ...order.requirements, technicianSignature: true, report: true } }} canComplete client={{} as never} />, { wrapper: wrapper() });
    await screen.findByText('1 de 1 puntos completados');
    expect(await screen.findAllByText('No se puede registrar desde esta versión.')).toHaveLength(2);
    expect(screen.getByText('Firma del técnico').closest('.completion-requirement')?.textContent).toContain('Pendiente');
    expect(screen.getByText('Informe técnico').closest('.completion-requirement')?.textContent).toContain('Pendiente');
  });
});
