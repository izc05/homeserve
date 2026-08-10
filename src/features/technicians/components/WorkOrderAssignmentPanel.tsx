import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRightLeft, LoaderCircle, Send, UserPlus, UserRound, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabase';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import { canAssignWorkOrder } from '../../work-orders/api/workOrderAssignment';
import type { TechnicianOption } from '../../work-orders/api/workOrderCommands';
import {
  handoverWorkOrderResponsibility,
  listWorkOrderParticipants,
  setWorkOrderCollaborator,
} from '../../work-orders/api/workOrderTeamRepository';

type Props = {
  order: WorkOrderListItem;
  technicians: TechnicianOption[];
  busy: boolean;
  onAssign: (technicianId: string, reason: string | null) => void;
};

const TEAM_MUTABLE_STATES = ['BORRADOR', 'ASIGNADA', 'ACEPTADA', 'EN_CURSO', 'BLOQUEADA'];

function safeTeamError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : '';
  if (/^(No tienes permiso|No se pueden cambiar colaboradores|El colaborador|El técnico responsable|Indica el motivo|El responsable saliente|El técnico entrante|No se puede realizar un relevo)/i.test(message)) return message;
  return 'No se pudo actualizar el equipo técnico. Revisa los datos y vuelve a intentarlo.';
}

