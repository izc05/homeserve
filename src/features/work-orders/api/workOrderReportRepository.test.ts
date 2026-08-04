import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  generateWorkOrderReport,
  listWorkOrderReports,
  loadWorkOrderReportCapabilities,
  safeReportError,
} from './workOrderReportRepository';

const readyRow = {
  id: 'report-2',
  tenant_id: 'tenant-1',
  ot_id: 'order-1',
  version: 2,
  filename: 'OT-1-informe-final-v2.pdf',
  bucket: 'ot-reports',
  path: 'tenant-1/order-1/informe/report-2.pdf',
  tipo: 'final',
  estado: 'listo',
  mime_type: 'application/pdf',
  size_bytes: 2048,
  checksum_sha256: 'a'.repeat(64),
  generated_at: '2026-08-04T09:00:00Z',
  completed_at: '2026-08-04T09:01:00Z',
  failure_reason: null,
  created_by: 'manager-1',
  created_at: '2026-08-04T09:00:00Z',
};

function clientWithReports(rows = [readyRow]) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const createSignedUrls = vi.fn().mockResolvedValue({
    data: [{ path: readyRow.path, signedUrl: 'https://example.test/report' }],
    error: null,
  });

  return {
    client: {
      from: vi.fn(() => ({ select })),
      storage: { from: vi.fn(() => ({ createSignedUrls })) },
    } as unknown as SupabaseClient,
    order,
    createSignedUrls,
  };
}

describe('repositorio de informes PDF', () => {
  it('mapea versiones listas y crea enlaces privados temporales', async () => {
    const { client, createSignedUrls } = clientWithReports();
    const reports = await listWorkOrderReports(client, 'order-1');

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      id: 'report-2',
      version: 2,
      type: 'final',
      status: 'ready',
      signedUrl: 'https://example.test/report',
      sizeBytes: 2048,
    });
    expect(createSignedUrls).toHaveBeenCalledWith([readyRow.path], 300);
  });

  it('no intenta firmar enlaces de informes fallidos', async () => {
    const failed = { ...readyRow, id: 'report-1', path: null, tipo: 'provisional', estado: 'fallido', failure_reason: 'Error controlado' };
    const { client, createSignedUrls } = clientWithReports([failed]);
    const reports = await listWorkOrderReports(client, 'order-1');

    expect(reports[0]).toMatchObject({ type: 'provisional', status: 'failed', signedUrl: null, failureReason: 'Error controlado' });
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('convierte la respuesta de capacidades a nombres del dominio', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          work_order_status: 'FINALIZADA_TECNICO',
          can_generate_provisional: true,
          can_generate_final: false,
          final_report_exists: false,
        },
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(loadWorkOrderReportCapabilities(client, 'order-1')).resolves.toEqual({
      workOrderStatus: 'FINALIZADA_TECNICO',
      canGenerateProvisional: true,
      canGenerateFinal: false,
      finalReportExists: false,
    });
  });

  it('invoca la Edge Function y devuelve la nueva versión', async () => {
    const client = {
      functions: { invoke: vi.fn().mockResolvedValue({ data: { report: readyRow }, error: null }) },
    } as unknown as SupabaseClient;

    const report = await generateWorkOrderReport(client, { workOrderId: 'order-1', reportType: 'final' });
    expect(report.type).toBe('final');
    expect(report.version).toBe(2);
    expect(client.functions.invoke).toHaveBeenCalledWith('generate-work-order-report', {
      body: { workOrderId: 'order-1', reportType: 'final' },
    });
  });

  it('protege detalles internos en errores inesperados', () => {
    expect(safeReportError(new Error('duplicate key exposes internal row'))).toBe('No se pudo generar el informe PDF. Revisa la conexión y vuelve a intentarlo.');
    expect(safeReportError(new Error('Solo un responsable puede generar el informe final'))).toBe('Solo un responsable puede generar el informe final');
  });
});
