import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  deleteWorkOrderPhoto,
  listWorkOrderPhotos,
  uploadWorkOrderPhoto,
  validateWorkOrderPhotoFile,
  WORK_ORDER_PHOTO_MAX_BYTES,
  type WorkOrderPhoto,
  type WorkOrderPhotoCategory,
} from '../api/workOrderPhotoRepository';

export type WorkOrderPhotosPanelProps = {
  tenantId: string;
  workOrderId: string;
  canEdit: boolean;
  client?: SupabaseClient;
};

const categoryLabels: Record<WorkOrderPhotoCategory, string> = {
  initial: 'Inicial',
  during: 'Durante la intervención',
  final: 'Final',
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function formatSize(bytes: number) {
  if (!bytes) return 'Tamaño no disponible';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export default function WorkOrderPhotosPanel({ tenantId, workOrderId, canEdit, client }: WorkOrderPhotosPanelProps) {
  const supabase = client ?? getSupabaseClient();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['work-order-photos', workOrderId], [workOrderId]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<WorkOrderPhotoCategory>('initial');
  const [selectionError, setSelectionError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const query = useQuery({
    queryKey,
    queryFn: () => listWorkOrderPhotos(supabase, workOrderId),
    enabled: Boolean(workOrderId),
    staleTime: 4 * 60 * 1000,
  });

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setSelectionError('');
  };

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Selecciona una fotografía antes de subirla.');
      return uploadWorkOrderPhoto(supabase, { tenantId, workOrderId, category, file });
    },
    onSuccess: async () => {
      clearSelection();
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (photo: WorkOrderPhoto) => deleteWorkOrderPhoto(supabase, photo),
    onSuccess: async () => {
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const selectFile = (nextFile: File | undefined) => {
    clearSelection();
    if (!nextFile) return;
    try {
      validateWorkOrderPhotoFile(nextFile);
      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
    } catch (error) {
      setSelectionError(errorMessage(error, 'La fotografía seleccionada no es válida.'));
    }
  };

  const photos = (query.data ?? []).filter((photo) => !photo.checklistResponseId);

  return <section className="execution-card photo-panel" aria-labelledby={`photo-title-${workOrderId}`}>
    <div className="execution-card-heading">
      <div className="execution-card-title"><span className="execution-card-icon" aria-hidden="true"><Camera size={20} /></span><div><h2 id={`photo-title-${workOrderId}`}>Fotografías privadas</h2><p>Evidencias protegidas mediante RLS y enlaces temporales.</p></div></div>
      <span className="private-evidence-badge"><LockKeyhole size={14} aria-hidden="true" /> Privadas · {photos.length}</span>
    </div>

    {canEdit && <div className="photo-uploader">
      <div className="photo-uploader-actions">
        <label className="secondary-button photo-file-button" htmlFor={`photo-file-${workOrderId}`}><Camera size={17} /> Añadir fotografía</label>
        <input accept="image/jpeg,image/png,image/webp" capture="environment" className="visually-hidden" id={`photo-file-${workOrderId}`} onChange={(event) => selectFile(event.target.files?.[0])} type="file" />
        <span>JPEG, PNG o WebP · máximo {WORK_ORDER_PHOTO_MAX_BYTES / (1024 * 1024)} MiB</span>
      </div>
      {selectionError && <p className="execution-inline-error" role="alert">{selectionError}</p>}
      {file && previewUrl && <div className="photo-preview-card">
        <img alt={`Previsualización de ${file.name}`} src={previewUrl} />
        <div className="photo-preview-copy"><strong>{file.name}</strong><small>{formatSize(file.size)}</small><label><span>Categoría</span><select disabled={uploadMutation.isPending} onChange={(event) => setCategory(event.target.value as WorkOrderPhotoCategory)} value={category}><option value="initial">Inicial</option><option value="during">Durante la intervención</option><option value="final">Final</option></select></label></div>
        <div className="photo-preview-actions"><button aria-label="Cancelar selección" className="icon-button" disabled={uploadMutation.isPending} onClick={clearSelection} type="button"><X size={18} /></button><button className="primary-button" disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate()} type="button">{uploadMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />} Subir fotografía</button></div>
      </div>}
      {uploadMutation.error && <p className="execution-inline-error" role="alert">{errorMessage(uploadMutation.error, 'No se pudo subir la fotografía.')}</p>}
    </div>}

    {query.isLoading && <div className="execution-loading"><LoaderCircle className="spin" size={21} /> Cargando fotografías…</div>}
    {query.error && <div className="execution-error" role="alert"><AlertTriangle size={18} /><span>{errorMessage(query.error, 'No se pudieron cargar las fotografías privadas.')}</span><button className="secondary-button" onClick={() => void query.refetch()} type="button">Reintentar</button></div>}

    {!query.isLoading && !query.error && photos.length === 0 && <div className="execution-empty-state photo-empty-state"><ImageIcon size={22} aria-hidden="true" /><strong>Sin fotografías</strong><p>La galería privada comenzará cuando el técnico añada una evidencia real.</p></div>}

    {photos.length > 0 && <div className="private-photo-gallery">
      {photos.map((photo) => <article className="private-photo-card" key={photo.id}>
        <div className="private-photo-image">{photo.signedUrl ? <img alt={`${categoryLabels[photo.category]} · ${photo.filename}`} loading="lazy" src={photo.signedUrl} /> : <span><AlertTriangle size={20} /> Vista temporal no disponible</span>}</div>
        <div className="private-photo-copy"><span className={`photo-category photo-category-${photo.category}`}>{photo.categoryLabel === 'checklist' ? 'Checklist' : categoryLabels[photo.category]}</span><strong>{photo.filename}</strong><small>{formatSize(photo.sizeBytes)}{photo.comment ? ` · ${photo.comment}` : ''}</small>{photo.checklistResponseId && <small>Vinculada a un punto concreto del checklist</small>}<span><ShieldCheck size={14} aria-hidden="true" /> Enlace firmado de corta duración</span></div>
        {canEdit && <div className="private-photo-actions">{confirmDeleteId === photo.id ? <><button className="secondary-button" disabled={deleteMutation.isPending} onClick={() => setConfirmDeleteId(null)} type="button">Cancelar</button><button className="danger-button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(photo)} type="button">{deleteMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />} Confirmar eliminación</button></> : <button className="secondary-button" onClick={() => setConfirmDeleteId(photo.id)} type="button"><Trash2 size={16} /> Eliminar</button>}</div>}
      </article>)}
    </div>}
    {deleteMutation.error && <p className="execution-inline-error" role="alert">{errorMessage(deleteMutation.error, 'No se pudo eliminar la fotografía.')}</p>}
  </section>;
}
