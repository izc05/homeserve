export function canAccessClientNavigation(role: string): boolean {
  return role === 'admin_cliente' || role === 'coordinador';
}

export function canManageClientRecords(role: string): boolean {
  return role === 'admin_cliente';
}
