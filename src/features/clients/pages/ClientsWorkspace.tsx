import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronRight,
  ClipboardList,
  Edit3,
  Eye,
  LoaderCircle,
  Plus,
  Power,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { clientsService } from '../api/clientsService';
import { filterClients, friendlyClientError, hasNoInstallations } from '../api/clientRepository';
import ClientForm from '../components/ClientForm';
import InstallationForm from '../components/InstallationForm';
import InstallationPhotoGallery from '../components/InstallationPhotoGallery';
import type { ClientFormValues, InstallationFormValues } from '../schemas/clientSchemas';
import type { ClientInstallation, ClientRecord, EntityStatus } from '../types/client';
import { workOrderStatusLabel } from '../../work-orders/domain/statusCompatibility';

type ClientEditor = 'create' | 'edit' | null;
type InstallationEditor = 'create' | string | null;

type ClientsWorkspaceProps = {
  tenantId: string;
  canManage: boolean;
  onCreateWorkOrder: (client: ClientRecord) => void;
};

function toClientFormValues(client: ClientRecord): ClientFormValues {
  return {
    name: client.name,
    code: client.code ?? '',
    cifNif: client.cifNif ?? '',
    contactName: client.contactName ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    address: client.address ?? '',
    notes: client.notes ?? '',
    status: client.status,
  };
}

function toInstallationFormValues(installation: ClientInstallation): InstallationFormValues {
  return {
    clientId: installation.clientId,
    name: installation.name,
    code: installation.code ?? '',
    type: installation.type ?? '',
    address: installation.address ?? '',
    description: installation.description ?? '',
    contactName: installation.contactName ?? '',
    contactPhone: installation.contactPhone ?? '',
    contactEmail: installation.contactEmail ?? '',
    status: installation.status,
  };
}

function statusLabel(status: EntityStatus) {
  return status === 'activo' ? 'Activo' : 'Inactivo';
}

function statusClass(status: EntityStatus) {
  return `client-status ${status}`;
}

function DataError({ onRetry }: { onRetry: () => void }) {
  return <section className="panel data-state error-state"><AlertTriangle size={30} /><strong>No se pudieron cargar los clientes</strong><p>Comprueba tu conexión o tus permisos e inténtalo de nuevo.</p><button className="secondary-button" onClick={onRetry} type="button"><RefreshCw size={17} /> Reintentar</button></section>;
}

