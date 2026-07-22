import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { INSTALLATION_PHOTO_MAX_BYTES, listInstallationPhotos, uploadInstallationPhoto, validateInstallationPhotoFile } from './installationPhotoRepository';

function queryClient(rows: unknown[]) {
  const orderSecond = vi.fn().mockResolvedValue({ data: rows, error: null });
  const orderFirst = vi.fn().mockReturnValue({ order: orderSecond });
  const eqState = vi.fn().mockReturnValue({ order: orderFirst });
  const eqInstallation = vi.fn().mockReturnValue({ eq: eqState });
  const select = vi.fn().mockReturnValue({ eq: eqInstallation });
  const createSignedUrls = vi.fn().mockResolvedValue({ data: [{ path: 'tenant/install/foto/main.jpg', signedUrl: 'https://signed.example/main' }], error: null });
  return { client: { from: vi.fn().mockReturnValue({ select }), storage: { from: vi.fn().mockReturnValue({ createSignedUrls }) } } as unknown as SupabaseClient, createSignedUrls };
}

describe('installationPhotoRepository', () => {
  it('acepta solo formatos privados soportados dentro del límite', () => {
    expect(() => validateInstallationPhotoFile({ type: 'image/webp', size: 2048 })).not.toThrow();
    expect(() => validateInstallationPhotoFile({ type: 'image/gif', size: 2048 })).toThrow(/JPEG, PNG o WebP/);
    expect(() => validateInstallationPhotoFile({ type: 'image/jpeg', size: INSTALLATION_PHOTO_MAX_BYTES + 1 })).toThrow(/10 MiB/);
  });

  it('genera URLs firmadas temporales para metadatos reales', async () => {
    const { client, createSignedUrls } = queryClient([{
      id: 'photo-a', tenant_id: 'tenant-a', instalacion_id: 'install-a', bucket: 'installation-photos',
      path: 'tenant/install/foto/main.jpg', filename: 'main.jpg', mime_type: 'image/jpeg', size_bytes: 1024,
      titulo: 'Acceso', descripcion: null, categoria: 'acceso', es_principal: true, estado: 'activo',
      created_by: 'admin-a', created_at: '2026-07-22T08:00:00Z',
    }]);
    const photos = await listInstallationPhotos(client, 'install-a');

    expect(createSignedUrls).toHaveBeenCalledWith(['tenant/install/foto/main.jpg'], 300);
    expect(photos[0]).toMatchObject({ title: 'Acceso', main: true, signedUrl: 'https://signed.example/main' });
  });

  it('no consulta Storage cuando no existen fotografías', async () => {
    const { client, createSignedUrls } = queryClient([]);
    await expect(listInstallationPhotos(client, 'install-a')).resolves.toEqual([]);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('incluye el tamaño en metadata para satisfacer la política RLS de Storage', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: 'photo-a', tenant_id: 'tenant-a', instalacion_id: 'install-a', bucket: 'installation-photos',
        path: 'tenant-a/install-a/foto/photo.png', filename: 'photo.png', mime_type: 'image/png', size_bytes: 2048,
        titulo: 'Fachada', descripcion: null, categoria: 'acceso', es_principal: true, estado: 'activo',
        created_by: 'admin-a', created_at: '2026-07-22T08:00:00Z',
      },
      error: null,
    });
    const client = {
      storage: { from: vi.fn().mockReturnValue({ upload }) },
      rpc,
    } as unknown as SupabaseClient;
    const file = new File([new Uint8Array(2048)], 'photo.png', { type: 'image/png' });

    await uploadInstallationPhoto(client, {
      tenantId: 'tenant-a',
      installationId: 'install-a',
      file,
      category: 'acceso',
      main: true,
    });

    expect(upload).toHaveBeenCalledWith(expect.any(String), file, expect.objectContaining({
      contentType: 'image/png',
      upsert: false,
      metadata: { size: 2048 },
    }));
    expect(rpc).toHaveBeenCalledWith('register_installation_photo', expect.objectContaining({ size_bytes_value: 2048 }));
  });
});
