export function isTechnicianRole(role: string): boolean {
  return role === 'tecnico' || role === 'tecnico_externo';
}

export function canAccessTechnicianAdministration(role: string): boolean {
  return role === 'admin_cliente' || role === 'coordinador';
}

export function canManageTechnicianInvitations(role: string): boolean {
  return role === 'admin_cliente';
}

export function visibleNavigationForRole(role: string): 'technician' | 'management' {
  return isTechnicianRole(role) ? 'technician' : 'management';
}
