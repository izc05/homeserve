import { AlertTriangle, ArrowLeft, BriefcaseBusiness, Check, Copy, LoaderCircle, Mail, Phone, Plus, Power, RefreshCw, UserRound, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { filterTechnicians, friendlyTechnicianError } from '../api/technicianRepository';
import TechnicianInvitationForm from '../components/TechnicianInvitationForm';
import { useTechnicians } from '../hooks/useTechnicians';
import type { TechnicianInvitationFormValues } from '../schemas/technicianSchemas';
import type { CreatedTechnicianInvitation, TechnicianRecord, TechnicianStatus } from '../types/technician';

type Props = {
  tenantId: string;
  canManageInvitations: boolean;
  onCreateWorkOrder: (technician: TechnicianRecord) => void;
};

function roleLabel(role: TechnicianRecord['role']) {
  return role === 'tecnico_externo' ? 'Técnico externo' : 'Técnico';
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin actividad';
}

function invitationUrl(invitation: Pick<CreatedTechnicianInvitation, 'token' | 'email'>) {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set('invite', invitation.token);
  url.searchParams.set('email', invitation.email);
  return url.toString();
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function TechniciansWorkspace({ tenantId, canManageInvitations, onCreateWorkOrder }: Props) {
  const { techniciansQuery, invitationsQuery, inviteMutation, statusMutation, revokeMutation } = useTechnicians(tenantId, canManageInvitations);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todos' | TechnicianStatus>('todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<CreatedTechnicianInvitation | null>(null);
  const [copied, setCopied] = useState('');
  const [actionError, setActionError] = useState('');
  const technicians = useMemo(() => techniciansQuery.data ?? [], [techniciansQuery.data]);
  const filtered = useMemo(() => filterTechnicians(technicians, search, status), [technicians, search, status]);
  const selected = technicians.find((technician) => technician.userId === selectedId) ?? null;

  const invite = async (values: TechnicianInvitationFormValues) => {
    try {
      const created = await inviteMutation.mutateAsync(values);
      setCreatedInvitation(created);
      setInviteOpen(false);
    } catch (error) {
      throw new Error(friendlyTechnicianError(error, 'No se pudo crear la invitación.'));
    }
  };
  const toggleStatus = async (technician: TechnicianRecord) => {
    const nextStatus: TechnicianStatus = technician.status === 'activo' ? 'inactivo' : 'activo';
    if (!window.confirm(`${nextStatus === 'activo' ? 'Activar' : 'Desactivar'} a ${technician.name}? El historial de OT se conservará.`)) return;
    try {
      await statusMutation.mutateAsync({ membershipId: technician.membershipId, status: nextStatus });
    } catch (error) {
      window.alert(friendlyTechnicianError(error, 'No se pudo cambiar el estado del técnico.'));
    }
  };
  const revokeInvitation = async (invitationId: string) => {
    if (!window.confirm('¿Revocar esta invitación? El enlace dejará de ser válido.')) return;
    setActionError('');
    try {
      await revokeMutation.mutateAsync(invitationId);
    } catch (error) {
      setActionError(friendlyTechnicianError(error, 'No se pudo revocar la invitación.'));
    }
  };
  const copyInvitation = async (key: string, token: string, email: string) => {
    try {
      await copyText(invitationUrl({ token, email }));
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      window.alert('No se pudo copiar el enlace. Selecciónalo manualmente e inténtalo de nuevo.');
    }
  };

  if (techniciansQuery.isLoading) return <section className="panel data-state"><LoaderCircle className="spin" size={30} /><strong>Cargando técnicos…</strong></section>;
  if (techniciansQuery.error) return <section className="panel data-state error-state"><AlertTriangle size={30} /><strong>No se pudieron cargar los técnicos</strong><p>Comprueba tu conexión o los permisos de la organización.</p><button className="secondary-button" onClick={() => void techniciansQuery.refetch()} type="button"><RefreshCw size={17} /> Reintentar</button></section>;

  if (selected) return <section className="technicians-workspace">
    <div className="page-heading"><button className="text-link" onClick={() => setSelectedId(null)} type="button"><ArrowLeft size={16} /> Técnicos</button><span className="section-kicker">Ficha técnica</span><h1>{selected.name}</h1><p>{roleLabel(selected.role)} · {selected.status === 'activo' ? 'Activo' : 'Inactivo'}</p></div>
    <div className="technician-action-bar"><button className="primary-button" disabled={selected.status !== 'activo'} onClick={() => onCreateWorkOrder(selected)} type="button"><Plus size={17} /> Nueva OT</button>{canManageInvitations && <button className="secondary-button" disabled={statusMutation.isPending} onClick={() => void toggleStatus(selected)} type="button"><Power size={17} /> {selected.status === 'activo' ? 'Desactivar' : 'Activar'}</button>}</div>
    <div className="technician-detail-grid">
      <article className="panel"><div className="panel-heading"><h2>Contacto y perfil</h2></div><dl className="technician-data"><div><dt>Correo</dt><dd>{selected.email || 'Sin correo'}</dd></div><div><dt>Teléfono</dt><dd>{selected.phone || 'Sin teléfono'}</dd></div><div><dt>Especialidad</dt><dd>{selected.specialty || 'Sin especialidad'}</dd></div><div><dt>Última actividad</dt><dd>{dateLabel(selected.lastActivityAt)}</dd></div></dl></article>
      <article className="panel"><div className="panel-heading"><h2>Carga de trabajo</h2></div><div className="technician-load-grid"><span><strong>{selected.workload.assigned}</strong>Asignadas</span><span><strong>{selected.workload.inProgress}</strong>En curso</span><span><strong>{selected.workload.completed}</strong>Finalizadas</span></div></article>
    </div>
  </section>;

  return <section className="technicians-workspace">
    <div className="page-heading page-heading-row"><div><span className="section-kicker">Equipo operativo</span><h1>Técnicos</h1><p>Carga real, disponibilidad y acceso de los técnicos de la organización.</p></div>{canManageInvitations && <button className="primary-button" onClick={() => setInviteOpen((open) => !open)} type="button"><Plus size={17} /> Invitar técnico</button>}</div>
    {inviteOpen && canManageInvitations && <article className="panel technician-invite-panel"><div className="panel-heading"><h2>Nueva invitación</h2><button className="icon-button" aria-label="Cerrar invitación" onClick={() => setInviteOpen(false)} type="button"><X size={17} /></button></div><TechnicianInvitationForm onSubmit={invite} /></article>}
    {createdInvitation && <article className="technician-invitation-ready"><Check size={19} /><span><strong>Invitación creada</strong><small>{createdInvitation.email}</small></span><input aria-label="Enlace de invitación" readOnly value={invitationUrl(createdInvitation)} /><button className="secondary-button" onClick={() => void copyInvitation('created', createdInvitation.token, createdInvitation.email)} type="button"><Copy size={16} /> {copied === 'created' ? 'Copiado' : 'Copiar enlace'}</button></article>}
    <div className="technician-toolbar"><label className="client-search"><span>Buscar</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, correo, teléfono o especialidad" value={search} /></label><label><span>Estado</span><select onChange={(event) => setStatus(event.target.value as 'todos' | TechnicianStatus)} value={status}><option value="todos">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label></div>
    <section className="panel technician-list-panel"><div className="panel-heading"><h2>Equipo técnico</h2><span className="source-badge">{filtered.length}</span></div>{filtered.length === 0 ? <div className="client-empty-state"><UserRound size={28} /><strong>No hay técnicos que coincidan</strong><p>Prueba otro filtro o invita al primer técnico de la organización.</p></div> : <div className="technician-list">{filtered.map((technician) => <button className="technician-row" key={technician.userId} onClick={() => setSelectedId(technician.userId)} type="button"><span className="technician-avatar">{technician.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{technician.name}</strong><small>{technician.specialty || roleLabel(technician.role)}</small></span><span><Mail size={14} />{technician.email || 'Sin correo'}<small><Phone size={13} />{technician.phone || 'Sin teléfono'}</small></span><span className="technician-load"><b>{technician.workload.assigned}</b><small>asignadas</small></span><span className="technician-load"><b>{technician.workload.inProgress}</b><small>en curso</small></span><span className={`client-status ${technician.status}`}>{technician.status === 'activo' ? 'Activo' : 'Inactivo'}</span></button>)}</div>}</section>
    {canManageInvitations && <section className="panel technician-invitations-panel"><div className="panel-heading"><h2>Invitaciones pendientes</h2><span className="source-badge">{invitationsQuery.data?.length ?? 0}</span></div>{actionError && <p className="form-global-error"><AlertTriangle size={17} />{actionError}</p>}{invitationsQuery.isLoading ? <p className="empty-state">Cargando invitaciones…</p> : invitationsQuery.error ? <div className="client-empty-state"><AlertTriangle size={25} /><strong>No se pudieron cargar las invitaciones</strong><p>Comprueba la conexión o los permisos y vuelve a intentarlo.</p><button className="secondary-button" onClick={() => void invitationsQuery.refetch()} type="button"><RefreshCw size={16} /> Reintentar</button></div> : invitationsQuery.data?.length ? <div className="pending-invitations">{invitationsQuery.data.map((invitation) => <article key={invitation.id}><BriefcaseBusiness size={18} /><span><strong>{invitation.name || invitation.email}</strong><small>{invitation.email} · {invitation.specialty || roleLabel(invitation.role)}</small></span><button className="secondary-button" onClick={() => void copyInvitation(invitation.id, invitation.token, invitation.email)} type="button"><Copy size={15} /> {copied === invitation.id ? 'Copiado' : 'Copiar'}</button><button className="icon-button" aria-label={`Revocar invitación de ${invitation.email}`} disabled={revokeMutation.isPending} onClick={() => void revokeInvitation(invitation.id)} type="button"><X size={16} /></button></article>)}</div> : <p className="empty-state">No hay invitaciones pendientes y vigentes.</p>}</section>}
  </section>;
}
