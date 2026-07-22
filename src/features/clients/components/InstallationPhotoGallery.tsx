import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, Image as ImageIcon, LoaderCircle, MapPin, Star, Trash2, Upload, X } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import { workOrderDirectionsUrl } from '../../work-orders/domain/workOrderDirections';
import {
  deleteInstallationPhoto,
  listInstallationPhotos,
  setInstallationMainPhoto,
  uploadInstallationPhoto,
  validateInstallationPhotoFile,
  type InstallationPhoto,
  type InstallationPhotoCategory,
} from '../api/installationPhotoRepository';

type Props = {
  tenantId: string;
  installationId: string;
  installationName: string;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  canManage: boolean;
  client?: SupabaseClient;
};

const categoryLabels: Record<InstallationPhotoCategory, string> = { principal: 'Principal', acceso: 'Acceso', equipos: 'Equipos', seguridad: 'Seguridad', general: 'General' };
function errorMessage(error: unknown) { return error instanceof Error && error.message.trim() ? error.message : 'No se pudo completar la acción.'; }

export default function InstallationPhotoGallery({ tenantId, installationId, installationName, address, contactName, contactPhone, canManage, client }: Props) {
  const supabase = client ?? getSupabaseClient();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['installation-photos', installationId], [installationId]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<InstallationPhotoCategory>('general');
  const [main, setMain] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectionError, setSelectionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const directionsUrl = workOrderDirectionsUrl({ address });

  const query = useQuery({ queryKey, queryFn: () => listInstallationPhotos(supabase, installationId), enabled: Boolean(installationId), staleTime: 4 * 60 * 1000 });
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const clear = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setFile(null); setPreviewUrl(null); setTitle(''); setDescription(''); setCategory('general'); setMain(false); setProgress(0); };
  const uploadMutation = useMutation({ mutationFn: () => { if (!file) throw new Error('Selecciona una fotografía.'); return uploadInstallationPhoto(supabase, { tenantId, installationId, file, title, description, category, main, onProgress: setProgress }); }, onSuccess: async () => { clear(); await queryClient.invalidateQueries({ queryKey }); } });
  const mainMutation = useMutation({ mutationFn: (photo: InstallationPhoto) => setInstallationMainPhoto(supabase, photo.id), onSuccess: () => queryClient.invalidateQueries({ queryKey }) });
  const deleteMutation = useMutation({ mutationFn: (photo: InstallationPhoto) => deleteInstallationPhoto(supabase, photo), onSuccess: async () => { setConfirmDelete(null); await queryClient.invalidateQueries({ queryKey }); } });
  const choose = (nextFile: File | undefined) => { clear(); setSelectionError(''); if (!nextFile) return; try { validateInstallationPhotoFile(nextFile); setFile(nextFile); setPreviewUrl(URL.createObjectURL(nextFile)); } catch (error) { setSelectionError(errorMessage(error)); } };
  const photos = query.data ?? [];
  const primary = photos.find((photo) => photo.main) ?? photos[0] ?? null;

  return <section className="installation-gallery" aria-labelledby={`installation-gallery-${installationId}`}>
    <header className="installation-gallery-header"><div><span className="section-kicker">Galería privada</span><h2 id={`installation-gallery-${installationId}`}>{installationName}</h2><p>Fotografías propias de la instalación, separadas de las evidencias de OT.</p></div><span className="private-evidence-badge">Privada · {photos.length}</span></header>
    <div className="installation-context-strip"><span><MapPin size={17} /><strong>{address || 'Dirección pendiente'}</strong></span><span><strong>{contactName || 'Contacto pendiente'}</strong>{contactPhone && <small>{contactPhone}</small>}</span>{directionsUrl && <a className="secondary-button" href={directionsUrl} rel="noopener noreferrer" target="_blank"><MapPin size={16} /> Cómo llegar</a>}</div>
    {query.isLoading && <div className="execution-loading"><LoaderCircle className="spin" size={20} /> Cargando galería…</div>}
    {query.error && <div className="execution-error" role="alert"><AlertTriangle size={18} /><span>{errorMessage(query.error)}</span><button className="secondary-button" onClick={() => void query.refetch()} type="button">Reintentar</button></div>}
    {!query.isLoading && !query.error && photos.length === 0 && <div className="installation-gallery-empty"><ImageIcon size={30} /><strong>Sin fotografías de instalación</strong><p>Añade imágenes reales de accesos, equipos o medidas de seguridad.</p></div>}
    {primary && <div className="installation-primary-photo">{primary.signedUrl ? <img alt={primary.title || `Fotografía principal de ${installationName}`} src={primary.signedUrl} /> : <span><AlertTriangle size={22} /> Vista temporal no disponible</span>}<div><span><Star size={15} /> {primary.main ? 'Foto principal' : 'Primera fotografía disponible'}</span><strong>{primary.title || primary.filename}</strong><p>{primary.description || 'Sin descripción registrada.'}</p></div></div>}
    {photos.length > 0 && <div className="installation-photo-grid">{photos.map((photo) => <article className={photo.main ? 'is-main' : ''} key={photo.id}><div>{photo.signedUrl ? <img alt={photo.title || photo.filename} loading="lazy" src={photo.signedUrl} /> : <span><AlertTriangle size={18} /> Sin vista</span>}</div><p><span>{categoryLabels[photo.category]}</span><strong>{photo.title || photo.filename}</strong><small>{photo.description || 'Sin descripción'}</small></p>{canManage && <footer>{!photo.main && <button className="secondary-button" disabled={mainMutation.isPending} onClick={() => mainMutation.mutate(photo)} type="button"><Star size={15} /> Principal</button>}{confirmDelete === photo.id ? <><button className="secondary-button" onClick={() => setConfirmDelete(null)} type="button">Cancelar</button><button className="danger-button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(photo)} type="button">Confirmar</button></> : <button aria-label={`Eliminar ${photo.title || photo.filename}`} className="icon-button" onClick={() => setConfirmDelete(photo.id)} type="button"><Trash2 size={16} /></button>}</footer>}</article>)}</div>}
    {canManage && <div className="installation-photo-uploader"><label className="secondary-button" htmlFor={`installation-photo-${installationId}`}><Camera size={17} /> Añadir fotografía</label><input accept="image/jpeg,image/png,image/webp" className="visually-hidden" id={`installation-photo-${installationId}`} onChange={(event) => choose(event.target.files?.[0])} type="file" />{file && previewUrl && <div className="installation-photo-draft"><img alt={`Previsualización de ${file.name}`} src={previewUrl} /><div><label><span>Título</span><input maxLength={160} onChange={(event) => setTitle(event.target.value)} value={title} /></label><label><span>Descripción</span><textarea maxLength={1000} onChange={(event) => setDescription(event.target.value)} rows={2} value={description} /></label><label><span>Categoría</span><select onChange={(event) => setCategory(event.target.value as InstallationPhotoCategory)} value={category}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="installation-main-check"><input checked={main} onChange={(event) => setMain(event.target.checked)} type="checkbox" /> Marcar como principal</label></div><button aria-label="Cancelar selección" className="icon-button" disabled={uploadMutation.isPending} onClick={clear} type="button"><X size={17} /></button><button className="primary-button" disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate()} type="button">{uploadMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />} Subir</button>{uploadMutation.isPending && <div className="installation-photo-progress"><progress max={100} value={progress} /><span>{progress}%</span></div>}</div>}</div>}
    {(selectionError || uploadMutation.error || mainMutation.error || deleteMutation.error) && <p className="form-global-error" role="alert"><AlertTriangle size={16} /> {selectionError || errorMessage(uploadMutation.error || mainMutation.error || deleteMutation.error)}</p>}
  </section>;
}
