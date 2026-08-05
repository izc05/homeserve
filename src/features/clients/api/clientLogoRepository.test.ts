// @vitest-environment jsdom
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLIENT_LOGO_MAX_BYTES,
  clientInitials,
  createClientLogoPath,
  uploadClientLogo,
  validateClientLogoFile,
} from './clientLogoRepository';

const tenantId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';

describe('clientLogoRepository', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('crea iniciales legibles como fallback', () => {
    expect(clientInitials('Hospital San Cecilio')).toBe('HS');
    expect(clientInitials('Granada')).toBe('G');
    expect(clientInitials('   ')).toBe('CL');
  });

  it('valida formatos y límite privado de 5 MiB', () => {
    expect(() => validateClientLogoFile({ type: 'image/webp', size: 2048 })).not.toThrow();
    expect(() => validateClientLogoFile({ type: 'image/svg+xml', size: 2048 })).toThrow(/JPG, PNG o WebP/);
    expect(() => validateClientLogoFile({ type: 'image/jpeg', size: CLIENT_LOGO_MAX_BYTES + 1 })).toThrow(/5 MiB/);
  });

  it('genera una ruta privada tenant/cliente/uuid.ext', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-2222-4333-8444-555555555555' });
    expect(createClientLogoPath(tenantId, clientId, { type: 'image/png' }))
      .toBe(`${tenantId}/${clientId}/11111111-2222-4333-8444-555555555555.png`);
  });

  it('elimina el archivo huérfano si falla el registro en base de datos', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-2222-4333-8444-555555555555' });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('new row violates row-level security policy') });
    const supabase = {
      storage: { from: vi.fn().mockReturnValue({ upload, remove }) },
      rpc,
    } as unknown as SupabaseClient;
    const file = new File([new Uint8Array(2048)], 'cliente.png', { type: 'image/png' });

    await expect(uploadClientLogo(supabase, { tenantId, clientId, file })).rejects.toThrow(/row-level security/);
    const expectedPath = `${tenantId}/${clientId}/11111111-2222-4333-8444-555555555555.png`;
    expect(upload).toHaveBeenCalledWith(expectedPath, expect.any(File), expect.objectContaining({
      contentType: 'image/png',
      metadata: { size: 2048, mimetype: 'image/png' },
      upsert: false,
    }));
    expect(remove).toHaveBeenCalledWith([expectedPath]);
  });
});
