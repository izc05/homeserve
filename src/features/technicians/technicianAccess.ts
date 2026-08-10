import { hasCapability } from '../../auth/capabilities';

export function isTechnicianRole(role: string): boolean {
  return hasCapability(role, 'technician_workspace.read');
}

export function canAccessTechnicianAdministration(role: string): boolean {
  return hasCapability(role, 'technicians.read');
}

export function canManageTechnicianInvitations(role: string): boolean {
  return hasCapability(role, 'technicians.invite');
}

export function visibleNavigationForRole(role: string): 'technician' | 'management' {
  return isTechnicianRole(role) ? 'technician' : 'management';
}
