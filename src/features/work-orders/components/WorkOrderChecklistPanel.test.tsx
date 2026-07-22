// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import WorkOrderChecklistPanel from './WorkOrderChecklistPanel';
import type { WorkOrderChecklistResponse } from '../api/workOrderExecutionRepository';

const mocks = vi.hoisted(() => ({
  listWorkOrderChecklist: vi.fn(),
  prepareWorkOrderChecklist: vi.fn(),
  saveWorkOrderChecklistResponse: vi.fn(),
}));

vi.mock('../api/workOrderExecutionRepository', async () => {
  const actual = await vi.importActual<typeof import('../api/workOrderExecutionRepository')>('../api/workOrderExecutionRepository');
  return { ...actual, ...mocks };
});

const rows: WorkOrderChecklistResponse[] = [
  {
    id: 'one', tenantId: 'tenant', workOrderId: 'order', templateItemId: 'identificacion', order: 10,
    point: 'Identificación', description: 'Confirmar alcance.', required: true, requiresPhoto: false,
    result: 'ok', responseType: 'ok_ko_na', observations: null, completedBy: 'tech', completedAt: '2026-07-22T08:00:00Z',
  },
  {
    id: 'two', tenantId: 'tenant', workOrderId: 'order', templateItemId: 'ejecucion', order: 40,
    point: 'Ejecución técnica', description: 'Registrar trabajo.', required: true, requiresPhoto: false,
    result: null, responseType: 'texto', observations: null, completedBy: null, completedAt: null,
  },
];

function renderPanel(canEdit = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><WorkOrderChecklistPanel workOrderId="order" canEdit={canEdit} client={{} as SupabaseClient} /></QueryClientProvider>);
}

describe('WorkOrderChecklistPanel', () => {
  beforeEach(() => {
    mocks.listWorkOrderChecklist.mockReset().mockResolvedValue(rows);
    mocks.prepareWorkOrderChecklist.mockReset().mockResolvedValue({ workOrderId: 'order', createdItems: 4, totalItems: 4, completedItems: 0 });
    mocks.saveWorkOrderChecklistResponse.mockReset().mockImplementation(async (_client, input) => ({ ...rows.find((row) => row.id === input.responseId)!, result: input.result, observations: input.observations ?? null }));
  });
  afterEach(() => cleanup());

  it('muestra el progreso real y los tipos de respuesta persistidos', async () => {
    renderPanel();
    expect(await screen.findByText('1 / 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'OK' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Respuesta')).toBeTruthy();
  });

  it('guarda texto y observaciones una sola vez mientras hay una petición activa', async () => {
    let resolveSave: ((value: WorkOrderChecklistResponse) => void) | undefined;
    mocks.saveWorkOrderChecklistResponse.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    renderPanel();
    await screen.findByText('1 / 2');

    fireEvent.change(screen.getByLabelText('Respuesta'), { target: { value: 'Trabajo ejecutado' } });
    const observations = screen.getAllByLabelText(/Observaciones/)[1];
    fireEvent.change(observations, { target: { value: 'Sin incidencias' } });
    const saveButtons = screen.getAllByRole('button', { name: /Guardar punto/ });
    fireEvent.click(saveButtons[1]);
    await waitFor(() => expect(mocks.saveWorkOrderChecklistResponse).toHaveBeenCalledTimes(1));
    fireEvent.click(saveButtons[1]);

    expect(mocks.saveWorkOrderChecklistResponse).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Guardando')).toBeTruthy();
    resolveSave?.({ ...rows[1], result: 'Trabajo ejecutado', observations: 'Sin incidencias' });
    await waitFor(() => expect(screen.getAllByText('Guardado').length).toBeGreaterThan(0));
  });

  it('muestra el error de guardado sin perder el formulario', async () => {
    mocks.saveWorkOrderChecklistResponse.mockRejectedValueOnce(new Error('Respuesta rechazada por seguridad'));
    renderPanel();
    await screen.findByText('1 / 2');
    fireEvent.click(screen.getAllByRole('button', { name: /Guardar punto/ })[1]);
    expect(await screen.findByText('Respuesta rechazada por seguridad')).toBeTruthy();
    expect(screen.getByText('Error')).toBeTruthy();
  });

  it('prepara un checklist vacío y desactiva edición en modo consulta', async () => {
    mocks.listWorkOrderChecklist.mockResolvedValueOnce([]).mockResolvedValue([]);
    const { unmount } = renderPanel();
    const prepare = await screen.findByRole('button', { name: /Preparar checklist/ });
    fireEvent.click(prepare);
    await waitFor(() => expect(mocks.prepareWorkOrderChecklist).toHaveBeenCalledTimes(1));
    unmount();

    mocks.listWorkOrderChecklist.mockResolvedValue(rows);
    renderPanel(false);
    await screen.findByText('1 / 2');
    expect(screen.queryByRole('button', { name: /Guardar punto/ })).toBeNull();
    expect(screen.getByText(/modo consulta/)).toBeTruthy();
  });
});
