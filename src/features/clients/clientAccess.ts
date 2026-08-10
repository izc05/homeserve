import { hasCapability } from '../../auth/capabilities';

export function canAccessClientNavigation(role: string): boolean {
  return hasCapability(role, 'clients.read');
}

export function canManageClientRecords(role: string): boolean {
  return hasCapability(role, 'clients.manage');
}