export default function WorkOrderAssignmentPanel({ order, technicians, busy, onAssign }: Props) {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const [technicianId, setTechnicianId] = useState(order.assignedTo ?? '');
  const [reason, setReason] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [collaboratorReason, setCollaboratorReason] = useState('');
  const [handoverId, setHandoverId] = useState('');
  const [handoverNote, setHandoverNote] = useState('');
  const [keepPrevious, setKeepPrevious] = useState(true);

  useEffect(() => setTechnicianId(order.assignedTo ?? ''), [order.assignedTo]);

  const participantsQuery = useQuery({
    queryKey: ['work-order-participants', order.id],
    queryFn: () => listWorkOrderParticipants(supabase, order.id),
    enabled: Boolean(order.id),
  });

  const activeParticipants = useMemo(
    () => (participantsQuery.data ?? []).filter((participant) => participant.status === 'activo'),
    [participantsQuery.data],
  );
  const responsible = activeParticipants.find((participant) => participant.role === 'responsable') ?? null;
  const collaborators = activeParticipants.filter((participant) => participant.role === 'colaborador');
  const activeIds = new Set(activeParticipants.map((participant) => participant.technicianId));
  const collaboratorOptions = technicians.filter((technician) => !activeIds.has(technician.id));
  const handoverOptions = technicians.filter((technician) => technician.id !== order.assignedTo);
  const canManageTeam = TEAM_MUTABLE_STATES.includes(order.status);

  const invalidateTeam = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['work-order-participants', order.id] }),
      queryClient.invalidateQueries({ queryKey: ['work-orders', order.tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-audit', order.tenantId] }),
    ]);
  };

  const collaboratorMutation = useMutation({
    mutationFn: (input: { technicianId: string; enabled: boolean; reason?: string | null }) => setWorkOrderCollaborator(supabase, {
      workOrderId: order.id,
      ...input,
    }),
    onSuccess: async () => {
      setCollaboratorId('');
      setCollaboratorReason('');
      await invalidateTeam();
    },
  });

  const handoverMutation = useMutation({
    mutationFn: () => handoverWorkOrderResponsibility(supabase, {
      workOrderId: order.id,
      nextTechnicianId: handoverId,
      note: handoverNote,
      keepPreviousAsCollaborator: keepPrevious,
    }),
    onSuccess: async () => {
      setHandoverId('');
      setHandoverNote('');
      await invalidateTeam();
    },
  });

  const assignmentVisible = canAssignWorkOrder(order.status);

  return <div className="administrative-evidence-stack">
    {assignmentVisible && <article className="panel assignment-panel">
      <div className="panel-heading"><div><h2>Asignación principal</h2><p>Define el técnico responsable antes de que la OT sea aceptada.</p></div><span className="source-badge">RPC segura</span></div>
      {technicians.length === 0 ? <p className="read-only-note"><AlertTriangle size={16} /> No hay técnicos activos disponibles para asignar.</p> : <div className="assignment-controls">
        <label>Técnico responsable<select onChange={(event) => setTechnicianId(event.target.value)} value={technicianId}><option value="">Seleccionar técnico</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}{technician.role === 'tecnico_externo' ? ' · Externo' : ''}</option>)}</select></label>
        {order.assignedTo && <label>Motivo de reasignación<input onChange={(event) => setReason(event.target.value)} placeholder="Indica el motivo" value={reason} /></label>}
        <button className="primary-button" disabled={busy || !technicianId || (Boolean(order.assignedTo && order.assignedTo !== technicianId) && !reason.trim())} onClick={() => onAssign(technicianId, reason.trim() || null)} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}{order.assignedTo ? 'Actualizar asignación' : 'Asignar y enviar'}</button>
      </div>}
    </article>}

    <article className="panel assignment-panel">
      <div className="panel-heading"><div><h2><UsersRound size={20} /> Equipo técnico</h2><p>Un responsable y los colaboradores que participan en esta OT.</p></div><span className="source-badge">OT-06</span></div>
      {participantsQuery.isLoading && <p className="read-only-note"><LoaderCircle className="spin" size={16} /> Cargando equipo técnico…</p>}
      {participantsQuery.error && <p className="form-global-error"><AlertTriangle size={16} /> No se pudo cargar el equipo técnico.</p>}
      {!participantsQuery.isLoading && !participantsQuery.error && <div className="day-plan-list">
        {responsible ? <div><UserRound size={18} /><span><strong>{responsible.technicianName}</strong><small>Responsable principal</small></span><span className="source-badge">Responsable</span></div> : <p className="empty-state">La OT todavía no tiene responsable.</p>}
        {collaborators.map((participant) => <div key={participant.id}><UsersRound size={18} /><span><strong>{participant.technicianName}</strong><small>{participant.reason || 'Colaborador activo'}</small></span>{canManageTeam && <button className="text-link" disabled={collaboratorMutation.isPending} onClick={() => collaboratorMutation.mutate({ technicianId: participant.technicianId, enabled: false, reason: 'Retirada desde gestión de equipo OT' })} type="button"><X size={15} /> Retirar</button>}</div>)}
      </div>}

      {canManageTeam && collaboratorOptions.length > 0 && <div className="assignment-controls">
        <label>Añadir colaborador<select onChange={(event) => setCollaboratorId(event.target.value)} value={collaboratorId}><option value="">Seleccionar técnico</option>{collaboratorOptions.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}{technician.role === 'tecnico_externo' ? ' · Externo' : ''}</option>)}</select></label>
        <label>Motivo / función<input onChange={(event) => setCollaboratorReason(event.target.value)} placeholder="Ej. apoyo eléctrico, climatización…" value={collaboratorReason} /></label>
        <button className="secondary-button" disabled={!collaboratorId || collaboratorMutation.isPending} onClick={() => collaboratorMutation.mutate({ technicianId: collaboratorId, enabled: true, reason: collaboratorReason.trim() || null })} type="button">{collaboratorMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <UserPlus size={17} />} Añadir colaborador</button>
      </div>}
      {collaboratorMutation.error && <p className="form-global-error"><AlertTriangle size={16} /> {safeTeamError(collaboratorMutation.error)}</p>}
    </article>

    {canManageTeam && order.assignedTo && <article className="panel assignment-panel">
      <div className="panel-heading"><div><h2><ArrowRightLeft size={20} /> Relevo de responsable</h2><p>Transfiere la responsabilidad sin perder visitas ni histórico.</p></div><span className="source-badge">Manager</span></div>
      <div className="assignment-controls">
        <label>Técnico entrante<select onChange={(event) => setHandoverId(event.target.value)} value={handoverId}><option value="">Seleccionar técnico</option>{handoverOptions.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}{technician.role === 'tecnico_externo' ? ' · Externo' : ''}</option>)}</select></label>
        <label>Nota de relevo<input onChange={(event) => setHandoverNote(event.target.value)} placeholder="Trabajo realizado, pendiente y siguiente acción" value={handoverNote} /></label>
        <label className="completion-confirmation"><input checked={keepPrevious} onChange={(event) => setKeepPrevious(event.target.checked)} type="checkbox" /><span>Mantener al responsable saliente como colaborador.</span></label>
        <button className="secondary-button" disabled={!handoverId || handoverNote.trim().length < 5 || handoverMutation.isPending} onClick={() => handoverMutation.mutate()} type="button">{handoverMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <ArrowRightLeft size={17} />} Realizar relevo</button>
      </div>
      {handoverMutation.error && <p className="form-global-error"><AlertTriangle size={16} /> {safeTeamError(handoverMutation.error)}</p>}
      {handoverMutation.isSuccess && <p className="read-only-note"><ArrowRightLeft size={16} /> Relevo registrado correctamente.</p>}
    </article>}
  </div>;
}