export default function ClientsWorkspace({ tenantId, canManage, onCreateWorkOrder }: ClientsWorkspaceProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todos' | EntityStatus>('todos');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientEditor, setClientEditor] = useState<ClientEditor>(null);
  const [installationEditor, setInstallationEditor] = useState<InstallationEditor>(null);
  const [selectedInstallationId, setSelectedInstallationId] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['clients', tenantId],
    queryFn: () => clientsService.list(tenantId),
    enabled: Boolean(tenantId),
  });
  const detailQuery = useQuery({
    queryKey: ['client-detail', tenantId, selectedClientId],
    queryFn: () => clientsService.detail(tenantId, selectedClientId ?? ''),
    enabled: Boolean(tenantId && selectedClientId),
  });

  const refreshClientData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['client-detail', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] }),
    ]);
  };

  const createClientMutation = useMutation({
    mutationFn: (values: ClientFormValues) => clientsService.create({ tenantId, ...values }),
    onSuccess: async (client) => {
      await refreshClientData();
      setSelectedClientId(client.id);
      setClientEditor(null);
    },
  });
  const updateClientMutation = useMutation({
    mutationFn: (values: ClientFormValues) => clientsService.update(tenantId, selectedClientId ?? '', values),
    onSuccess: async () => { await refreshClientData(); setClientEditor(null); },
  });
  const updateClientStatusMutation = useMutation({
    mutationFn: ({ clientId, nextStatus }: { clientId: string; nextStatus: EntityStatus }) => clientsService.setStatus(tenantId, clientId, nextStatus),
    onSuccess: refreshClientData,
  });
  const createInstallationMutation = useMutation({
    mutationFn: (values: InstallationFormValues) => clientsService.createInstallation({ tenantId, ...values }),
    onSuccess: async () => { await refreshClientData(); setInstallationEditor(null); },
  });
  const updateInstallationMutation = useMutation({
    mutationFn: ({ installationId, values }: { installationId: string; values: InstallationFormValues }) => clientsService.updateInstallation(tenantId, installationId, values),
    onSuccess: async () => { await refreshClientData(); setInstallationEditor(null); },
  });
  const updateInstallationStatusMutation = useMutation({
    mutationFn: ({ installation, nextStatus }: { installation: ClientInstallation; nextStatus: EntityStatus }) => clientsService.setInstallationStatus(tenantId, installation, nextStatus),
    onSuccess: refreshClientData,
  });

  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const filteredClients = useMemo(() => filterClients(clients, search, status), [clients, search, status]);
  const detail = detailQuery.data;
  const selectedInstallation = installationEditor && installationEditor !== 'create'
    ? detail?.installations.find((installation) => installation.id === installationEditor) ?? null
    : null;
  const installationDetail = selectedInstallationId
    ? detail?.installations.find((installation) => installation.id === selectedInstallationId) ?? null
    : null;

  const saveNewClient = async (values: ClientFormValues) => {
    try { await createClientMutation.mutateAsync(values); } catch (error) { throw new Error(friendlyClientError(error, 'No se pudo crear el cliente.')); }
  };
  const saveClient = async (values: ClientFormValues) => {
    try { await updateClientMutation.mutateAsync(values); } catch (error) { throw new Error(friendlyClientError(error, 'No se pudo actualizar el cliente.')); }
  };
  const saveInstallation = async (values: InstallationFormValues) => {
    try {
      if (installationEditor === 'create') await createInstallationMutation.mutateAsync(values);
      else if (selectedInstallation) await updateInstallationMutation.mutateAsync({ installationId: selectedInstallation.id, values });
    } catch (error) {
      throw new Error(friendlyClientError(error, 'No se pudo guardar la instalación.'));
    }
  };

  const toggleClient = (client: ClientRecord) => {
    const nextStatus: EntityStatus = client.status === 'activo' ? 'inactivo' : 'activo';
    if (!window.confirm(`${nextStatus === 'activo' ? 'Activar' : 'Desactivar'} a ${client.name}? El historial se conservará.`)) return;
    updateClientStatusMutation.mutate({ clientId: client.id, nextStatus });
  };
  const toggleInstallation = (installation: ClientInstallation) => {
    const nextStatus: EntityStatus = installation.status === 'activo' ? 'inactivo' : 'activo';
    if (!window.confirm(`${nextStatus === 'activo' ? 'Activar' : 'Desactivar'} ${installation.name}?`)) return;
    updateInstallationStatusMutation.mutate({ installation, nextStatus });
  };

  if (clientsQuery.isLoading) return <section className="panel data-state"><LoaderCircle className="spin" size={30} /><strong>Cargando clientes…</strong></section>;
  if (clientsQuery.error) return <DataError onRetry={() => void clientsQuery.refetch()} />;

  if (selectedClientId) {
    if (detailQuery.isLoading) return <section className="panel data-state"><LoaderCircle className="spin" size={30} /><strong>Cargando ficha del cliente…</strong></section>;
    if (detailQuery.error || !detail) return <section className="panel data-state error-state"><AlertTriangle size={30} /><strong>No se pudo abrir el cliente</strong><p>El registro puede no estar disponible con tus permisos actuales.</p><button className="secondary-button" onClick={() => setSelectedClientId(null)} type="button"><ArrowLeft size={17} /> Volver al listado</button></section>;
    const clientHasNoInstallations = hasNoInstallations(detail.installations);
    return (
      <section className="clients-workspace">
        <div className="page-heading client-heading"><button className="text-link" onClick={() => { setSelectedClientId(null); setClientEditor(null); setInstallationEditor(null); setSelectedInstallationId(null); }} type="button"><ArrowLeft size={16} /> Clientes</button><span className="section-kicker">Ficha de cliente</span><div className="client-title-row"><div><h1>{detail.client.name}</h1><p>{detail.client.code || 'Sin código'}{detail.client.cifNif ? ` · ${detail.client.cifNif}` : ''}</p></div><span className={statusClass(detail.client.status)}>{statusLabel(detail.client.status)}</span></div></div>
        <div className="client-action-bar">
          <button className="primary-button" disabled={detail.client.status !== 'activo' || clientHasNoInstallations} onClick={() => onCreateWorkOrder(detail.client)} type="button"><ClipboardList size={17} /> Nueva OT</button>
          {canManage && <><button className="secondary-button" onClick={() => setClientEditor(clientEditor === 'edit' ? null : 'edit')} type="button"><Edit3 size={17} /> Editar cliente</button><button className="secondary-button" disabled={updateClientStatusMutation.isPending} onClick={() => toggleClient(detail.client)} type="button"><Power size={17} /> {detail.client.status === 'activo' ? 'Desactivar' : 'Activar'}</button></>}
        </div>

        {clientEditor === 'edit' && canManage && <section className="panel client-editor-panel"><div className="panel-heading"><h2>Editar cliente</h2></div><ClientForm initialValues={toClientFormValues(detail.client)} submitLabel="Guardar cambios" onSubmit={saveClient} /></section>}

        <div className="client-detail-grid">
          <section className="panel"><div className="panel-heading"><h2>Datos generales</h2></div><dl className="client-data-list"><div><dt>Contacto</dt><dd>{detail.client.contactName || 'Sin contacto'}</dd></div><div><dt>Correo</dt><dd>{detail.client.email || 'Sin correo'}</dd></div><div><dt>Teléfono</dt><dd>{detail.client.phone || 'Sin teléfono'}</dd></div><div className="full"><dt>Dirección</dt><dd>{detail.client.address || 'Sin dirección registrada'}</dd></div><div className="full"><dt>Observaciones</dt><dd>{detail.client.notes || 'Sin observaciones'}</dd></div></dl></section>
          <section className="panel client-summary-panel"><div className="panel-heading"><h2>Actividad</h2></div><div className="client-stat"><Building2 size={19} /><span><strong>{detail.installations.length}</strong> instalaciones</span></div><div className="client-stat"><ClipboardList size={19} /><span><strong>{detail.openWorkOrders.length}</strong> OT abiertas</span></div></section>
        </div>

        <section className="client-section"><div className="section-row"><div><h2>Instalaciones</h2><p>Centros y ubicaciones operativas de {detail.client.name}.</p></div>{canManage && <button className="secondary-button" onClick={() => setInstallationEditor(installationEditor === 'create' ? null : 'create')} type="button"><Plus size={17} /> Nueva instalación</button>}</div>
          {clientHasNoInstallations ? <section className="panel client-empty-state"><Building2 size={28} /><strong>Este cliente no tiene instalaciones</strong><p>Antes de crear una OT debes registrar al menos una instalación activa.</p>{canManage && <button className="primary-button" onClick={() => setInstallationEditor('create')} type="button"><Plus size={17} /> Crear instalación</button>}</section> : <div className="installation-list">{detail.installations.map((installation) => <article className={`installation-row ${selectedInstallationId === installation.id ? 'is-selected' : ''}`} key={installation.id}><div className="installation-icon"><Building2 size={20} /></div><div><strong>{installation.code ? `${installation.code} · ` : ''}{installation.name}</strong><small>{installation.type || 'Tipo sin definir'}{installation.address ? ` · ${installation.address}` : ''}</small><small>{installation.contactName || 'Sin contacto'}{installation.contactPhone ? ` · ${installation.contactPhone}` : ''}</small></div><span className={statusClass(installation.status)}>{statusLabel(installation.status)}</span><div className="row-actions"><button className="secondary-button installation-open-button" aria-expanded={selectedInstallationId === installation.id} onClick={() => setSelectedInstallationId((current) => current === installation.id ? null : installation.id)} type="button"><Eye size={16} /> {selectedInstallationId === installation.id ? 'Cerrar ficha' : 'Abrir ficha'}</button>{canManage && <><button className="icon-button" aria-label={`Editar ${installation.name}`} onClick={() => setInstallationEditor(installation.id)} type="button"><Edit3 size={16} /></button><button className="icon-button" aria-label={`${installation.status === 'activo' ? 'Desactivar' : 'Activar'} ${installation.name}`} onClick={() => toggleInstallation(installation)} type="button"><Power size={16} /></button></>}</div></article>)}</div>}
          {installationEditor && canManage && <section className="panel client-editor-panel"><div className="panel-heading"><h2>{installationEditor === 'create' ? 'Nueva instalación' : 'Editar instalación'}</h2></div><InstallationForm clientId={detail.client.id} initialValues={selectedInstallation ? toInstallationFormValues(selectedInstallation) : undefined} submitLabel={installationEditor === 'create' ? 'Guardar instalación' : 'Guardar cambios'} onSubmit={saveInstallation} /></section>}
          {installationDetail && <InstallationPhotoGallery tenantId={tenantId} installationId={installationDetail.id} installationName={installationDetail.name} address={installationDetail.address} contactName={installationDetail.contactName} contactPhone={installationDetail.contactPhone} canManage={canManage} />}
        </section>

        <div className="client-detail-grid">
          <section className="panel"><div className="panel-heading"><h2>OT abiertas</h2><span className="source-badge">{detail.openWorkOrders.length}</span></div>{detail.openWorkOrders.length === 0 ? <p className="empty-state">No hay OT abiertas para este cliente.</p> : <div className="client-order-list">{detail.openWorkOrders.map((order) => <div key={order.id}><span><strong>{order.code}</strong><small>{order.title}</small></span><b>{workOrderStatusLabel(order.status)}</b></div>)}</div>}</section>
          <section className="panel"><div className="panel-heading"><h2>Últimas OT</h2></div>{detail.recentWorkOrders.length === 0 ? <p className="empty-state">Sin OT registradas todavía.</p> : <div className="client-order-list">{detail.recentWorkOrders.slice(0, 5).map((order) => <div key={order.id}><span><strong>{order.code}</strong><small>{order.title}</small></span><b>{workOrderStatusLabel(order.status)}</b></div>)}</div>}</section>
        </div>
      </section>
    );
  }

  return (
    <section className="clients-workspace">
      <div className="page-heading"><span className="section-kicker">Operación comercial</span><h1>Clientes</h1><p>Gestiona clientes, contactos e instalaciones sin perder el historial operativo.</p></div>
      <div className="client-toolbar"><label className="client-search"><span>Buscar</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, CIF/NIF, contacto, correo o teléfono" value={search} /></label><label><span>Estado</span><select onChange={(event) => setStatus(event.target.value as 'todos' | EntityStatus)} value={status}><option value="todos">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label>{canManage && <button className="primary-button" onClick={() => setClientEditor('create')} type="button"><Plus size={17} /> Nuevo cliente</button>}</div>
      {clientEditor === 'create' && canManage && <section className="panel client-editor-panel"><div className="panel-heading"><h2>Nuevo cliente</h2></div><ClientForm submitLabel="Crear cliente" onSubmit={saveNewClient} /></section>}
      <section className="panel client-list-panel"><div className="panel-heading"><div><h2>Listado real</h2><p>{filteredClients.length} clientes visibles</p></div></div>{filteredClients.length === 0 ? <div className="client-empty-state"><UserRound size={28} /><strong>No hay clientes que coincidan</strong><p>{clients.length === 0 ? 'Crea el primer cliente para empezar a organizar las instalaciones.' : 'Prueba a cambiar la búsqueda o el estado.'}</p>{canManage && clients.length === 0 && <button className="primary-button" onClick={() => setClientEditor('create')} type="button"><Plus size={17} /> Crear cliente</button>}</div> : <div className="client-list">{filteredClients.map((client) => <button className="client-row" key={client.id} onClick={() => setSelectedClientId(client.id)} type="button"><span className="client-row-icon"><UserRound size={19} /></span><span className="client-row-main"><strong>{client.name}</strong><small>{client.cifNif || client.code || 'Sin CIF/NIF ni código'}{client.contactName ? ` · ${client.contactName}` : ''}</small></span><span className="client-row-metric"><strong>{client.installationCount}</strong><small>instalaciones</small></span><span className="client-row-metric"><strong>{client.openWorkOrderCount}</strong><small>OT abiertas</small></span><span className={statusClass(client.status)}>{statusLabel(client.status)}</span><ChevronRight size={18} /></button>)}</div>}</section>
    </section>
  );
}
