import type { SupabaseClient } from '@supabase/supabase-js';

export const CLIENT_MEDIA_BUCKET = 'client-media';
export const CLIENT_LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const CLIENT_LOGO_URL_TTL_SECONDS = 5 * 60;
const MAX_IMAGE_EDGE = 1280;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function required(value: string, message: string) {
  if (!value.trim()) throw new Error(message);
}

function extensionFor(type: string) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
}

export function clientInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length === 0 ? 'CL' : words.map((word) => word[0]).join('').slice(0, 2).toLocaleUpperCase('es-ES');
}

export function validateClientLogoFile(file: Pick<File, 'type' | 'size'>) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Selecciona una imagen JPG, PNG o WebP.');
  if (file.size < 1) throw new Error('La imagen seleccionada está vacía.');
  if (file.size > CLIENT_LOGO_MAX_BYTES) throw new Error('La imagen no puede superar 5 MiB.');
}

export function createClientLogoPath(tenantId: string, clientId: string, file: Pick<File, 'type'>) {
  required(tenantId, 'No se ha indicado la organización.');
  required(clientId, 'No se ha indicado el cliente.');
  const extension = extensionFor(file.type);
  if (!extension) throw new Error('El formato de imagen no está permitido.');
  if (!globalThis.crypto?.randomUUID) throw new Error('El navegador no puede generar una ruta segura.');
  return `${tenantId}/${clientId}/${globalThis.crypto.randomUUID()}.${extension}`;
}

async function imageDimensions(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareClientLogoFile(file: File): Promise<File> {
  validateClientLogoFile(file);
  if (typeof document === 'undefined' || typeof Image === 'undefined') return file;
  try {
    const { image, width, height } = await imageDimensions(file);
    if (width <= MAX_IMAGE_EDGE && height <= MAX_IMAGE_EDGE && file.size <= 900_000) return file;
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.size >= file.size || blob.size > CLIENT_LOGO_MAX_BYTES) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'cliente'}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function createClientLogoSignedUrl(supabase: SupabaseClient, path: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(CLIENT_MEDIA_BUCKET).createSignedUrl(path, CLIENT_LOGO_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl || null;
}

export async function uploadClientLogo(supabase: SupabaseClient, input: {
  tenantId: string;
  clientId: string;
  file: File;
  previousPath?: string | null;
}) {
  const prepared = await prepareClientLogoFile(input.file);
  validateClientLogoFile(prepared);
  const path = createClientLogoPath(input.tenantId, input.clientId, prepared);
  const storage = supabase.storage.from(CLIENT_MEDIA_BUCKET);
  const { error: uploadError } = await storage.upload(path, prepared, {
    contentType: prepared.type,
    cacheControl: '3600',
    upsert: false,
    metadata: { size: prepared.size, mimetype: prepared.type },
  });
  if (uploadError) throw uploadError;

  const { error: registerError } = await supabase.rpc('set_client_logo', {
    client_uuid: input.clientId,
    path_text: path,
    mime_type_text: prepared.type,
    size_bytes_value: prepared.size,
  });
  if (registerError) {
    await storage.remove([path]);
    throw registerError;
  }

  if (input.previousPath && input.previousPath !== path) {
    await storage.remove([input.previousPath]);
  }
  return path;
}

export async function removeClientLogo(supabase: SupabaseClient, clientId: string) {
  required(clientId, 'No se ha indicado el cliente.');
  const { data, error } = await supabase.rpc('clear_client_logo', { client_uuid: clientId });
  if (error) throw error;
  const path = typeof data === 'string' ? data : null;
  if (path) await supabase.storage.from(CLIENT_MEDIA_BUCKET).remove([path]);
  return path;
}
