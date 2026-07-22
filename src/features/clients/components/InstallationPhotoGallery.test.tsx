// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import InstallationPhotoGallery from './InstallationPhotoGallery';

const mocks = vi.hoisted(() => ({ list: vi.fn(), upload: vi.fn(), setMain: vi.fn(), remove: vi.fn(), validate: vi.fn() }));
vi.mock('../api/installationPhotoRepository', async () => {
  const actual = await vi.importActual<typeof import('../api/installationPhotoRepository')>('../api/installationPhotoRepository');
  return { ...actual, listInstallationPhotos: mocks.list, uploadInstallationPhoto: mocks.upload, setInstallationMainPhoto: mocks.setMain, deleteInstallationPhoto: mocks.remove, validateInstallationPhotoFile: mocks.validate };
});

const photo = {
  id: 'photo-a', tenantId: 'tenant-a', installationId: 'install-a', bucket: 'installation-photos', path: 'tenant/install/foto/a.jpg',
  filename: 'a.jpg', mimeType: 'image/jpeg', sizeBytes: 1024, title: 'Acceso principal', description: 'Puerta norte', category: 'acceso' as const,
  main: true, active: true, createdBy: 'admin-a', createdAt: '2026-07-22T08:00:00Z', signedUrl: 'https://signed.example/a',
};

function renderGallery(canManage: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><InstallationPhotoGallery tenantId="tenant-a" installationId="install-a" installationName="Cubierta" address="Calle Prueba 1" contactName="Laura" contactPhone="600000000" canManage={canManage} client={{} as SupabaseClient} /></QueryClientProvider>);
}

describe('InstallationPhotoGallery', () => {
  beforeEach(() => {
    mocks.list.mockReset().mockResolvedValue([photo]);
    mocks.upload.mockReset().mockResolvedValue(photo);
    mocks.setMain.mockReset().mockResolvedValue(photo);
    mocks.remove.mockReset().mockResolvedValue(photo);
    mocks.validate.mockReset();
  });
  afterEach(() => cleanup());

  it('renderiza datos reales, URL firmada y contexto de acceso', async () => {
    renderGallery(false);
    const images = await screen.findAllByRole('img', { name: 'Acceso principal' });
    expect(images.every((image) => image.getAttribute('src') === 'https://signed.example/a')).toBe(true);
    expect(screen.getByText('Calle Prueba 1')).toBeTruthy();
    expect(screen.getByText('Laura')).toBeTruthy();
    expect(screen.queryByText('Añadir fotografía')).toBeNull();
  });

  it('muestra un estado vacío profesional sin inventar fotografías', async () => {
    mocks.list.mockResolvedValueOnce([]);
    renderGallery(true);
    expect(await screen.findByText('Sin fotografías de instalación')).toBeTruthy();
    expect(screen.getByText('Añade imágenes reales de accesos, equipos o medidas de seguridad.')).toBeTruthy();
  });

  it('elimina solo después de confirmación explícita', async () => {
    renderGallery(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Acceso principal' }));
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeTruthy();
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(expect.anything(), photo));
  });
});
