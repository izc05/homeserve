// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import ChecklistPointPhotos from './ChecklistPointPhotos';
import type { WorkOrderPhoto } from '../api/workOrderPhotoRepository';

const mocks = vi.hoisted(() => ({ list: vi.fn(), upload: vi.fn(), remove: vi.fn(), validate: vi.fn() }));
vi.mock('../api/workOrderPhotoRepository', async () => {
  const actual = await vi.importActual<typeof import('../api/workOrderPhotoRepository')>('../api/workOrderPhotoRepository');
  return { ...actual, listWorkOrderPhotos: mocks.list, uploadWorkOrderPhoto: mocks.upload, deleteWorkOrderPhoto: mocks.remove, validateWorkOrderPhotoFile: mocks.validate };
});

function photo(id: string, responseId: string): WorkOrderPhoto {
  return {
    id, tenantId: 'tenant-a', workOrderId: 'order-a', checklistResponseId: responseId, category: 'during', storedType: 'checklist',
    bucket: 'ot-photos', path: `tenant/order/foto/${id}.jpg`, filename: `${id}.jpg`, mimeType: 'image/jpeg', sizeBytes: 100,
    createdBy: 'tech-a', createdAt: '2026-07-22T08:00:00Z', categoryLabel: 'checklist', comment: `Comentario ${id}`, signedUrl: `https://signed.example/${id}`,
  };
}

function renderPhotos(canEdit = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><ChecklistPointPhotos tenantId="tenant-a" workOrderId="order-a" responseId="response-a" required canEdit={canEdit} client={{} as SupabaseClient} /></QueryClientProvider>);
}

describe('ChecklistPointPhotos', () => {
  beforeEach(() => {
    mocks.list.mockReset().mockResolvedValue([photo('exact', 'response-a'), photo('other', 'response-b')]);
    mocks.upload.mockReset().mockResolvedValue(photo('new', 'response-a'));
    mocks.remove.mockReset().mockResolvedValue(photo('exact', 'response-a'));
    mocks.validate.mockReset();
  });
  afterEach(() => cleanup());

  it('muestra únicamente fotografías vinculadas al punto exacto', async () => {
    renderPhotos(false);
    expect(await screen.findByText('exact.jpg')).toBeTruthy();
    expect(screen.queryByText('other.jpg')).toBeNull();
    expect(screen.getByText('Vinculada a este punto')).toBeTruthy();
    expect(screen.queryByText(/Debes vincular/)).toBeNull();
  });

  it('requiere confirmación antes de eliminar una fotografía vinculada', async () => {
    renderPhotos();
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar exact.jpg' }));
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'exact', checklistResponseId: 'response-a' })));
  });

  it('avisa cuando una fotografía obligatoria todavía no existe', async () => {
    mocks.list.mockResolvedValueOnce([]);
    renderPhotos();
    expect(await screen.findByText(/Debes vincular una fotografía antes de finalizar/)).toBeTruthy();
  });
});
