import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, CheckCircle2, LoaderCircle, Trash2, Upload, X } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  deleteWorkOrderPhoto,
  listWorkOrderPhotos,
  uploadWorkOrderPhoto,
  validateWorkOrderPhotoFile,
  type WorkOrderPhoto,
} from '../api/workOrderPhotoRepository';

type Props = {
  tenantId: string;
  workOrderId: string;
  responseId: string;
  required: boolean;
  canEdit: boolean;
  client?: SupabaseClient;
};

function errorMessage(error: unknown) {
  return error instanceof Error && error.message.trim() ? error.message : 'No se pudo completar la fotografía.';
}
export default function ChecklistPointPhotos({ tenantId, workOrderId, responseId, required, canEdit, client }: Props) {
  const supabase = client ?? getSupabaseClient();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['work-order-photos', workOrderId], [workOrderId]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [selectionError, setSelectionError] = useState('');
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const query = useQuery({
    queryKey,
    queryFn: () => listWorkOrderPhotos(supabase, workOrderId),
    enabled: Boolean(workOrderId),
    staleTime: 60_000,
  });
  const linked = (query.data ?? []).filter((photo) => photo.checklistResponseId === responseId);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const clear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setComment('');
    setProgress(0);
  };
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Selecciona una fotografía.');
      return uploadWorkOrderPhoto(supabase, {
        tenantId,
        workOrderId,
        category: 'during',
        file,
        checklistResponseId: responseId,
        comment,
        onProgress: setProgress,
      });
    },
    onSuccess: async () => { clear(); await queryClient.invalidateQueries({ queryKey }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (photo: WorkOrderPhoto) => deleteWorkOrderPhoto(supabase, photo),
    onSuccess: async () => { setConfirmDelete(null); await queryClient.invalidateQueries({ queryKey }); },
  });

  const choose = (nextFile: File | undefined) => {
    clear();
    setSelectionError('');
    if (!nextFile) return;
    try {
      validateWorkOrderPhotoFile(nextFile);
      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
    } catch (error) {
      setSelectionError(errorMessage(error));
    }
  };

  return <div className="checklist-point-photos">
    <div className="checklist-point-photo-heading"><span><Camera size={16} /> Fotografías del punto</span><small>{linked.length}{required ? ' · obligatoria' : ''}</small></div>
    {linked.length > 0 && <div className="checklist-linked-photo-list">{linked.map((photo) => <article key={photo.id}><div>{photo.signedUrl ? <img alt={photo.filename} loading="lazy" src={photo.signedUrl} /> : <span><AlertTriangle size={18} /> Vista no disponible</span>}</div><p><strong>{photo.filename}</strong><small>{photo.comment || 'Sin comentario'}</small><span><CheckCircle2 size={13} /> Vinculada a este punto</span></p>{canEdit && <div>{confirmDelete === photo.id ? <><button className="secondary-button" disabled={deleteMutation.isPending} onClick={() => setConfirmDelete(null)} type="button">Cancelar</button><button className="danger-button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(photo)} type="button">Confirmar</button></> : <button aria-label={`Eliminar ${photo.filename}`} className="icon-button" onClick={() => setConfirmDelete(photo.id)} type="button"><Trash2 size={16} /></button>}</div>}</article>)}</div>}
    {canEdit && <div className="checklist-point-photo-uploader"><label className="secondary-button" htmlFor={`checklist-photo-${responseId}`}><Camera size={16} /> Cámara o archivo</label><input accept="image/jpeg,image/png,image/webp" capture="environment" className="visually-hidden" id={`checklist-photo-${responseId}`} onChange={(event) => choose(event.target.files?.[0])} type="file" />{file && previewUrl && <div className="checklist-photo-draft"><img alt={`Previsualización de ${file.name}`} src={previewUrl} /><label><span>Comentario</span><input maxLength={1000} onChange={(event) => setComment(event.target.value)} value={comment} /></label><button aria-label="Cancelar fotografía" className="icon-button" disabled={uploadMutation.isPending} onClick={clear} type="button"><X size={17} /></button><button className="primary-button" disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate()} type="button">{uploadMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />} Subir</button>{uploadMutation.isPending && <div className="checklist-photo-progress"><progress max={100} value={progress} /><span>{progress}% · Subiendo de forma privada</span></div>}</div>}</div>}
    {(selectionError || uploadMutation.error || deleteMutation.error) && <p className="execution-inline-error" role="alert">{selectionError || errorMessage(uploadMutation.error || deleteMutation.error)}</p>}
    {required && linked.length === 0 && <p className="checklist-photo-required-note"><AlertTriangle size={14} /> Debes vincular una fotografía antes de finalizar.</p>}
  </div>;
}
