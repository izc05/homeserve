import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Network,
  Plus,
  Power,
  Save,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  createInstallationTechnicalSystem,
  listInstallationTechnicalSystems,
  setInstallationTechnicalSystemStatus,
  updateInstallationTechnicalSystem,
} from '../api/installationTechnicalSystemRepository';
import {
  installationTechnicalSystemFormSchema,
  type InstallationTechnicalSystemFormValues,
} from '../schemas/technicalSystemSchema';
import {
  TECHNICAL_SYSTEM_SPECIALTIES,
  type TechnicalSystem,
  type TechnicalSystemStatus,
} from '../types/technicalSystem';

const EMPTY_VALUES: InstallationTechnicalSystemFormValues = {
  name: '',
  code: '',
  specialty: 'general',
  description: '',
  criticality: 'media',
  status: 'activo',
};

type InstallationTechnicalSystemsPanelProps = {
  tenantId: string;
  installationId: string;
  installationName: string;
  canManage: boolean;
};

function formValuesFromSystem(system: TechnicalSystem): InstallationTechnicalSystemFormValues {
  return {
    name: system.name,
    code: system.code ?? '',
    specialty: system.specialty,
    description: system.description ?? '',
    criticality: system.criticality,
    status: system.status,
  };
}

function statusLabel(status: TechnicalSystemStatus) {
  if (status === 'fuera_servicio') return 'Fuera de servicio';
  return status === 'activo' ? 'Activo' : 'Inactivo';
}

function specialtyLabel(value: string) {
  return TECHNICAL_SYSTEM_SPECIALTIES.find((item) => item.value === value)?.label ?? value.replaceAll('_', ' ');
}

