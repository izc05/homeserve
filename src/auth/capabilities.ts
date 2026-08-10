export const LEGACY_OT_ROLES = [
  'admin_cliente',
  'coordinador',
  'tecnico',
  'tecnico_externo',
  'cliente_lectura',
] as const;

export type LegacyOtRole = (typeof LEGACY_OT_ROLES)[number];

export const OT_CAPABILITIES = [
  'dashboard.read',
  'work_orders.read',
  'work_orders.create',
  'work_orders.assign',
  'work_orders.execute',
  'work_orders.review',
  'work_orders.validate',
  'work_orders.cancel',
  'work_orders.audit.read',
  'planning.read',
  'planning.manage',
  'technician_workspace.read',
  'technicians.read',
  'technicians.invite',
  'clients.read',
  'clients.manage',
  'installations.evidence.manage',
  'installations.locations.manage',
  'installations.systems.manage',
  'reports.read',
  'work_order_templates.read',
  'work_order_templates.manage',
  'users.manage',
] as const;

export type OtCapability = (typeof OT_CAPABILITIES)[number];

const ADMIN_CAPABILITIES = [
  'dashboard.read',
  'work_orders.read',
  'work_orders.create',
  'work_orders.assign',
  'work_orders.review',
  'work_orders.validate',
  'work_orders.cancel',
  'work_orders.audit.read',
  'planning.read',
  'planning.manage',
  'technicians.read',
  'technicians.invite',
  'clients.read',
  'clients.manage',
  'installations.evidence.manage',
  'installations.locations.manage',
  'installations.systems.manage',
  'reports.read',
  'work_order_templates.read',
  'work_order_templates.manage',
  'users.manage',
] as const satisfies readonly OtCapability[];

const COORDINATOR_CAPABILITIES = [
  'dashboard.read',
  'work_orders.read',
  'work_orders.create',
  'work_orders.assign',
  'work_orders.review',
  'work_orders.validate',
  'work_orders.cancel',
  'work_orders.audit.read',
  'planning.read',
  'planning.manage',
  'technicians.read',
  'clients.read',
  'installations.evidence.manage',
  'installations.locations.manage',
  'installations.systems.manage',
  'reports.read',
  'work_order_templates.read',
  'work_order_templates.manage',
] as const satisfies readonly OtCapability[];

const TECHNICIAN_CAPABILITIES = [
  'work_orders.read',
  'work_orders.execute',
  'technician_workspace.read',
] as const satisfies readonly OtCapability[];

const READ_ONLY_CLIENT_CAPABILITIES = [
  'dashboard.read',
  'work_orders.read',
  'planning.read',
] as const satisfies readonly OtCapability[];

export const LEGACY_ROLE_CAPABILITIES: Readonly<Record<LegacyOtRole, readonly OtCapability[]>> = {
  admin_cliente: ADMIN_CAPABILITIES,
  coordinador: COORDINATOR_CAPABILITIES,
  tecnico: TECHNICIAN_CAPABILITIES,
  tecnico_externo: TECHNICIAN_CAPABILITIES,
  cliente_lectura: READ_ONLY_CLIENT_CAPABILITIES,
};

export function isLegacyOtRole(role: string | null | undefined): role is LegacyOtRole {
  return Boolean(role) && (LEGACY_OT_ROLES as readonly string[]).includes(role as string);
}

export function capabilitiesForRole(role: string | null | undefined): readonly OtCapability[] {
  if (!isLegacyOtRole(role)) return [];
  return LEGACY_ROLE_CAPABILITIES[role];
}

export function hasCapability(
  role: string | null | undefined,
  capability: OtCapability,
): boolean {
  return capabilitiesForRole(role).includes(capability);
}
