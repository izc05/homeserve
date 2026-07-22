// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import WorkOrderPhotosPanel from './WorkOrderPhotosPanel';

const mocks = vi.hoisted(() => ({
  listWorkOrderPhotos: vi.fn(), uploadWorkOrderPhoto: vi.fn(), deleteWorkOrderPhoto: vi.fn(), validateWorkOrderPhotoFile: vi.fn(),
}));

vi.mock('../api/workOrderPhotoRepository', async () => {
  const actual = await vi.importActual<typeof import('../api/workOrderPhotoRepository')>('../api/workOrderPhotoRepository');
  return { ...actual, ...mocks };
});

const photo = {
  id: 'photo', tenantId: 'tenant', workOrderId: 'order', checklistResponseId: null, category: 'initial' as const,
  storedType: 'inicial' as const, bucket: 'ot-photos', path: 'tenant/order/foto/photo.jpg', filename: 'photo.jpg',
  mimeType: 'image/jpeg', sizeBytes: 1200, createdBy: 'tech', createdAt: '2026-07-22T08:00:00Z', signedUrl: 'https://signed.test/photo',
};

function renderPanel(canEdit = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><WorkOrderPhotosPanel tenantId="tenant" workOrderId="order" canEdit={canEdit} client={{} as SupabaseClient} /></QueryClientProvider>);
}

describe('WorkOrderPhotosPanel', () => {
  beforeEach(() => {
    mocks.listWorkOrderPhotos.mockReset().mockResolvedValue([]);
    mocks.uploadWorkOrderPhoto.mockReset().mockResolvedValue(photo);
    mocks.deleteWorkOrderPhoto.mockReset().mockResolvedValue(photo);
    mocks.validateWorkOrderPhotoFile.mockReset();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  });
  afterEach(() => cleanup());

  it('muestra estado vacío privado sin fotografías ficticias', async () => {
    renderPanel();
    expect(await screen.findByText('Sin fotografías')).toBeTruthy();
    expect(screen.getByText(/Privadas · 0/)).toBeTruthy();
    expect(screen.getByText(/máximo 10 MiB/)).toBeTruthy();
  });

  it('previsualiza, clasifica y sube una imagen real sin doble envío', async () => {
    let resolveUpload: ((value: typeof photo) => void) | undefined;
    mocks.uploadWorkOrderPhoto.mockReturnValueOnce(new Promise((resolve) => { resolveUpload = resolve; }));
    renderPanel();
    await screen.findByText('Sin fotografías');
    const file = new File(['photo'], 'final.webp', { type: 'image/webp' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(screen.getByAltText('Previsualización de final.webp')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'final' } });
    const upload = screen.getByRole('button', { name: /Subir fotografía/ });
    fireEvent.click(upload);
    await waitFor(() => expect(mocks.uploadWorkOrderPhoto).toHaveBeenCalledTimes(1));
    fireEvent.click(upload);
    expect(mocks.uploadWorkOrderPhoto).toHaveBeenCalledTimes(1);
    expect(mocks.uploadWorkOrderPhoto).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ category: 'final', file }));
    resolveUpload?.(photo);
  });

  it('muestra galería con URL firmada y exige confirmación para eliminar', async () => {
    mocks.listWorkOrderPhotos.mockResolvedValue([photo]);
    renderPanel();
    expect(await screen.findByAltText('Inicial · photo.jpg')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const confirm = screen.getByRole('button', { name: /Confirmar eliminación/ });
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.deleteWorkOrderPhoto).toHaveBeenCalledWith(expect.anything(), photo));
  });

  it('separa las fotografías vinculadas al checklist del bloque de evidencias OT', async () => {
    mocks.listWorkOrderPhotos.mockResolvedValue([{ ...photo, checklistResponseId: 'response-a', categoryLabel: 'checklist' }]);
    renderPanel(false);

    expect(await screen.findByText('Sin fotografías')).toBeTruthy();
    expect(screen.queryByAltText('Checklist · photo.jpg')).toBeNull();
  });

  it('oculta subida y eliminación en modo consulta', async () => {
    mocks.listWorkOrderPhotos.mockResolvedValue([photo]);
    renderPanel(false);
    await screen.findByAltText('Inicial · photo.jpg');
    expect(screen.queryByText('Añadir fotografía')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });
});
