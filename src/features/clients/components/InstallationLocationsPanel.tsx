import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  MapPin,
  Plus,
  Power,
  Save,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  createInstallationLocation,
  listInstallationLocations,
  setInstallationLocationStatus,
  updateInstallationLocation,
} from '../api/installationLocationRepository';
import {
  installationLocationFormSchema,
  type InstallationLocationFormValues,
} from '../schemas/locationSchema';
import type { ClientLocation } from '../types/location';
import InstallationTechnicalSystemsPanel from './InstallationTechnicalSystemsPanel';

const EMPTY_VALUES: InstallationLocationFormValues = {
  name: '',
  code: '',
  type: '',
  description: '',
  status: 'activo',
};

type InstallationLocationsPanelProps = {
  tenantId: string;
  installationId: string;
  installationName: string;
  canManage: boolean;
};

function formValuesFromLocation(location: ClientLocation): InstallationLocationFormValues {
  return {
    name: location.name,
    code: location.code ?? '',
    type: location.type ?? '',
    description: location.description ?? '',
    status: location.status,
  };
}

export default function InstallationLocationsPanel({
  tenantId,
  installationId,
  installationName,
  canManage,
}: InstallationLocationsPanelProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClientLocation | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const form = useForm<InstallationLocationFormValues>({
    resolver: zodResolver(installationLocationFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    setEditing(null);
    setFormOpen(false);
    form.reset(EMPTY_VALUES);
  }, [form, installationId]);

  const locationsQuery = useQuery({
    queryKey: ['installation-locations', tenantId, installationId],
    queryFn: () => listInstallationLocations(getSupabaseClient(), tenantId, installationId),
    enabled: Boolean(tenantId && installationId),
    staleTime: 30_000,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['installation-locations', tenantId, installationId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: InstallationLocationFormValues) => {
      if (editing) {
        return updateInstallationLocation(
          getSupabaseClient(),
          tenantId,
          installationId,
          editing.id,
          values,
        );
      }
      return createInstallationLocation(getSupabaseClient(), {
        tenantId,
        installationId,
        ...values,
      });
    },
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      setFormOpen(false);
      form.reset(EMPTY_VALUES);
    },
    onError: (error) => {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'No se pudo guardar la ubicación.',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ location, status }: { location: ClientLocation; status: 'activo' | 'inactivo' }) => (
      setInstallationLocationStatus(
        getSupabaseClient(),
        tenantId,
        installationId,
        location.id,
        status,
      )
    ),
    onSuccess: refresh,
  });

  const startCreate = () => {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setFormOpen(true);
  };

  const startEdit = (location: ClientLocation) => {
    setEditing(location);
    form.reset(formValuesFromLocation(location));
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditing(null);
    setFormOpen(false);
    form.reset(EMPTY_VALUES);
  };

  const locations = locationsQuery.data ?? [];
  const activeCount = locations.filter((location) => location.status === 'activo').length;

  return (
    <>
      <section className="panel source-panel installation-locations-panel">
        <div className="panel-heading">
          <div>
            <h2><MapPin size={21} /> Ubicaciones / zonas</h2>
            <p>{installationName} · {activeCount} activas · {locations.length} registradas</p>
          </div>
          <div className="form-actions">
            <span className="source-badge">Contexto OT</span>
            {canManage && !formOpen && (
              <button className="secondary-button compact-button" onClick={startCreate} type="button">
                <Plus size={16} /> Nueva ubicación
              </button>
            )}
          </div>
        </div>

        <p className="read-only-note">
          <MapPin size={16} /> Define habitaciones, plantas, salas técnicas, cubiertas o zonas. La ubicación seguirá siendo opcional al crear una OT.
        </p>

        {formOpen && canManage && (
          <form className="installation-form installation-location-form" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <div className="client-form-heading">
              <div>
                <span className="section-kicker">{editing ? 'Editar ubicación' : 'Nueva ubicación'}</span>
                <h3>{editing ? editing.name : installationName}</h3>
              </div>
              <button className="icon-button" onClick={closeForm} type="button" aria-label="Cerrar formulario"><X size={18} /></button>
            </div>

            <div className="form-grid">
              <label>Nombre
                <input {...form.register('name')} autoFocus placeholder="Ej. Habitación 312 · baño" />
                {form.formState.errors.name && <small className="field-error">{form.formState.errors.name.message}</small>}
              </label>
              <label>Código <small>Opcional</small>
                <input {...form.register('code')} placeholder="Ej. P3-H312-B" />
              </label>
              <label>Tipo <small>Opcional</small>
                <input {...form.register('type')} placeholder="habitación, sala técnica, cubierta..." />
              </label>
              <label>Estado
                <select {...form.register('status')}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </label>
              <label className="full-field">Descripción <small>Opcional</small>
                <textarea {...form.register('description')} placeholder="Referencias de acceso, planta, sector o indicaciones útiles." rows={3} />
              </label>
            </div>

            {form.formState.errors.root?.message && (
              <p className="form-global-error"><AlertTriangle size={16} /> {form.formState.errors.root.message}</p>
            )}

            <div className="form-actions work-order-form-actions">
              <button className="secondary-button" disabled={saveMutation.isPending} onClick={closeForm} type="button">Cancelar</button>
              <button className="primary-button" disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
                {editing ? 'Guardar cambios' : 'Crear ubicación'}
              </button>
            </div>
          </form>
        )}

        {locationsQuery.isLoading && (
          <div className="inline-loading"><LoaderCircle className="spin" size={20} /> Cargando ubicaciones…</div>
        )}

        {locationsQuery.error && (
          <p className="form-global-error"><AlertTriangle size={16} /> {locationsQuery.error.message}</p>
        )}

        {!locationsQuery.isLoading && !locationsQuery.error && locations.length === 0 && (
          <p className="empty-state">Esta instalación todavía no tiene ubicaciones registradas.</p>
        )}

        {locations.length > 0 && (
          <div className="client-order-list installation-location-list">
            {locations.map((location) => (
              <div key={location.id}>
                <span>
                  <strong>{location.name}</strong>
                  <small>
                    {[location.code, location.type, location.description].filter(Boolean).join(' · ') || 'Sin código ni tipo adicional'}
                  </small>
                </span>
                <span className={`member-status ${location.status}`}>{location.status}</span>
                {canManage && (
                  <span className="form-actions">
                    <button className="text-link" onClick={() => startEdit(location)} type="button"><Edit3 size={15} /> Editar</button>
                    <button
                      className="text-link"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ location, status: location.status === 'activo' ? 'inactivo' : 'activo' })}
                      type="button"
                    >
                      {location.status === 'activo' ? <Power size={15} /> : <CheckCircle2 size={15} />}
                      {location.status === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <InstallationTechnicalSystemsPanel
        tenantId={tenantId}
        installationId={installationId}
        installationName={installationName}
        canManage={canManage}
      />
    </>
  );
}
