import { useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../../../lib/supabase';
import { clientInitials, removeClientLogo, uploadClientLogo, validateClientLogoFile } from '../api/clientLogoRepository';
import type { ClientRecord } from '../types/client';

type Props = {
  client: ClientRecord;
  canManage: boolean;
  compact?: boolean;
};

function message(error: unknown) {
  return error instanceof Error && error.message.trim() ? error.message : 'No se pudo actualizar la imagen del cliente.';
}

export default function ClientLogoEditor({ client, canManage, compact = false }: Props) {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clients', client.tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['client-detail', client.tenantId, client.id] }),
    ]);
  };

  const select = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      validateClientLogoFile(file);
      setBusy(true);
      await uploadClientLogo(supabase, {
        tenantId: client.tenantId,
        clientId: client.id,
        file,
        previousPath: client.logoPath,
      });
      await refresh();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (!client.logoPath || !window.confirm('¿Eliminar la imagen principal de este cliente?')) return;
    setError('');
    try {
      setBusy(true);
      await removeClientLogo(supabase, client.id);
      await refresh();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  return <div className={`client-logo-editor ${compact ? 'is-compact' : ''}`}>
    <div className="client-logo-frame" aria-label={`Imagen de ${client.name}`}>
      {client.logoUrl ? <img alt={`Imagen de ${client.name}`} src={client.logoUrl} /> : <span>{clientInitials(client.name)}</span>}
      {busy && <i><LoaderCircle className="spin" size={22} /></i>}
    </div>
    {canManage && !compact && <div className="client-logo-actions">
      <button className="secondary-button" disabled={busy} onClick={() => inputRef.current?.click()} type="button"><ImagePlus size={16} /> {client.logoPath ? 'Cambiar imagen' : 'Añadir imagen'}</button>
      {client.logoPath && <button className="icon-button" disabled={busy} onClick={() => void remove()} type="button" aria-label="Eliminar imagen del cliente"><Trash2 size={16} /></button>}
      <input accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(event) => void select(event.target.files?.[0])} ref={inputRef} type="file" />
    </div>}
    {error && !compact && <p className="form-global-error" role="alert"><AlertTriangle size={15} /> {error}</p>}
  </div>;
}
