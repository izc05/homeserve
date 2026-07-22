import type { SupabaseClient } from '@supabase/supabase-js';

export const INSTALLATION_PHOTO_BUCKET = 'installation-photos';
export const INSTALLATION_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const INSTALLATION_PHOTO_URL_TTL_SECONDS = 5 * 60;

export type InstallationPhotoCategory = 'principal' | 'acceso' | 'equipos' | 'seguridad' | 'general';

export type InstallationPhoto = {
  id: string;
  tenantId: string;
  installationId: string;
  bucket: string;
  path: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  title: string | null;
  description: string | null;
  category: InstallationPhotoCategory;
  main: boolean;
  active: boolean;
  createdBy: string;
  createdAt: string;
  signedUrl: string | null;
};

type PhotoRow = {
  id?: string;
  tenant_id?: string;
  instalacion_id?: string;
  bucket?: string;
  path?: string;
  filename?: string | null;
  mime_type?: string;
  size_bytes?: number | string;
  titulo?: string | null;
  descripcion?: string | null;
  categoria?: string;
  es_principal?: boolean;
  estado?: string;
  created_by?: string;
  created_at?: string;
};

const COLUMNS = 'id,tenant_id,instalacion_id,bucket,path,filename,mime_type,size_bytes,titulo,descripcion,categoria,es_principal,estado,created_by,created_at';
const MIME_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function required(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}
function mapPhoto(row: PhotoRow, signedUrl: string | null = null): InstallationPhoto {
  if (!row.id || !row.tenant_id || !row.instalacion_id || !row.path || !row.mime_type || !row.created_by) {
    throw new Error('La base de datos devolvió una fotografía de instalación incompleta.');
  }
  return {
    id: row.id,
    tenantId: row.tenant_id,
    installationId: row.instalacion_id,
    bucket: String(row.bucket || INSTALLATION_PHOTO_BUCKET),
    path: row.path,
    filename: String(row.filename || 'Fotografía de instalación'),
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    title: row.titulo?.trim() || null,
    description: row.descripcion?.trim() || null,
    category: String(row.categoria || 'general') as InstallationPhotoCategory,
    main: row.es_principal === true,
    active: row.estado !== 'inactivo',
    createdBy: row.created_by,
    createdAt: String(row.created_at || ''),
    signedUrl,
  };
}

export function validateInstallationPhotoFile(file: Pick<File, 'type' | 'size'>) {
  if (!MIME_EXTENSIONS[file.type]) throw new Error('Selecciona una imagen JPEG, PNG o WebP.');
  if (file.size < 1) throw new Error('La fotografía seleccionada está vacía.');
  if (file.size > INSTALLATION_PHOTO_MAX_BYTES) throw new Error('La fotografía no puede superar 10 MiB.');
}

export function createInstallationPhotoPath(tenantId: string, installationId: string, file: Pick<File, 'type'>) {
  required(tenantId, 'No se ha indicado la organización.');
  required(installationId, 'No se ha indicado la instalación.');
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error('El formato de fotografía no está permitido.');
  if (!globalThis.crypto?.randomUUID) throw new Error('El navegador no puede generar una ruta segura.');
  return `${tenantId}/${installationId}/foto/${globalThis.crypto.randomUUID()}.${extension}`;
}

export async function listInstallationPhotos(supabase: SupabaseClient, installationId: string) {
  required(installationId, 'No se ha indicado la instalación.');
  const { data, error } = await supabase.from('instalacion_fotos').select(COLUMNS).eq('instalacion_id', installationId).eq('estado', 'activo').order('es_principal', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as PhotoRow[];
  if (rows.length === 0) return [];
  const { data: signed, error: signedError } = await supabase.storage.from(INSTALLATION_PHOTO_BUCKET).createSignedUrls(rows.map((row) => String(row.path)), INSTALLATION_PHOTO_URL_TTL_SECONDS);
  if (signedError) throw signedError;
  const urls = new Map((signed ?? []).map((item) => [String(item.path), item.signedUrl || null]));
  return rows.map((row) => mapPhoto(row, urls.get(String(row.path)) ?? null));
}

export async function uploadInstallationPhoto(supabase: SupabaseClient, input: {
  tenantId: string;
  installationId: string;
  file: File;
  title?: string | null;
  description?: string | null;
  category: InstallationPhotoCategory;
  main: boolean;
  onProgress?: (value: number) => void;
}) {
  validateInstallationPhotoFile(input.file);
  input.onProgress?.(10);
  const path = createInstallationPhotoPath(input.tenantId, input.installationId, input.file);
  const storage = supabase.storage.from(INSTALLATION_PHOTO_BUCKET);
  const { error: uploadError } = await storage.upload(path, input.file, { contentType: input.file.type, cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;
  input.onProgress?.(70);
  const { data, error } = await supabase.rpc('register_installation_photo', {
    installation_uuid: input.installationId,
    path_text: path,
    filename_text: input.file.name,
    mime_type_text: input.file.type,
    size_bytes_value: input.file.size,
    title_text: input.title?.trim() || null,
    description_text: input.description?.trim() || null,
    category_text: input.category,
    main_value: input.main,
  });
  if (error) {
    await storage.remove([path]);
    throw error;
  }
  input.onProgress?.(100);
  return mapPhoto((data ?? {}) as PhotoRow);
}

export async function setInstallationMainPhoto(supabase: SupabaseClient, photoId: string) {
  required(photoId, 'No se ha indicado la fotografía.');
  const { data, error } = await supabase.rpc('set_installation_main_photo', { photo_uuid: photoId });
  if (error) throw error;
  return mapPhoto((data ?? {}) as PhotoRow);
}

export async function deleteInstallationPhoto(supabase: SupabaseClient, photo: Pick<InstallationPhoto, 'id' | 'bucket' | 'path'>) {
  required(photo.id, 'No se ha indicado la fotografía.');
  if (photo.bucket !== INSTALLATION_PHOTO_BUCKET) throw new Error('El bucket de la fotografía no es válido.');
  const { error: storageError } = await supabase.storage.from(photo.bucket).remove([photo.path]);
  if (storageError) throw storageError;
  const { data, error } = await supabase.rpc('delete_installation_photo_metadata', { photo_uuid: photo.id });
  if (error) throw error;
  return mapPhoto((data ?? {}) as PhotoRow);
}
