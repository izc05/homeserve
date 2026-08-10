import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { getSupabaseClient } from '../../../lib/supabase';
import { createWorkOrder, loadWorkOrderCreationCatalog } from '../api/workOrderCommands';
import { buildQuickWorkOrderInput } from '../domain/quickWorkOrder';
import type { CreateWorkOrderFormValues } from '../forms/createWorkOrderSchema';
import {
  quickCreateWorkOrderSchema,
  type QuickCreateWorkOrderFormValues,
} from '../forms/quickCreateWorkOrderSchema';

const PRIORITY_OPTIONS = [
  ['baja', 'Baja'],
  ['normal', 'Media'],
  ['alta', 'Alta'],
  ['urgente', 'Urgente'],
  ['critica', 'Crítica'],
] as const;

type QuickCreateWorkOrderFormProps = {
  tenantId: string;
  canManage: boolean;
  initialValues?: Partial<CreateWorkOrderFormValues>;
  onCancel: () => void;
  onCreated: (workOrderId: string, code: string, technicianName: string | null) => void;
};

function quickDefaultValues(initialValues?: Partial<CreateWorkOrderFormValues>): QuickCreateWorkOrderFormValues {
  return {
    clientId: initialValues?.clientId ?? '',
    installationId: initialValues?.installationId ?? '',
    locationId: initialValues?.locationId ?? '',
    assetId: initialValues?.assetId ?? '',
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
    priority: initialValues?.priority ?? 'normal',
  };
}

