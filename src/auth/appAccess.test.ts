import { describe, expect, it } from 'vitest';
import { appAccessForRole } from './appAccess';

describe('OT application access profile', () => {
  it('keeps full operational management for admin without technician execution', () => {
    const access = appAccessForRole('admin_cliente');

    expect(access).toMatchObject({
      technicianMode: false,
      canReadDashboard: true,
      canReadWorkOrders: true,
      canReadPlanning: true,
      canReadTechnicians: true,
      canInviteTechnicians: true,
      canReadClients: true,
      canManageClients: true,
      canReadReports: true,
      canReadAudit: true,
      canManageTemplates: true,
      canCreateWorkOrders: true,
      canAssignWorkOrders: true,
      canExecuteWorkOrders: false,
      canReviewWorkOrders: true,
      canValidateWorkOrders: true,
      canCancelWorkOrders: true,
      canManageUsers: true,
    });
  });

  it('keeps coordinator operational management but not admin-only functions', () => {
    const access = appAccessForRole('coordinador');

    expect(access.canCreateWorkOrders).toBe(true);
    expect(access.canAssignWorkOrders).toBe(true);
    expect(access.canReviewWorkOrders).toBe(true);
    expect(access.canValidateWorkOrders).toBe(true);
    expect(access.canCancelWorkOrders).toBe(true);
    expect(access.canManageTemplates).toBe(true);
    expect(access.canReadClients).toBe(true);
    expect(access.canReadTechnicians).toBe(true);

    expect(access.canInviteTechnicians).toBe(false);
    expect(access.canManageClients).toBe(false);
    expect(access.canManageUsers).toBe(false);
    expect(access.canExecuteWorkOrders).toBe(false);
  });

  it.each(['tecnico', 'tecnico_externo'])('keeps %s in technician-only mode', (role) => {
    const access = appAccessForRole(role);

    expect(access.technicianMode).toBe(true);
    expect(access.canReadWorkOrders).toBe(true);
    expect(access.canExecuteWorkOrders).toBe(true);
    expect(access.canCreateWorkOrders).toBe(false);
    expect(access.canAssignWorkOrders).toBe(false);
    expect(access.canReviewWorkOrders).toBe(false);
    expect(access.canReadClients).toBe(false);
    expect(access.canReadTechnicians).toBe(false);
    expect(access.canManageUsers).toBe(false);
  });

  it('keeps read-only client on dashboard, work orders and planning', () => {
    expect(appAccessForRole('cliente_lectura')).toMatchObject({
      technicianMode: false,
      canReadDashboard: true,
      canReadWorkOrders: true,
      canReadPlanning: true,
      canReadTechnicians: false,
      canReadClients: false,
      canReadReports: false,
      canReadAudit: false,
      canCreateWorkOrders: false,
      canManageTemplates: false,
      canManageUsers: false,
    });
  });

  it('denies all access to unknown roles', () => {
    const access = appAccessForRole('future-platform-role');
    expect(Object.values(access).every((value) => value === false)).toBe(true);
  });
});
