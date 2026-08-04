// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkOrderReportsPanel from './WorkOrderReportsPanel';

const mocks = vi.hoisted(() => ({
  listReports: vi.fn(),
  loadCapabilities: vi.fn(),
  generateReport: vi.fn(),
}));

vi.mock('../api/workOrderReportRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/workOrderReportRepository')>();
  return {
    ...actual,
    listWorkOrderReports: mocks.listReports,
    loadWorkOrderReportCapabilities: mocks.loadCapabilities,
    generateWorkOrderReport: mocks.generateReport,
  };
});

const generatedReport = {
  id: 'report-1',
  tenantId: 'tenant-1',
  workOrderId: 'order-1',
  version: 1,
  filename: 'OT-1-informe-provisional-v1.pdf',
  bucket: 'ot-reports',
  path: 'tenant-1/order-1/informe/report-1.pdf',
  type: 'provisional' as const,
  status: 'ready' as const,
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  checksumSha256: 'a'.repeat(64),
  generatedAt: '2026-08-04T10:00:00Z',
  completedAt: '2026-08-04T10:01:00Z',
  failureReason: null,
  createdBy: 'user-1',
  signedUrl: null,
};

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('automatización de informes PDF', () => {
  beforeEach(() => {
    mocks.listReports.mockReset().mockResolvedValue([]);
    mocks.loadCapabilities.mockReset().mockResolvedValue({
      workOrderStatus: 'FINALIZADA_TECNICO',
      reportRequired: true,
      provisionalReportExists: false,
      canGenerateProvisional: true,
      canGenerateFinal: false,
      finalReportExists: false,
    });
    mocks.generateReport.mockReset().mockResolvedValue(generatedReport);
  });

  afterEach(() => cleanup());

  it('genera una sola vez el provisional obligatorio al finalizar', async () => {
    render(<WorkOrderReportsPanel workOrderId="order-1" client={{} as never} />, { wrapper: wrapper() });

    await waitFor(() => expect(mocks.generateReport).toHaveBeenCalledWith({} as never, {
      workOrderId: 'order-1',
      reportType: 'provisional',
    }));
    await waitFor(() => expect(mocks.generateReport).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Informe generado y guardado/)).toBeTruthy();
  });

  it('no genera automáticamente cuando el informe es opcional', async () => {
    mocks.loadCapabilities.mockResolvedValue({
      workOrderStatus: 'FINALIZADA_TECNICO',
      reportRequired: false,
      provisionalReportExists: false,
      canGenerateProvisional: true,
      canGenerateFinal: false,
      finalReportExists: false,
    });

    render(<WorkOrderReportsPanel workOrderId="order-2" client={{} as never} />, { wrapper: wrapper() });

    expect(await screen.findByText('Sin informes generados')).toBeTruthy();
    expect(mocks.generateReport).not.toHaveBeenCalled();
  });

  it('genera el final obligatorio después de la validación', async () => {
    mocks.loadCapabilities.mockResolvedValue({
      workOrderStatus: 'VALIDADA',
      reportRequired: true,
      provisionalReportExists: true,
      canGenerateProvisional: false,
      canGenerateFinal: true,
      finalReportExists: false,
    });
    mocks.generateReport.mockResolvedValue({ ...generatedReport, id: 'report-2', type: 'final', version: 2 });

    render(<WorkOrderReportsPanel workOrderId="order-3" client={{} as never} />, { wrapper: wrapper() });

    await waitFor(() => expect(mocks.generateReport).toHaveBeenCalledWith({} as never, {
      workOrderId: 'order-3',
      reportType: 'final',
    }));
  });
});