export default function QuickCreateWorkOrderForm({
  tenantId,
  canManage,
  initialValues,
  onCancel,
  onCreated,
}: QuickCreateWorkOrderFormProps) {
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({
    queryKey: ['work-order-creation-catalog', tenantId],
    queryFn: () => loadWorkOrderCreationCatalog(getSupabaseClient(), tenantId),
    enabled: canManage && Boolean(tenantId),
    staleTime: 60_000,
  });

  const form = useForm<QuickCreateWorkOrderFormValues>({
    resolver: zodResolver(quickCreateWorkOrderSchema),
    defaultValues: quickDefaultValues(initialValues),
  });

  useEffect(() => {
    form.reset(quickDefaultValues(initialValues));
  }, [form, initialValues]);

  const clientId = form.watch('clientId');
  const installationId = form.watch('installationId');
  const locationId = form.watch('locationId');
  const assetId = form.watch('assetId');
  const catalog = catalogQuery.data;

  const installations = useMemo(
    () => catalog?.installations.filter((installation) => installation.clientId === clientId) ?? [],
    [catalog, clientId],
  );

  const locations = useMemo(
    () => catalog?.locations.filter((location) => location.installationId === installationId) ?? [],
    [catalog, installationId],
  );

  const assets = useMemo(
    () => catalog?.assets.filter((asset) => (
      asset.installationId === installationId
      && (!locationId || !asset.locationId || asset.locationId === locationId)
    )) ?? [],
    [catalog, installationId, locationId],
  );

  useEffect(() => {
    const selectedInstallation = catalog?.installations.find((installation) => installation.id === installationId);
    if (!clientId && selectedInstallation) {
      form.setValue('clientId', selectedInstallation.clientId, { shouldValidate: true });
      return;
    }
    if (selectedInstallation && selectedInstallation.clientId !== clientId) {
      form.setValue('installationId', '', { shouldDirty: true, shouldValidate: true });
      form.setValue('locationId', '', { shouldDirty: true });
      form.setValue('assetId', '', { shouldDirty: true });
    }
  }, [catalog, clientId, form, installationId]);

  useEffect(() => {
    if (locationId && !locations.some((location) => location.id === locationId)) {
      form.setValue('locationId', '', { shouldDirty: true });
    }
    if (assetId && !assets.some((asset) => asset.id === assetId)) {
      form.setValue('assetId', '', { shouldDirty: true });
    }
  }, [assetId, assets, form, locationId, locations]);

  const mutation = useMutation({
    mutationFn: (values: QuickCreateWorkOrderFormValues) => createWorkOrder(
      getSupabaseClient(),
      buildQuickWorkOrderInput(tenantId, values),
    ),
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-orders', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] }),
      ]);
      onCreated(created.id, created.code, null);
    },
    onError: (error) => {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'No se pudo crear la orden de trabajo.',
      });
    },
  });

  if (!canManage) {
    return (
      <section className="panel data-state error-state">
        <ShieldCheck size={34} />
        <strong>Acceso de solo lectura</strong>
        <p>Tu perfil no puede crear órdenes de trabajo.</p>
        <button className="secondary-button" onClick={onCancel} type="button"><ArrowLeft size={17} /> Volver</button>
      </section>
    );
  }

  if (catalogQuery.isLoading) {
    return <section className="panel data-state"><LoaderCircle className="spin" size={30} /><strong>Preparando OT rápida…</strong><p>Cargando clientes e instalaciones.</p></section>;
  }

  if (catalogQuery.error) {
    return (
      <section className="panel data-state error-state">
        <AlertTriangle size={30} />
        <strong>No se pudo preparar la OT rápida</strong>
        <p>{catalogQuery.error.message}</p>
        <button className="secondary-button" onClick={() => void catalogQuery.refetch()} type="button">Reintentar</button>
      </section>
    );
  }

  if (!catalog) {
    return <section className="panel data-state"><ClipboardList size={30} /><strong>Catálogo no disponible</strong><p>No se puede crear la OT hasta recuperar el contexto de la organización.</p></section>;
  }

  const errors = form.formState.errors;

  return (
    <>
      <div className="page-heading page-heading-row">
        <div>
          <span className="section-kicker">Alta en pocos segundos</span>
          <h1>Nueva OT rápida</h1>
          <p>Registra la avería ahora. Técnico, fechas y configuración especial se pueden añadir después.</p>
        </div>
        <span className="source-badge">Borrador</span>
      </div>

      <form className="panel work-order-create-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="demo-form-banner">
          <CheckCircle2 size={20} />
          <span><strong>Activo no obligatorio</strong><small>Si todavía no sabes qué equipo falla, crea la OT igualmente y completa la identificación durante la intervención.</small></span>
        </div>

        <div className="creation-section-heading">
          <div><span>1</span><strong>Dónde ocurre</strong></div>
          <small>Solo instalación obligatoria; ubicación y activo son opcionales.</small>
        </div>

        <div className="form-grid">
          <label>Cliente
            <select {...form.register('clientId')}>
              <option value="">Seleccionar cliente</option>
              {catalog.clients.map((client) => <option key={client.id} value={client.id}>{client.code ? `${client.code} · ` : ''}{client.name}</option>)}
            </select>
            {errors.clientId && <small className="field-error">{errors.clientId.message}</small>}
          </label>

          <label>Instalación
            <select {...form.register('installationId')} disabled={!clientId}>
              <option value="">{clientId ? 'Seleccionar instalación' : 'Selecciona antes un cliente'}</option>
              {installations.map((installation) => <option key={installation.id} value={installation.id}>{installation.code ? `${installation.code} · ` : ''}{installation.name}</option>)}
            </select>
            {errors.installationId && <small className="field-error">{errors.installationId.message}</small>}
          </label>

          {clientId && installations.length === 0 && (
            <p className="read-only-note full-field"><MapPin size={16} /> Este cliente no tiene instalaciones activas. Cambia a modo Avanzado para dar de alta la instalación.</p>
          )}

          <label>Ubicación <small>Opcional</small>
            <select {...form.register('locationId')} disabled={!installationId}>
              <option value="">Sin ubicación registrada</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>

          <label>Activo relacionado <small>Opcional</small>
            <select {...form.register('assetId')} disabled={!installationId}>
              <option value="">Sin activo identificado</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
            <small>Se puede vincular más tarde desde el flujo técnico.</small>
          </label>
        </div>

        <div className="creation-section-heading">
          <div><span>2</span><strong>Qué ocurre</strong></div>
          <small>Describe el problema de forma que el técnico entienda la actuación.</small>
        </div>

        <div className="form-grid">
          <label className="full-field">Problema
            <input {...form.register('title')} autoFocus placeholder="Ej. Habitación 312 · luz del baño no funciona" />
            {errors.title && <small className="field-error">{errors.title.message}</small>}
          </label>

          <label>Prioridad
            <select {...form.register('priority')}>
              {PRIORITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="full-field">Detalles adicionales <small>Opcional</small>
            <textarea {...form.register('description')} placeholder="Añade síntomas, acceso, contacto o cualquier información útil." rows={4} />
            {errors.description && <small className="field-error">{errors.description.message}</small>}
          </label>
        </div>

        <div className="read-only-note">
          <Boxes size={16} /> Se creará como avería en borrador, sin técnico ni fecha. Al cerrar se pedirá foto final y resumen del trabajo.
        </div>

        {errors.root?.message && <p className="form-global-error"><AlertTriangle size={16} /> {errors.root.message}</p>}

        <div className="form-actions work-order-form-actions">
          <button className="secondary-button" disabled={mutation.isPending} onClick={onCancel} type="button"><ArrowLeft size={17} /> Cancelar</button>
          <button className="primary-button" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? <LoaderCircle className="spin" size={18} /> : <ClipboardList size={18} />}
            {mutation.isPending ? 'Creando…' : 'Crear OT rápida'}
          </button>
        </div>
      </form>
    </>
  );
}
