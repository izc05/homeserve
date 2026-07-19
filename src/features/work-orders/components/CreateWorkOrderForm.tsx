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
  Plus,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  createAsset,
  createInstallation,
  createWorkOrder,
  loadWorkOrderCreationCatalog,
  type CreateWorkOrderInput,
} from '../api/workOrderCommands';
import {
  createWorkOrderSchema,
  localDateTimeToIso,
  type CreateWorkOrderFormValues,
} from '../forms/createWorkOrderSchema';

const TYPE_OPTIONS = [
  ['averia', 'Avería'],
  ['mantenimiento_preventivo', 'Mantenimiento preventivo'],
  ['mantenimiento_correctivo', 'Mantenimiento correctivo'],
  ['revision', 'Revisión'],
  ['inspeccion', 'Inspección'],
  ['instalacion', 'Instalación'],
  ['sustitucion', 'Sustitución'],
  ['medicion', 'Medición'],
  ['urgencia', 'Urgencia'],
  ['otro', 'Otro'],
] as const;

const PRIORITY_OPTIONS = [
  ['baja', 'Baja'],
  ['normal', 'Media'],
  ['alta', 'Alta'],
  ['urgente', 'Urgente'],
  ['critica', 'Crítica'],
] as const;

const DEFAULT_VALUES: CreateWorkOrderFormValues = {
  title: '',
  description: '',
  installationId: '',
  locationId: '',
  assetId: '',
  technicianId: '',
  type: 'mantenimiento_preventivo',
  priority: 'normal',
  plannedAt: '',
  dueAt: '',
  estimatedMinutes: undefined,
  instructions: '',
  safetyNotes: '',
  expectedResult: '',
  checklist: true,
  initialPhotos: false,
  finalPhotos: true,
  measurements: false,
  materials: false,
  technicianSignature: true,
  responsibleSignature: false,
  finalFunctionalTest: false,
  report: true,
  administrativeReview: true,
};

const EMPTY_INSTALLATION_DRAFT = {
  name: '',
  code: '',
  type: 'fotovoltaica',
  address: '',
  gps: '',
  mapUrl: '',
  photoUrl: '',
  details: '',
};

const EMPTY_ASSET_DRAFT = {
  name: '',
  type: 'inversor_fotovoltaico',
  reference: '',
  criticality: 'media',
};

type CreateMode = 'draft' | 'assigned';

type CreateWorkOrderFormProps = {
  tenantId: string;
  canManage: boolean;
  initialValues?: Partial<CreateWorkOrderFormValues>;
  onCancel: () => void;
  onCreated: (workOrderId: string, code: string) => void;
};

