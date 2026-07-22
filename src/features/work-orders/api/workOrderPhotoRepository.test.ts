import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkOrderPhotoPath,
  deleteWorkOrderPhoto,
  listWorkOrderPhotos,
  uploadWorkOrderPhoto,
  validateWorkOrderPhotoFile,
  WORK_ORDER_PHOTO_MAX_BYTES,
} from './workOrderPhotoRepository';

const row = {
  id: 'photo-id', tenant_id: 'tenant-id', ot_id: 'order-id', checklist_respuesta_id: null,
  tipo: 'inicial', bucket: 'ot-photos', path: 'tenant-id/order-id/foto/photo.jpg',
  filename: 'photo.jpg', mime_type: 'image/jpeg', size_bytes: 100, created_by: 'tech-id', created_at: '2026-07-22T08:00:00Z',
};

function fakeClient() {
  const order = vi.fn(async () => ({ data: [row], error: null }));
  const tableChain = { select: vi.fn(), eq: vi.fn(), order };
  tableChain.select.mockReturnValue(tableChain);
  tableChain.eq.mockReturnValue(tableChain);
  const upload = vi.fn(async () => ({ data: { path: row.path }, error: null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const createSignedUrls = vi.fn(async () => ({ data: [{ path: row.path, signedUrl: 'https://signed.test/photo' }], error: null }));
  const storageFrom = vi.fn(() => ({ upload, remove, createSignedUrls }));
  const rpc = vi.fn(async (): Promise<{ data: typeof row | null; error: Error | null }> => ({ data: row, error: null }));
  return { client: { from: vi.fn(() => tableChain), storage: { from: storageFrom }, rpc } as unknown as SupabaseClient, upload, remove, createSignedUrls, rpc };
}

describe('work order photo repository', () => {
  beforeEach(() => vi.stubGlobal('crypto', { randomUUID: () => '12345678-1234-4234-8234-123456789012' }));

  it('valida MIME y límite de 10 MiB', () => {
    expect(() => validateWorkOrderPhotoFile({ name: 'ok.jpg', type: 'image/jpeg', size: 100 })).not.toThrow();
    expect(() => validateWorkOrderPhotoFile({ name: 'bad.pdf', type: 'application/pdf', size: 100 })).toThrow('JPEG, PNG o WebP');
    expect(() => validateWorkOrderPhotoFile({ name: 'large.jpg', type: 'image/jpeg', size: WORK_ORDER_PHOTO_MAX_BYTES + 1 })).toThrow('10 MiB');
  });

  it('genera una ruta aislada por tenant y OT sin reutilizar el nombre original', () => {
    expect(createWorkOrderPhotoPath('tenant-id', 'order-id', { type: 'image/webp' })).toBe('tenant-id/order-id/foto/12345678-1234-4234-8234-123456789012.webp');
  });

  it('sube al bucket privado y registra la categoría mediante RPC', async () => {
    const { client, upload, rpc } = fakeClient();
    const file = new File(['photo'], 'Inicial real.jpg', { type: 'image/jpeg' });
    await uploadWorkOrderPhoto(client, { tenantId: 'tenant-id', workOrderId: 'order-id', category: 'initial', file });
    expect(upload).toHaveBeenCalledWith(expect.stringContaining('tenant-id/order-id/foto/'), file, expect.objectContaining({ upsert: false }));
    expect(rpc).toHaveBeenCalledWith('register_work_order_photo', expect.objectContaining({ photo_type_text: 'inicial', filename_text: 'Inicial real.jpg' }));
  });

  it('elimina el objeto subido si falla el registro de metadatos', async () => {
    const { client, remove, rpc } = fakeClient();
    rpc.mockResolvedValueOnce({ data: null, error: new Error('Registro rechazado') });
    const file = new File(['photo'], 'Inicial.jpg', { type: 'image/jpeg' });
    await expect(uploadWorkOrderPhoto(client, { tenantId: 'tenant-id', workOrderId: 'order-id', category: 'initial', file })).rejects.toThrow('Registro rechazado');
    expect(remove).toHaveBeenCalledWith([expect.stringContaining('tenant-id/order-id/foto/')]);
  });

  it('crea URLs firmadas temporales y elimina Storage antes del metadato', async () => {
    const { client, createSignedUrls, remove, rpc } = fakeClient();
    const photos = await listWorkOrderPhotos(client, 'order-id');
    expect(createSignedUrls).toHaveBeenCalledWith([row.path], 300);
    expect(photos[0].signedUrl).toBe('https://signed.test/photo');
    await deleteWorkOrderPhoto(client, photos[0]);
    expect(remove).toHaveBeenCalledWith([row.path]);
    expect(rpc).toHaveBeenCalledWith('delete_work_order_photo_metadata', { photo_uuid: row.id });
  });
});