export default function InstallationTechnicalSystemsPanel({
  tenantId,
  installationId,
  installationName,
  canManage,
}: InstallationTechnicalSystemsPanelProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TechnicalSystem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const form = useForm<InstallationTechnicalSystemFormValues>({
    resolver: zodResolver(installationTechnicalSystemFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    setEditing(null);
    setFormOpen(false);
    form.reset(EMPTY_VALUES);
  }, [form, installationId]);

  const systemsQuery = useQuery({
    queryKey: ['installation-technical-systems', tenantId, installationId],
    queryFn: () => listInstallationTechnicalSystems(getSupabaseClient(), tenantId, installationId),
    enabled: Boolean(tenantId && installationId),
    staleTime: 30_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['installation-technical-systems', tenantId, installationId] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: InstallationTechnicalSystemFormValues) => {
      if (editing) {
        return updateInstallationTechnicalSystem(
          getSupabaseClient(),
          tenantId,
          installationId,
          editing.id,
          values,
        );
      }
      return createInstallationTechnicalSystem(getSupabaseClient(), {
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
        message: error instanceof Error ? error.message : 'No se pudo guardar el sistema técnico.',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ system, status }: { system: TechnicalSystem; status: TechnicalSystemStatus }) => (
      setInstallationTechnicalSystemStatus(
        getSupabaseClient(),
        tenantId,
        installationId,
        system.id,
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

  const startEdit = (system: TechnicalSystem) => {
    setEditing(system);
    form.reset(formValuesFromSystem(system));
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditing(null);
    setFormOpen(false);
    form.reset(EMPTY_VALUES);
  };

  const systems = systemsQuery.data ?? [];
  const activeCount = systems.filter((system) => system.status === 'activo').length;
  const outOfServiceCount = systems.filter((system) => system.status === 'fuera_servicio').length;
  const specialtyOptions = useMemo(() => TECHNICAL_SYSTEM_SPECIALTIES, []);

  return (
    <section className="panel source-panel installation-locations-panel installation-technical-systems-panel">
      <div className="panel-heading">
        <div>
          <h2><Network size={21} /> Sistemas técnicos</h2>
          <p>{installationName} · {activeCount} activos · {outOfServiceCount} fuera de servicio · {systems.length} registrados</p>
        </div>
        <div className="form-actions">
          <span className="source-badge">Contexto OT</span>
          {canManage && !formOpen && (
            <button className="secondary-button compact-button" onClick={startCreate} type="button">
              <Plus size={16} /> Nuevo sistema
            </button>
          )}
        </div>
      </div>

      <p className="read-only-note">
        <Wrench size={16} /> Agrupa el mantenimiento por sistema técnico aunque el activo concreto todavía no esté identificado. En OT-05 el sistema seguirá siendo opcional.
      </p>

      {formOpen && canManage && (
        <form className="installation-form installation-location-form" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <div className="client-form-heading">
            <div>
              <span className="section-kicker">{editing ? 'Editar sistema' : 'Nuevo sistema técnico'}</span>
              <h3>{editing ? editing.name : installationName}</h3>
            </div>
            <button className="icon-button" onClick={closeForm} type="button" aria-label="Cerrar formulario"><X size={18} /></button>
          </div>

          <div className="form-grid">
            <label>Nombre
              <input {...form.register('name')} autoFocus placeholder="Ej. Electricidad BT · Climatización · PCI" />
              {form.formState.errors.name && <small className="field-error">{form.formState.errors.name.message}</small>}
            </label>
            <label>Código <small>Opcional</small>
              <input {...form.register('code')} placeholder="Ej. ELEC · HVAC · PCI" />
            </label>
            <label>Especialidad
              <select {...form.register('specialty')}>
                {specialtyOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>Criticidad
              <select {...form.register('criticality')}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </label>
            <label>Estado
              <select {...form.register('status')}>
                <option value="activo">Activo</option>
                <option value="fuera_servicio">Fuera de servicio</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </label>
            <label className="full-field">Descripción <small>Opcional</small>
              <textarea {...form.register('description')} placeholder="Alcance del sistema, zonas atendidas, referencias o notas operativas." rows={3} />
            </label>
          </div>

          {form.formState.errors.root?.message && (
            <p className="form-global-error"><AlertTriangle size={16} /> {form.formState.errors.root.message}</p>
          )}

          <div className="form-actions work-order-form-actions">
            <button className="secondary-button" disabled={saveMutation.isPending} onClick={closeForm} type="button">Cancelar</button>
            <button className="primary-button" disabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
              {editing ? 'Guardar cambios' : 'Crear sistema'}
            </button>
          </div>
        </form>
      )}

      {systemsQuery.isLoading && (
        <div className="inline-loading"><LoaderCircle className="spin" size={20} /> Cargando sistemas técnicos…</div>
      )}

      {systemsQuery.error && (
        <p className="form-global-error"><AlertTriangle size={16} /> {systemsQuery.error.message}</p>
      )}

      {!systemsQuery.isLoading && !systemsQuery.error && systems.length === 0 && (
        <p className="empty-state">Esta instalación todavía no tiene sistemas técnicos registrados.</p>
      )}

      {systems.length > 0 && (
        <div className="client-order-list installation-location-list">
          {systems.map((system) => (
            <div key={system.id}>
              <span>
                <strong>{system.name}</strong>
                <small>
                  {[system.code, specialtyLabel(system.specialty), `Criticidad ${system.criticality}`, system.description].filter(Boolean).join(' · ')}
                </small>
              </span>
              <span className={`member-status ${system.status}`}>{statusLabel(system.status)}</span>
              {canManage && (
                <span className="form-actions">
                  <button className="text-link" onClick={() => startEdit(system)} type="button"><Edit3 size={15} /> Editar</button>
                  <button
                    className="text-link"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ system, status: system.status === 'activo' ? 'fuera_servicio' : 'activo' })}
                    type="button"
                  >
                    {system.status === 'activo' ? <Power size={15} /> : <CheckCircle2 size={15} />}
                    {system.status === 'activo' ? 'Fuera servicio' : 'Activar'}
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
