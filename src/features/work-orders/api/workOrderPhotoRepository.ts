import type { SupabaseClient } from '@supabase/supabase-js';

export const WORK_ORDER_PHOTO_BUCKET = 'ot-photos';
export const WORK_ORDER_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const WORK_ORDER_PHOTO_URL_TTL_SECONDS = 5 * 60;

export type WorkOrderPhotoCategory = 'initial' | 'during' | 'final';
type StoredPhotoType = 'inicial' | 'evidencia' | 'final' | 'checklist';

export type WorkOrderPhoto = {
  id: string;
  tenantId: string;
  workOrderId: string;
  checklistResponseId: string | null;
  category: WorkOrderPhotoCategory;
  storedType: StoredPhotoType;
  bucket: string;
  path: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdBy: string;
  createdAt: string;
  signedUrl: string | null;
};

type PhotoRow = {
  id?: string;
  tenant_id?: string;
  ot_id?: string;
  checklist_respuesta_id?: string | null;
  tipo?: string;
  bucket?: string;
  path?: string;
  filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | string | null;
  created_by?: string;
  created_at?: string;
};

const PHOTO_COLUMNS = 'id,tenant_id,ot_id,checklist_respuesta_id,tipo,bucket,path,filename,mime_type,size_bytes,created_by,created_at';
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function requireUuid(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}

function categoryToStoredType(category: WorkOrderPhotoCategory): StoredPhotoType {
  if (category === 'initial') return 'inicial';
  if (category === 'final') return 'final';
  return 'evidencia';
}

function storedTypeToCategory(value: string | null | undefined): WorkOrderPhotoCategory {
  if (value === 'inicial') return 'initial';
  if (value === 'final') return 'final';
  return 'during';
}

function mapPhoto(row: PhotoRow, signedUrl: string | null = null): WorkOrderPhoto {
  if (!row.id || !row.tenant_id || !row.ot_id || !row.path || !row.created_by) {
    throw new Error('La base de datos devolvió una fotografía incompleta.');
  }

  const storedType = String(row.tipo || 'evidencia') as StoredPhotoType;
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    workOrderId: String(row.ot_id),
    checklistResponseId: row.checklist_respuesta_id ?? null,
    category: storedTypeToCategory(storedType),
    storedType,
    bucket: String(row.bucket || WORK_ORDER_PHOTO_BUCKET),
    path: String(row.path),
    filename: String(row.filename || 'Fotografía de intervención'),
    mimeType: String(row.mime_type || ''),
    sizeBytes: Number(row.size_bytes ?? 0),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at || ''),
    signedUrl,
  };
}

export function validateWorkOrderPhotoFile(file: Pick<File, 'name' | 'type' | 'size'>) {
  if (!MIME_EXTENSIONS[file.type]) {
    throw new Error('Selecciona una imagen JPEG, PNG o WebP.');
  }
  if (file.size < 1) throw new Error('La fotografía seleccionada está vacía.');
  if (file.size > WORK_ORDER_PHOTO_MAX_BYTES) {
    throw new Error('La fotografía no puede superar 10 MiB.');
  }
}

export function createWorkOrderPhotoPath(
  tenantId: string,
  workOrderId: string,
  file: Pick<File, 'type'>,
) {
  requireUuid(tenantId, 'No se ha indicado la organización de la fotografía.');
  requireUuid(workOrderId, 'No se ha indicado la OT de la fotografía.');
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error('El formato de fotografía no está permitido.');
  if (!globalThis.crypto?.randomUUID) throw new Error('El navegador no puede generar una ruta segura para la fotografía.');
  return `${tenantId}/${workOrderId}/foto/${globalThis.crypto.randomUUID()}.${extension}`;
}

export async function listWorkOrderPhotos(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderPhoto[]> {
  requireUuid(workOrderId, 'No se ha indicado la OT para consultar fotografías.');
  const { data, error } = await supabase
    .from('ot_fotos')
    .select(PHOTO_COLUMNS)
    .eq('ot_id', workOrderId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as PhotoRow[];
  if (rows.length === 0) return [];

  const { data: signedRows, error: signedError } = await supabase.storage
    .from(WORK_ORDER_PHOTO_BUCKET)
    .createSignedUrls(rows.map((row) => String(row.path)), WORK_ORDER_PHOTO_URL_TTL_SECONDS);
  if (signedError) throw signedError;

  const signedByPath = new Map((signedRows ?? []).map((item) => [String(item.path), item.signedUrl || null]));
  return rows.map((row) => mapPhoto(row, signedByPath.get(String(row.path)) ?? null));
}

export async function uploadWorkOrderPhoto(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    workOrderId: string;
    category: WorkOrderPhotoCategory;
    file: File;
    checklistResponseId?: string | null;
  },
): Promise<WorkOrderPhoto> {
  validateWorkOrderPhotoFile(input.file);
  const path = createWorkOrderPhotoPath(input.tenantId, input.workOrderId, input.file);
  const storage = supabase.storage.from(WORK_ORDER_PHOTO_BUCKET);
  const { error: uploadError } = await storage.upload(path, input.file, {
    cacheControl: '3600',
    contentType: input.file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc('register_work_order_photo', {
    work_order_uuid: input.workOrderId,
    photo_type_text: categoryToStoredType(input.category),
    path_text: path,
    filename_text: input.file.name,
    mime_type_text: input.file.type,
    size_bytes_value: input.file.size,
    checklist_response_uuid: input.checklistResponseId ?? null,
  });

  if (error) {
    await storage.remove([path]);
    throw error;
  }
  return mapPhoto((data ?? {}) as PhotoRow);
}

export async function deleteWorkOrderPhoto(
  supabase: SupabaseClient,
  photo: Pick<WorkOrderPhoto, 'id' | 'bucket' | 'path'>,
) {
  requireUuid(photo.id, 'No se ha indicado la fotografía a eliminar.');
  if (photo.bucket !== WORK_ORDER_PHOTO_BUCKET) throw new Error('El bucket de la fotografía no es válido.');

  const { error: storageError } = await supabase.storage.from(photo.bucket).remove([photo.path]);
  if (storageError) throw storageError;

  const { data, error } = await supabase.rpc('delete_work_order_photo_metadata', {
    photo_uuid: photo.id,
  });
  if (error) throw error;
  return mapPhoto((data ?? {}) as PhotoRow);
}
