import { getSupabaseClient } from '../../../lib/supabase';
import type { CreateTechnicianInvitationInput, TechnicianStatus } from '../types/technician';
import {
  createTechnicianInvitation,
  listPendingTechnicianInvitations,
  listTechnicians,
  revokeTechnicianInvitation,
  setTechnicianStatus,
} from './technicianRepository';

export const techniciansService = {
  list: (tenantId: string) => listTechnicians(getSupabaseClient(), tenantId),
  invitations: (tenantId: string) => listPendingTechnicianInvitations(getSupabaseClient(), tenantId),
  invite: (input: CreateTechnicianInvitationInput) => createTechnicianInvitation(getSupabaseClient(), input),
  setStatus: (tenantId: string, membershipId: string, status: TechnicianStatus) => setTechnicianStatus(getSupabaseClient(), tenantId, membershipId, status),
  revokeInvitation: (tenantId: string, invitationId: string) => revokeTechnicianInvitation(getSupabaseClient(), tenantId, invitationId),
};
