import type { SupabaseClient } from '@supabase/supabase-js';

export const WORK_ORDER_REPORT_BUCKET = 'ot-reports';
export const WORK_ORDER_REPORT_URL_TTL_SECONDS = 5 * 60;

export type WorkOrderReportType = 'provisional' | 'final';
export type WorkOrderReportStatus = 'generating' | 'ready' | 'failed';

export type WorkOrderReport = {
  id: string;
  tenantId: string;
  workOrderId: string;
  version: number;
  filename: string;
  bucket: string;
  path: string | null;
  type: WorkOrderReportType;
  status: WorkOrderReportStatus;
  mimeType: string | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  generatedAt: string;
  completedAt: string | null;
  failureReason: string | null;
  createdBy: string;
  signedUrl: string | null;
};

export type WorkOrderReportCapabilities = {
  workOrderStatus: string;
  canGenerateProvisional: boolean;
  canGenerateFinal: boolean;
  finalReportExists: boolean;
};

type ReportRow = {
  id?: string;
  tenant_id?: string;
  ot_id?: string;
  version?: number | string;
  filename?: string;
  bucket?: string | null;
  path?: string | null;
  tipo?: string | null;
  estado?: string | null;
  mime_type?: string | null;
  size_bytes?: number | string | null;
  checksum_sha256?: string | null;
  generated_at?: string | null;
  completed_at?: string | null;
  failure_reason?: string | null;
  created_by?: string;
  created_at?: string;
};

type CapabilityRow = {
  work_order_status?: string;
  can_generate_provisional?: boolean;
  can_generate_final?: boolean;
  final_report_exists?: boolean;
};

const REPORT_COLUMNS = 'id,tenant_id,ot_id,version,filename,bucket,path,tipo,estado,mime_type,size_bytes,checksum_sha256,generated_at,completed_at,failure_reason,created_by,created_at';

function requireValue(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function mapReport(row: ReportRow, signedUrl: string | null = null): WorkOrderReport {
  if (!row.id || !row.tenant_id || !row.ot_id || !row.filename || !row.created_by) {
    throw new Error('La base de datos devolvió un informe incompleto.');
  }

  const type: WorkOrderReportType = row.tipo === 'final' ? 'final' : 'provisional';
  const status: WorkOrderReportStatus = row.estado === 'listo'
    ? 'ready'
    : row.estado === 'fallido'
      ? 'failed'
      : 'generating';

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    workOrderId: String(row.ot_id),
    version: Number(row.version ?? 1),
    filename: String(row.filename),
    bucket: String(row.bucket || WORK_ORDER_REPORT_BUCKET),
    path: row.path?.trim() || null,
    type,
    status,
    mimeType: row.mime_type?.trim() || null,
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    checksumSha256: row.checksum_sha256?.trim() || null,
    generatedAt: String(row.generated_at || row.created_at || ''),
    completedAt: row.completed_at ?? null,
    failureReason: row.failure_reason?.trim() || null,
    createdBy: String(row.created_by),
    signedUrl,
  };
}

export function safeReportError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : '';
  if (/^(La OT|El informe|Solo un responsable|No tienes permiso|Debes iniciar sesión)/i.test(message)) return message;
  return 'No se pudo generar el informe PDF. Revisa la conexión y vuelve a intentarlo.';
}

export async function loadWorkOrderReportCapabilities(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderReportCapabilities> {
  requireValue(workOrderId, 'No se ha indicado la OT para consultar informes.');
  const { data, error } = await supabase.rpc('get_work_order_report_capabilities', {
    work_order_uuid: workOrderId,
  });
  if (error) throw error;

  const row = (data ?? {}) as CapabilityRow;
  return {
    workOrderStatus: String(row.work_order_status || ''),
    canGenerateProvisional: Boolean(row.can_generate_provisional),
    canGenerateFinal: Boolean(row.can_generate_final),
    finalReportExists: Boolean(row.final_report_exists),
  };
}

export async function listWorkOrderReports(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderReport[]> {
  requireValue(workOrderId, 'No se ha indicado la OT para consultar informes.');
  const { data, error } = await supabase
    .from('ot_informes')
    .select(REPORT_COLUMNS)
    .eq('ot_id', workOrderId)
    .order('version', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as ReportRow[];
  const downloadable = rows.filter((row) => row.estado === 'listo' && Boolean(row.path?.trim()));
  const signedByPath = new Map<string, string | null>();

  if (downloadable.length > 0) {
    const { data: signedRows, error: signedError } = await supabase.storage
      .from(WORK_ORDER_REPORT_BUCKET)
      .createSignedUrls(downloadable.map((row) => String(row.path)), WORK_ORDER_REPORT_URL_TTL_SECONDS);
    if (signedError) throw signedError;
    for (const signed of signedRows ?? []) signedByPath.set(String(signed.path), signed.signedUrl || null);
  }

  return rows.map((row) => mapReport(row, row.path ? signedByPath.get(row.path) ?? null : null));
}

export async function generateWorkOrderReport(
  supabase: SupabaseClient,
  input: { workOrderId: string; reportType: WorkOrderReportType },
): Promise<WorkOrderReport> {
  requireValue(input.workOrderId, 'No se ha indicado la OT para generar el informe.');
  const { data, error } = await supabase.functions.invoke('generate-work-order-report', {
    body: { workOrderId: input.workOrderId, reportType: input.reportType },
  });
  if (error) throw error;
  if (!data?.report) throw new Error(data?.error || 'No se recibió el informe generado.');
  return mapReport(data.report as ReportRow);
}
