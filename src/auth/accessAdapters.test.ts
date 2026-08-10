import { describe, expect, it } from 'vitest';
import {
  canAccessTechnicianAdministration,
  canManageTechnicianInvitations,
  isTechnicianRole,
  visibleNavigationForRole,
} from '../features/technicians/technicianAccess';
import {
  canAccessClientNavigation,
  canManageClientRecords,
} from '../features/clients/clientAccess';

describe('legacy access adapters backed by OT capabilities', () => {
  it('preserves technician role detection', () => {
    expect(isTechnicianRole('tecnico')).toBe(true);
    expect(isTechnicianRole('tecnico_externo')).toBe(true);
    expect(isTechnicianRole('admin_cliente')).toBe(false);
    expect(isTechnicianRole('coordinador')).toBe(false);
    expect(isTechnicianRole('cliente_lectura')).toBe(false);
    expect(isTechnicianRole('unknown')).toBe(false);
  });

  it('preserves technician administration access', () => {
    expect(canAccessTechnicianAdministration('admin_cliente')).toBe(true);
    expect(canAccessTechnicianAdministration('coordinador')).toBe(true);
    expect(canAccessTechnicianAdministration('tecnico')).toBe(false);
    expect(canAccessTechnicianAdministration('tecnico_externo')).toBe(false);
    expect(canAccessTechnicianAdministration('cliente_lectura')).toBe(false);
  });

  it('keeps technician invitations admin-only', () => {
    expect(canManageTechnicianInvitations('admin_cliente')).toBe(true);
    expect(canManageTechnicianInvitations('coordinador')).toBe(false);
    expect(canManageTechnicianInvitations('tecnico')).toBe(false);
  });

  it('preserves client access and admin-only client mutation', () => {
    expect(canAccessClientNavigation('admin_cliente')).toBe(true);
    expect(canAccessClientNavigation('coordinador')).toBe(true);
    expect(canAccessClientNavigation('tecnico')).toBe(false);
    expect(canAccessClientNavigation('cliente_lectura')).toBe(false);

    expect(canManageClientRecords('admin_cliente')).toBe(true);
    expect(canManageClientRecords('coordinador')).toBe(false);
    expect(canManageClientRecords('tecnico')).toBe(false);
  });

  it('keeps the legacy navigation helper behavior', () => {
    expect(visibleNavigationForRole('tecnico')).toBe('technician');
    expect(visibleNavigationForRole('tecnico_externo')).toBe('technician');
    expect(visibleNavigationForRole('admin_cliente')).toBe('management');
    expect(visibleNavigationForRole('coordinador')).toBe('management');
    expect(visibleNavigationForRole('cliente_lectura')).toBe('management');
    expect(visibleNavigationForRole('unknown')).toBe('management');
  });
});
