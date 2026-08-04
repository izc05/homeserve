import type { SupabaseClient } from '@supabase/supabase-js';

export const WORK_ORDER_SIGNATURE_BUCKET = 'ot-signatures';
export const WORK_ORDER_SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
export const WORK_ORDER_SIGNATURE_URL_TTL_SECONDS = 5 * 60;

export type WorkOrderSignature = {
  id: string;
  tenantId: string;
  workOrderId: string;
  visitId: string | null;
  type: 'technician' | 'responsible';
  bucket: string;
  path: string;
  signerName: string;
  mimeType: string;
  sizeBytes: number;
  signedAt: string;
  createdBy: string;
  signedUrl: string | null;
};

type SignatureRow = {
  id?: string;
  tenant_id?: string;
  ot_id?: string;
  visita_id?: string | null;
  tipo?: string;
  bucket?: string;
  path?: string;
  firmante_nombre?: string | null;
  mime_type?: string | null;
  size_bytes?: number | string | null;
  signed_at?: string | null;
  created_by?: string;
  created_at?: string;
};

const SIGNATURE_COLUMNS = 'id,tenant_id,ot_id,visita_id,tipo,bucket,path,firmante_nombre,mime_type,size_bytes,signed_at,created_by,created_at';

function requireValue(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function mapSignature(row: SignatureRow, signedUrl: string | null = null): WorkOrderSignature {
  if (!row.id || !row.tenant_id || !row.ot_id || !row.path || !row.created_by) {
    throw new Error('La base de datos devolvió una firma incompleta.');
  }

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    workOrderId: String(row.ot_id),
    visitId: row.visita_id ?? null,
    type: row.tipo === 'responsable' ? 'responsible' : 'technician',
    bucket: String(row.bucket || WORK_ORDER_SIGNATURE_BUCKET),
    path: String(row.path),
    signerName: String(row.firmante_nombre || 'Técnico'),
    mimeType: String(row.mime_type || 'image/png'),
    sizeBytes: Number(row.size_bytes ?? 0),
    signedAt: String(row.signed_at || row.created_at || ''),
    createdBy: String(row.created_by),
    signedUrl,
  };
}

export function validateWorkOrderSignatureFile(file: Pick<File, 'type' | 'size'>) {
  if (file.type !== 'image/png') throw new Error('La firma debe guardarse en formato PNG.');
  if (file.size < 1) throw new Error('La firma está vacía.');
  if (file.size > WORK_ORDER_SIGNATURE_MAX_BYTES) {
    throw new Error('La firma no puede superar 2 MiB.');
  }
}

export function createWorkOrderSignaturePath(tenantId: string, workOrderId: string) {
  requireValue(tenantId, 'No se ha indicado la organización de la firma.');
  requireValue(workOrderId, 'No se ha indicado la OT de la firma.');
  if (!globalThis.crypto?.randomUUID) throw new Error('El navegador no puede generar una ruta segura para la firma.');
  return `${tenantId}/${workOrderId}/firma/${globalThis.crypto.randomUUID()}.png`;
}

export async function listWorkOrderSignatures(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderSignature[]> {
  requireValue(workOrderId, 'No se ha indicado la OT para consultar firmas.');
  const { data, error } = await supabase
    .from('ot_firmas')
    .select(SIGNATURE_COLUMNS)
    .eq('ot_id', workOrderId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as SignatureRow[];
  if (rows.length === 0) return [];

  const { data: signedRows, error: signedError } = await supabase.storage
    .from(WORK_ORDER_SIGNATURE_BUCKET)
    .createSignedUrls(rows.map((row) => String(row.path)), WORK_ORDER_SIGNATURE_URL_TTL_SECONDS);
  if (signedError) throw signedError;

  const signedByPath = new Map((signedRows ?? []).map((item) => [String(item.path), item.signedUrl || null]));
  return rows.map((row) => mapSignature(row, signedByPath.get(String(row.path)) ?? null));
}

export async function uploadTechnicianSignature(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    workOrderId: string;
    signerName: string;
    file: File;
  },
): Promise<WorkOrderSignature> {
  requireValue(input.signerName, 'Indica el nombre del técnico firmante.');
  validateWorkOrderSignatureFile(input.file);

  const path = createWorkOrderSignaturePath(input.tenantId, input.workOrderId);
  const storage = supabase.storage.from(WORK_ORDER_SIGNATURE_BUCKET);
  const { error: uploadError } = await storage.upload(path, input.file, {
    cacheControl: '3600',
    contentType: input.file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc('register_technician_signature', {
    work_order_uuid: input.workOrderId,
    path_text: path,
    signer_name_text: input.signerName.trim(),
    mime_type_text: input.file.type,
    size_bytes_value: input.file.size,
  });

  if (error) {
    await storage.remove([path]);
    throw error;
  }

  return mapSignature((data ?? {}) as SignatureRow);
}
