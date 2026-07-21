export type TechnicianRole = 'tecnico' | 'tecnico_externo';
export type TechnicianStatus = 'activo' | 'inactivo';

export type TechnicianWorkload = {
  assigned: number;
  inProgress: number;
  completed: number;
};

export type TechnicianRecord = {
  membershipId: string;
  tenantId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  role: TechnicianRole;
  status: TechnicianStatus;
  workload: TechnicianWorkload;
  lastActivityAt: string | null;
};

export type TechnicianInvitation = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  specialty: string | null;
  role: TechnicianRole;
  status: 'pendiente';
  expiresAt: string;
  token: string;
};

export type CreateTechnicianInvitationInput = {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  role: TechnicianRole;
  requireMfa: boolean;
};

export type CreatedTechnicianInvitation = {
  token: string;
  email: string;
};
