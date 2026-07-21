import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateTechnicianInvitationInput,
  CreatedTechnicianInvitation,
  TechnicianInvitation,
  TechnicianRecord,
  TechnicianRole,
  TechnicianStatus,
  TechnicianWorkload,
} from '../types/technician';

type MemberRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TechnicianRole;
  estado: TechnicianStatus;
  especialidad: string | null;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
};

type WorkOrderRow = {
  assigned_to: string | null;
  estado: string;
  updated_at: string;
};

type InvitationRow = {
  id: string;
  nombre: string | null;
  email: string;
  telefono: string | null;
  especialidad: string | null;
  role: TechnicianRole;
  estado: string;
  expires_at: string;
  invitation_token: string;
};

const TECHNICIAN_ROLES: TechnicianRole[] = ['tecnico', 'tecnico_externo'];
const ASSIGNED_STATUSES = new Set(['ASIGNADA', 'ACEPTADA']);
const IN_PROGRESS_STATUSES = new Set(['EN_CURSO', 'BLOQUEADA']);
const COMPLETED_STATUSES = new Set(['FINALIZADA_TECNICO', 'VALIDADA']);

export function calculateTechnicianWorkload(rows: WorkOrderRow[], userId: string): TechnicianWorkload {
  const ownRows = rows.filter((row) => row.assigned_to === userId);
  return {
    assigned: ownRows.filter((row) => ASSIGNED_STATUSES.has(row.estado)).length,
    inProgress: ownRows.filter((row) => IN_PROGRESS_STATUSES.has(row.estado)).length,
    completed: ownRows.filter((row) => COMPLETED_STATUSES.has(row.estado)).length,
  };
}

export function isAssignableTechnician(technician: Pick<TechnicianRecord, 'role' | 'status'>): boolean {
  return technician.status === 'activo' && TECHNICIAN_ROLES.includes(technician.role);
}

export function mapTechnician(
  member: MemberRow,
  profile: ProfileRow | undefined,
  orders: WorkOrderRow[],
): TechnicianRecord {
  const ownActivity = orders
    .filter((order) => order.assigned_to === member.user_id)
    .map((order) => order.updated_at)
    .sort((left, right) => right.localeCompare(left))[0];
  return {
    membershipId: String(member.id),
    tenantId: String(member.tenant_id),
    userId: String(member.user_id),
    name: profile?.nombre?.trim() || 'Técnico sin nombre',
    email: profile?.email?.trim() || '',
    phone: profile?.telefono?.trim() || null,
    specialty: member.especialidad?.trim() || null,
    role: member.role,
    status: member.estado,
    workload: calculateTechnicianWorkload(orders, member.user_id),
    lastActivityAt: ownActivity ?? member.updated_at ?? null,
  };
}

export function filterTechnicians(
  technicians: TechnicianRecord[],
  search: string,
  status: 'todos' | TechnicianStatus,
): TechnicianRecord[] {
  const term = search.trim().toLocaleLowerCase('es-ES');
  return technicians.filter((technician) => {
    if (status !== 'todos' && technician.status !== status) return false;
    if (!term) return true;
    return [technician.name, technician.email, technician.phone, technician.specialty]
      .some((value) => value?.toLocaleLowerCase('es-ES').includes(term));
  });
}

export function toDetailedInvitationRpcArgs(input: CreateTechnicianInvitationInput): Record<string, unknown> {
  return {
    tenant_uuid: input.tenantId,
    invite_email: input.email.trim().toLocaleLowerCase('es-ES'),
    invite_role: input.role,
    require_mfa: input.requireMfa,
    invite_name: input.name.trim(),
    invite_phone: input.phone.trim() || null,
    invite_specialty: input.specialty.trim() || null,
  };
}

export function friendlyTechnicianError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.toLocaleLowerCase('es-ES');
  if (message.includes('permission') || message.includes('permiso') || message.includes('row-level security')) return 'No tienes permiso para realizar esta acción.';
  if (message.includes('network') || message.includes('fetch')) return 'No hay conexión con el servidor. Comprueba la red y vuelve a intentarlo.';
  if (message.includes('duplicate') || message.includes('unique')) return 'Ya existe una invitación o membresía para ese correo.';
  return fallback;
}

export async function listTechnicians(supabase: SupabaseClient, tenantId: string): Promise<TechnicianRecord[]> {
  const [membersResult, ordersResult] = await Promise.all([
    supabase.from('tenant_members').select('id,tenant_id,user_id,role,estado,especialidad,updated_at').eq('tenant_id', tenantId).in('role', TECHNICIAN_ROLES).order('created_at'),
    supabase.from('ordenes_trabajo').select('assigned_to,estado,updated_at').eq('tenant_id', tenantId).is('deleted_at', null),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (ordersResult.error) throw ordersResult.error;

  const members = (membersResult.data ?? []) as unknown as MemberRow[];
  const userIds = members.map((member) => member.user_id);
  let profiles: ProfileRow[] = [];
  if (userIds.length > 0) {
    const profileResult = await supabase.from('profiles').select('id,nombre,email,telefono').in('id', userIds);
    if (profileResult.error) throw profileResult.error;
    profiles = (profileResult.data ?? []) as unknown as ProfileRow[];
  }
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const orders = (ordersResult.data ?? []) as unknown as WorkOrderRow[];
  return members.map((member) => mapTechnician(member, profileMap.get(member.user_id), orders));
}

export async function listPendingTechnicianInvitations(supabase: SupabaseClient, tenantId: string): Promise<TechnicianInvitation[]> {
  const { data, error } = await supabase
    .from('tenant_invitations')
    .select('id,nombre,email,telefono,especialidad,role,estado,expires_at,invitation_token')
    .eq('tenant_id', tenantId)
    .eq('estado', 'pendiente')
    .in('role', TECHNICIAN_ROLES)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as InvitationRow[]).map((row) => ({
    id: String(row.id),
    name: row.nombre?.trim() || null,
    email: String(row.email),
    phone: row.telefono?.trim() || null,
    specialty: row.especialidad?.trim() || null,
    role: row.role,
    status: 'pendiente',
    expiresAt: String(row.expires_at),
    token: String(row.invitation_token),
  }));
}

export async function createTechnicianInvitation(
  supabase: SupabaseClient,
  input: CreateTechnicianInvitationInput,
): Promise<CreatedTechnicianInvitation> {
  const { data, error } = await supabase.rpc('create_tenant_invitation_with_details', toDetailedInvitationRpcArgs(input));
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { invitation_token?: string } | null;
  if (!row?.invitation_token) throw new Error('La invitación se creó sin devolver un token válido.');
  return { token: String(row.invitation_token), email: input.email.trim().toLocaleLowerCase('es-ES') };
}

export async function setTechnicianStatus(
  supabase: SupabaseClient,
  tenantId: string,
  membershipId: string,
  status: TechnicianStatus,
): Promise<void> {
  const { data, error } = await supabase
    .from('tenant_members')
    .update({ estado: status })
    .eq('tenant_id', tenantId)
    .eq('id', membershipId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No se encontró la membresía o no tienes permiso para modificarla.');
}

export async function revokeTechnicianInvitation(
  supabase: SupabaseClient,
  tenantId: string,
  invitationId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('tenant_invitations')
    .update({ estado: 'cancelada' })
    .eq('tenant_id', tenantId)
    .eq('id', invitationId)
    .eq('estado', 'pendiente')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('La invitación ya no está pendiente o no tienes permiso para revocarla.');
}