function buildInstallationDescription(draft: typeof EMPTY_INSTALLATION_DRAFT): string {
  const lines = [
    'Instalación creada desde alta rápida del formulario de OT.',
    draft.gps.trim() ? `Localización GPS: ${draft.gps.trim()}` : null,
    draft.mapUrl.trim() ? `Mapa de ubicación: ${draft.mapUrl.trim()}` : null,
    draft.photoUrl.trim() ? `Foto general de la instalación: ${draft.photoUrl.trim()}` : null,
    draft.details.trim() ? `Detalles de acceso/instalación: ${draft.details.trim()}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export default function CreateWorkOrderForm({
  tenantId,
  canManage,
  initialValues,
  onCancel,
  onCreated,
}: CreateWorkOrderFormProps) {
  const queryClient = useQueryClient();
  const [installationDraft, setInstallationDraft] = useState(EMPTY_INSTALLATION_DRAFT);
  const [assetDraft, setAssetDraft] = useState(EMPTY_ASSET_DRAFT);

  const catalogQuery = useQuery({
    queryKey: ['work-order-creation-catalog', tenantId],
    queryFn: () => loadWorkOrderCreationCatalog(getSupabaseClient(), tenantId),
    enabled: canManage && Boolean(tenantId),
    staleTime: 60_000,
  });

  const form = useForm<CreateWorkOrderFormValues>({
    resolver: zodResolver(createWorkOrderSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...initialValues,
    },
  });

  useEffect(() => {
    form.reset({
      ...DEFAULT_VALUES,
      ...initialValues,
    });
  }, [form, initialValues]);

  const installationId = form.watch('installationId');
  const locationId = form.watch('locationId');
  const catalog = catalogQuery.data;

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

  const quickInstallationMutation = useMutation({
    mutationFn: () => createInstallation(getSupabaseClient(), {
      tenantId,
      name: installationDraft.name,
      code: installationDraft.code,
      type: installationDraft.type,
      address: installationDraft.address,
      description: buildInstallationDescription(installationDraft),
    }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] });
      await catalogQuery.refetch();
      form.setValue('installationId', created.id, { shouldDirty: true, shouldValidate: true });
      form.setValue('locationId', '', { shouldDirty: true });
      form.setValue('assetId', '', { shouldDirty: true });
      if (!form.getValues('title')) form.setValue('title', `Intervención en ${created.name}`);
      setInstallationDraft(EMPTY_INSTALLATION_DRAFT);
      form.clearErrors('root');
    },
    onError: (error) => form.setError('root', {
      message: error instanceof Error ? error.message : 'No se pudo crear la instalación.',
    }),
  });

  const quickAssetMutation = useMutation({
    mutationFn: () => createAsset(getSupabaseClient(), {
      tenantId,
      installationId,
      locationId: locationId || null,
      name: assetDraft.name,
      type: assetDraft.type,
      reference: assetDraft.reference,
      criticality: assetDraft.criticality,
      description: 'Equipo creado desde alta rápida del formulario de OT.',
    }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] });
      await catalogQuery.refetch();
      form.setValue('assetId', created.id, { shouldDirty: true, shouldValidate: true });
      if (!form.getValues('title')) form.setValue('title', `Revisión de ${created.name}`);
      setAssetDraft(EMPTY_ASSET_DRAFT);
      form.clearErrors('root');
    },
    onError: (error) => form.setError('root', {
      message: error instanceof Error ? error.message : 'No se pudo crear el equipo.',
    }),
  });

  const mutation = useMutation({
    mutationFn: async ({ values, mode }: { values: CreateWorkOrderFormValues; mode: CreateMode }) => {
      if (mode === 'assigned' && !values.technicianId) {
        throw new Error('Selecciona un técnico para crear la OT como asignada.');
      }

      const input: CreateWorkOrderInput = {
        tenantId,
        installationId: values.installationId,
        locationId: values.locationId || null,
        assetId: values.assetId || null,
        technicianId: mode === 'assigned' ? values.technicianId || null : null,
        title: values.title,
        description: values.description || null,
        type: values.type,
        priority: values.priority,
        plannedAt: localDateTimeToIso(values.plannedAt),
        dueAt: localDateTimeToIso(values.dueAt),
        estimatedMinutes: values.estimatedMinutes ?? null,
        instructions: values.instructions || null,
        safetyNotes: values.safetyNotes || null,
        expectedResult: values.expectedResult || null,
        requirements: {
          checklist: values.checklist,
          initialPhotos: values.initialPhotos,
          finalPhotos: values.finalPhotos,
          measurements: values.measurements,
          materials: values.materials,
          technicianSignature: values.technicianSignature,
          responsibleSignature: values.responsibleSignature,
          finalFunctionalTest: values.finalFunctionalTest,
          report: values.report,
          administrativeReview: values.administrativeReview,
        },
      };

      return createWorkOrder(getSupabaseClient(), input);
    },
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-orders', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] }),
      ]);
      onCreated(created.id, created.code);
    },
    onError: (error) => {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'No se pudo crear la orden de trabajo.',
      });
    },
  });

  const submit = (mode: CreateMode) => form.handleSubmit((values) => {
    form.clearErrors('root');
    mutation.mutate({ values, mode });
  })();

  if (!canManage) {
    return (
      <section className="panel data-state error-state">
        <ShieldCheck size={34} />
        <strong>Acceso de solo lectura</strong>
        <p>La creación y asignación de OT está reservada a administradores autorizados.</p>
        <button className="secondary-button" onClick={onCancel} type="button"><ArrowLeft size={17} /> Volver</button>
      </section>
    );
  }

  if (catalogQuery.isLoading) {
    return <section className="panel data-state"><LoaderCircle className="spin" size={30} /><strong>Preparando el formulario…</strong><p>Cargando instalaciones, ubicaciones, activos y técnicos de la organización activa.</p></section>;
  }

  if (catalogQuery.error) {
    return (
      <section className="panel data-state error-state">
        <AlertTriangle size={30} />
        <strong>No se pudo preparar la nueva OT</strong>
        <p>{catalogQuery.error.message}</p>
        <button className="secondary-button" onClick={() => void catalogQuery.refetch()} type="button">Reintentar</button>
      </section>
    );
  }

  if (!catalog) {
    return (
      <section className="panel data-state">
        <ClipboardList size={32} />
        <strong>No hay catálogo disponible</strong>
        <p>No se pudo cargar el catálogo necesario para crear una orden de trabajo.</p>
        <button className="secondary-button" onClick={onCancel} type="button"><ArrowLeft size={17} /> Volver</button>
      </section>
    );
  }

  const errors = form.formState.errors;
  const busy = mutation.isPending || quickInstallationMutation.isPending || quickAssetMutation.isPending;
  const canCreateAsset = Boolean(installationId);

  return (
    <>
      <div className="page-heading">
        <span className="section-kicker">Nueva intervención</span>
        <h1>Crear orden de trabajo</h1>
        <p>Primero selecciona instalación/equipo. Después guarda como borrador o asigna a un técnico.</p>
      </div>

      <form className="panel work-order-create-form" onSubmit={(event) => event.preventDefault()}>
        {initialValues && Object.keys(initialValues).length > 0 && (
          <p className="read-only-note"><CheckCircle2 size={16} /> Formulario precargado desde el módulo seleccionado.</p>
        )}

        <div className="creation-section-heading">
          <div><span>+</span><strong>Alta rápida de instalación FV</strong></div>
          <small>Incluye mapa, localización, foto general y detalles de acceso.</small>
        </div>

        <div className="form-grid installation-context-grid">
          <label>Nombre instalación
            <input
              onChange={(event) => setInstallationDraft((draft) => ({ ...draft, name: event.target.value }))}
              placeholder="Ej. Cubierta FV edificio A"
              value={installationDraft.name}
            />
          </label>
          <label>Código
            <input
              onChange={(event) => setInstallationDraft((draft) => ({ ...draft, code: event.target.value }))}
              placeholder="FV-CUB-001"
              value={installationDraft.code}
            />
          </label>
          <label>Tipo
            <input
              onChange={(event) => setInstallationDraft((draft) => ({ ...draft, type: event.target.value }))}
              placeholder="fotovoltaica"
              value={installationDraft.type}
            />
          </label>
          <label>Dirección / zona
            <input
              onChange={(event) => setInstallationDraft((draft) => ({ ...draft, address: event.target.value }))}
              placeholder="Cubierta, parking, sala técnica..."
              value={installationDraft.address}
            />
          </label>
          <label>Localización GPS
            <input
              onChange={(event) => setInstallationDraft((draft) => ({ ...draft, gps: event.target.value }))}
              placeholder="37.18817, -3.60667"
              value={installationDraft.gps}
            />
          </label>
          <label>Mapa de ubicación
            <input
              onChange={(event) => setInstallationDraft((draft) => ({ ...draft, mapUrl: event.target.value }))}
              placeholder="Enlace Google Maps / Maps"
              value={installationDraft.mapUrl}
            />
          </label>
          <label>Foto instalación completa
            <input
              onChange={(event) => setInstallationDraft((draft) => ({ ...draft, photoUrl: event.target.value }))}
              placeholder="URL de foto general de la planta"
              value={installationDraft.photoUrl}
            />
          </label>
          <label className="full-field">Detalles de acceso / instalación
            <textarea
              onChange={(event) => setInstallationDraft((draft) => ({ ...draft, details: event.target.value }))}
              placeholder="Acceso, cubierta, llaves, sala técnica, contacto, riesgos, referencias visuales..."
              rows={3}
              value={installationDraft.details}
            />
          </label>
          <button
            className="secondary-button installation-create-button"
            disabled={busy || !installationDraft.name.trim()}
            onClick={() => quickInstallationMutation.mutate()}
            type="button"
          >
            {quickInstallationMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <MapPin size={17} />} Crear instalación con ubicación
          </button>
        </div>

        <div className="form-grid">
          <label>Nombre equipo
            <input
              disabled={!canCreateAsset}
              onChange={(event) => setAssetDraft((draft) => ({ ...draft, name: event.target.value }))}
              placeholder="Ej. Inversor FV 50 kW"
              value={assetDraft.name}
            />
          </label>
          <label>Tipo equipo
            <input
              disabled={!canCreateAsset}
              onChange={(event) => setAssetDraft((draft) => ({ ...draft, type: event.target.value }))}
              placeholder="inversor_fotovoltaico"
              value={assetDraft.type}
            />
          </label>
          <label>Referencia
            <input
              disabled={!canCreateAsset}
              onChange={(event) => setAssetDraft((draft) => ({ ...draft, reference: event.target.value }))}
              placeholder="INV-FV-001"
              value={assetDraft.reference}
            />
          </label>
          <label>Criticidad
            <select
              disabled={!canCreateAsset}
              onChange={(event) => setAssetDraft((draft) => ({ ...draft, criticality: event.target.value }))}
              value={assetDraft.criticality}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </label>
          <button
            className="secondary-button"
            disabled={busy || !canCreateAsset || !assetDraft.name.trim()}
            onClick={() => quickAssetMutation.mutate()}
            type="button"
          >
            {quickAssetMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <Boxes size={17} />} Crear equipo
          </button>
          {!canCreateAsset && <p className="read-only-note"><Plus size={16} /> Selecciona o crea una instalación antes de crear el equipo.</p>}
        </div>

        <div className="creation-section-heading">
          <div><span>1</span><strong>Trabajo y ubicación</strong></div>
          <small>Campos obligatorios para identificar la intervención.</small>
        </div>

        <div className="form-grid">
          <label className="full-field">Título
            <input {...form.register('title')} placeholder="Ej. Revisar inversor FV de cubierta" />
            {errors.title && <small className="field-error">{errors.title.message}</small>}
          </label>

          <label>Instalación
            <select {...form.register('installationId')}>
              <option value="">Seleccionar instalación</option>
              {catalog.installations.map((installation) => <option key={installation.id} value={installation.id}>{installation.code ? `${installation.code} · ` : ''}{installation.name}</option>)}
            </select>
            {errors.installationId && <small className="field-error">{errors.installationId.message}</small>}
          </label>

          <label>Ubicación
            <select {...form.register('locationId')} disabled={!installationId}>
              <option value="">Sin ubicación concreta</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>

          <label>Activo relacionado
            <select {...form.register('assetId')} disabled={!installationId}>
              <option value="">Sin activo relacionado</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
          </label>

          <label>Tipo de trabajo
            <select {...form.register('type')}>
              {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label>Prioridad
            <select {...form.register('priority')}>
              {PRIORITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="full-field">Descripción
            <textarea {...form.register('description')} placeholder="Describe el problema, alcance o revisión necesaria." rows={4} />
          </label>
        </div>

        <div className="creation-section-heading">
          <div><span>2</span><strong>Planificación y asignación</strong></div>
          <small>El técnico solo es obligatorio al crear y asignar.</small>
        </div>

        <div className="form-grid">
          <label>Técnico
            <select {...form.register('technicianId')}>
              <option value="">Sin asignar</option>
              {catalog.technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}{technician.role === 'tecnico_externo' ? ' · Externo' : ''}</option>)}
            </select>
          </label>

          <label>Duración estimada (min)
            <input {...form.register('estimatedMinutes')} min="1" max="43200" placeholder="90" type="number" />
            {errors.estimatedMinutes && <small className="field-error">{errors.estimatedMinutes.message}</small>}
          </label>

          <label>Fecha prevista
            <input {...form.register('plannedAt')} type="datetime-local" />
          </label>

          <label>Fecha límite
            <input {...form.register('dueAt')} type="datetime-local" />
            {errors.dueAt && <small className="field-error">{errors.dueAt.message}</small>}
          </label>

          <label className="full-field">Instrucciones para el técnico
            <textarea {...form.register('instructions')} placeholder="Accesos, comprobaciones, herramientas o pasos relevantes." rows={3} />
          </label>

          <label className="full-field">Riesgos y precauciones
            <textarea {...form.register('safetyNotes')} placeholder="Consignación, EPIs, riesgo eléctrico, trabajo en altura…" rows={3} />
          </label>

          <label className="full-field">Resultado esperado
            <textarea {...form.register('expectedResult')} placeholder="Condición que debe cumplirse al finalizar." rows={2} />
          </label>
        </div>

        <div className="creation-section-heading">
          <div><span>3</span><strong>Requisitos de cierre</strong></div>
          <small>Se guardan como configuración oficial de la OT.</small>
        </div>

        <div className="requirements-grid">
          {[
            ['checklist', 'Checklist'],
            ['initialPhotos', 'Fotos iniciales'],
            ['finalPhotos', 'Fotos finales'],
            ['measurements', 'Mediciones'],
            ['materials', 'Materiales'],
            ['technicianSignature', 'Firma del técnico'],
            ['responsibleSignature', 'Firma del responsable'],
            ['finalFunctionalTest', 'Prueba funcional'],
            ['report', 'Informe PDF'],
            ['administrativeReview', 'Revisión administrativa'],
          ].map(([name, label]) => (
            <label className="requirement-option" key={name}>
              <input type="checkbox" {...form.register(name as keyof CreateWorkOrderFormValues)} />
              <span><CheckCircle2 size={17} /><strong>{label}</strong></span>
            </label>
          ))}
        </div>

        {errors.root?.message && <p className="form-global-error"><AlertTriangle size={17} /> {errors.root.message}</p>}

        <div className="form-actions work-order-form-actions">
          <button className="secondary-button" disabled={busy} onClick={onCancel} type="button"><ArrowLeft size={17} /> Cancelar</button>
          <button className="secondary-button" disabled={busy} onClick={() => void submit('draft')} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />} Guardar borrador</button>
          <button className="primary-button" disabled={busy || catalog.technicians.length === 0} onClick={() => void submit('assigned')} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />} Crear y asignar</button>
        </div>
      </form>
    </>
  );
}
