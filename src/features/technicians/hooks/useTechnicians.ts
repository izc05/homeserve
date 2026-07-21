import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { techniciansService } from '../api/techniciansService';
import type { CreateTechnicianInvitationInput, TechnicianStatus } from '../types/technician';

export function useTechnicians(tenantId: string, canManageInvitations: boolean) {
  const queryClient = useQueryClient();
  const techniciansQuery = useQuery({
    queryKey: ['technicians', tenantId],
    queryFn: () => techniciansService.list(tenantId),
    enabled: Boolean(tenantId),
  });
  const invitationsQuery = useQuery({
    queryKey: ['technician-invitations', tenantId],
    queryFn: () => techniciansService.invitations(tenantId),
    enabled: Boolean(tenantId && canManageInvitations),
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['technicians', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['technician-invitations', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] }),
    ]);
  };
  const inviteMutation = useMutation({
    mutationFn: (input: Omit<CreateTechnicianInvitationInput, 'tenantId'>) => techniciansService.invite({ tenantId, ...input }),
    onSuccess: refresh,
  });
  const statusMutation = useMutation({
    mutationFn: ({ membershipId, status }: { membershipId: string; status: TechnicianStatus }) => techniciansService.setStatus(tenantId, membershipId, status),
    onSuccess: refresh,
  });
  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) => techniciansService.revokeInvitation(tenantId, invitationId),
    onSuccess: refresh,
  });
  return { techniciansQuery, invitationsQuery, inviteMutation, statusMutation, revokeMutation };
}
