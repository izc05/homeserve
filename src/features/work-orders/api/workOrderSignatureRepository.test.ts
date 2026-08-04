import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkOrderSignaturePath,
  listWorkOrderSignatures,
  uploadTechnicianSignature,
  validateWorkOrderSignatureFile,
  WORK_ORDER_SIGNATURE_MAX_BYTES,
} from './workOrderSignatureRepository';

const row = {
  id: 'signature-id',
  tenant_id: 'tenant-id',
  ot_id: 'order-id',
  visita_id: 'visit-id',
  tipo: 'tecnico',
  bucket: 'ot-signatures',
  path: 'tenant-id/order-id/firma/signature.png',
  firmante_nombre: 'Técnico Demo',
  mime_type: 'image/png',
  size_bytes: 1200,
  signed_at: '2026-08-04T08:00:00Z',
  created_by: 'tech-id',
  created_at: '2026-08-04T08:00:00Z',
};

function fakeClient() {
  const order = vi.fn(async () => ({ data: [row], error: null }));
  const tableChain = { select: vi.fn(), eq: vi.fn(), order };
  tableChain.select.mockReturnValue(tableChain);
  tableChain.eq.mockReturnValue(tableChain);

  const upload = vi.fn(async () => ({ data: { path: row.path }, error: null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const createSignedUrls = vi.fn(async () => ({ data: [{ path: row.path, signedUrl: 'https://signed.test/signature' }], error: null }));
  const storageFrom = vi.fn(() => ({ upload, remove, createSignedUrls }));
  const rpc = vi.fn(async (): Promise<{ data: typeof row | null; error: Error | null }> => ({ data: row, error: null }));

  return {
    client: { from: vi.fn(() => tableChain), storage: { from: storageFrom }, rpc } as unknown as SupabaseClient,
    upload,
    remove,
    createSignedUrls,
    rpc,
  };
}

describe('work order signature repository', () => {
  beforeEach(() => vi.stubGlobal('crypto', { randomUUID: () => '12345678-1234-4234-8234-123456789012' }));

  it('solo admite PNG de hasta 2 MiB', () => {
    expect(() => validateWorkOrderSignatureFile({ type: 'image/png', size: 100 })).not.toThrow();
    expect(() => validateWorkOrderSignatureFile({ type: 'image/jpeg', size: 100 })).toThrow('formato PNG');
    expect(() => validateWorkOrderSignatureFile({ type: 'image/png', size: WORK_ORDER_SIGNATURE_MAX_BYTES + 1 })).toThrow('2 MiB');
  });

  it('genera una ruta aislada por organización y OT', () => {
    expect(createWorkOrderSignaturePath('tenant-id', 'order-id')).toBe('tenant-id/order-id/firma/12345678-1234-4234-8234-123456789012.png');
  });

  it('sube la firma al bucket privado y registra los metadatos por RPC', async () => {
    const { client, upload, rpc } = fakeClient();
    const file = new File(['signature'], 'firma-tecnico.png', { type: 'image/png' });

    const signature = await uploadTechnicianSignature(client, {
      tenantId: 'tenant-id',
      workOrderId: 'order-id',
      signerName: 'Técnico Demo',
      file,
    });

    expect(upload).toHaveBeenCalledWith(expect.stringContaining('tenant-id/order-id/firma/'), file, expect.objectContaining({ upsert: false }));
    expect(rpc).toHaveBeenCalledWith('register_technician_signature', expect.objectContaining({
      work_order_uuid: 'order-id',
      signer_name_text: 'Técnico Demo',
      mime_type_text: 'image/png',
    }));
    expect(signature.signerName).toBe('Técnico Demo');
  });

  it('elimina el archivo si la base de datos rechaza el registro', async () => {
    const { client, remove, rpc } = fakeClient();
    rpc.mockResolvedValueOnce({ data: null, error: new Error('Firma rechazada') });
    const file = new File(['signature'], 'firma-tecnico.png', { type: 'image/png' });

    await expect(uploadTechnicianSignature(client, {
      tenantId: 'tenant-id',
      workOrderId: 'order-id',
      signerName: 'Técnico Demo',
      file,
    })).rejects.toThrow('Firma rechazada');

    expect(remove).toHaveBeenCalledWith([expect.stringContaining('tenant-id/order-id/firma/')]);
  });

  it('crea una URL firmada temporal para consultar la evidencia', async () => {
    const { client, createSignedUrls } = fakeClient();
    const signatures = await listWorkOrderSignatures(client, 'order-id');

    expect(createSignedUrls).toHaveBeenCalledWith([row.path], 300);
    expect(signatures[0].signedUrl).toBe('https://signed.test/signature');
    expect(signatures[0].type).toBe('technician');
  });
});
