import { hasCapability } from './capabilities';

export type OtAppAccess = {
  technicianMode: boolean;
  canReadDashboard: boolean;
  canReadWorkOrders: boolean;
  canReadPlanning: boolean;
  canReadTechnicians: boolean;
  canInviteTechnicians: boolean;
  canReadClients: boolean;
  canManageClients: boolean;
  canReadReports: boolean;
  canReadAudit: boolean;
  canReadTemplates: boolean;
  canManageTemplates: boolean;
  canCreateWorkOrders: boolean;
  canAssignWorkOrders: boolean;
  canExecuteWorkOrders: boolean;
  canReviewWorkOrders: boolean;
  canValidateWorkOrders: boolean;
  canCancelWorkOrders: boolean;
  canManageUsers: boolean;
};

export function appAccessForRole(role: string | null | undefined): OtAppAccess {
  return {
    technicianMode: hasCapability(role, 'technician_workspace.read'),
    canReadDashboard: hasCapability(role, 'dashboard.read'),
    canReadWorkOrders: hasCapability(role, 'work_orders.read'),
    canReadPlanning: hasCapability(role, 'planning.read'),
    canReadTechnicians: hasCapability(role, 'technicians.read'),
    canInviteTechnicians: hasCapability(role, 'technicians.invite'),
    canReadClients: hasCapability(role, 'clients.read'),
    canManageClients: hasCapability(role, 'clients.manage'),
    canReadReports: hasCapability(role, 'reports.read'),
    canReadAudit: hasCapability(role, 'work_orders.audit.read'),
    canReadTemplates: hasCapability(role, 'work_order_templates.read'),
    canManageTemplates: hasCapability(role, 'work_order_templates.manage'),
    canCreateWorkOrders: hasCapability(role, 'work_orders.create'),
    canAssignWorkOrders: hasCapability(role, 'work_orders.assign'),
    canExecuteWorkOrders: hasCapability(role, 'work_orders.execute'),
    canReviewWorkOrders: hasCapability(role, 'work_orders.review'),
    canValidateWorkOrders: hasCapability(role, 'work_orders.validate'),
    canCancelWorkOrders: hasCapability(role, 'work_orders.cancel'),
    canManageUsers: hasCapability(role, 'users.manage'),
  };
}
