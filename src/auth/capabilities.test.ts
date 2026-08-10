import { describe, expect, it } from 'vitest';
import {
  capabilitiesForRole,
  hasCapability,
  LEGACY_ROLE_CAPABILITIES,
  type LegacyOtRole,
  type OtCapability,
} from './capabilities';

const expectedCapabilities: Record<LegacyOtRole, readonly OtCapability[]> = {
  admin_cliente: [
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
  ],
  coordinador: [
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
  ],
  tecnico: [
    'work_orders.read',
    'work_orders.execute',
    'technician_workspace.read',
  ],
  tecnico_externo: [
    'work_orders.read',
    'work_orders.execute',
    'technician_workspace.read',
  ],
  cliente_lectura: [
    'dashboard.read',
    'work_orders.read',
    'planning.read',
  ],
};

describe('legacy OT role capability parity', () => {
  it.each(Object.entries(expectedCapabilities) as Array<[LegacyOtRole, readonly OtCapability[]]>) (
    'keeps the exact expected capabilities for %s',
    (role, expected) => {
      expect(capabilitiesForRole(role)).toEqual(expected);
      expect(LEGACY_ROLE_CAPABILITIES[role]).toEqual(expected);
    },
  );

  it('keeps user management, client management and technician invitations admin-only', () => {
    expect(hasCapability('admin_cliente', 'users.manage')).toBe(true);
    expect(hasCapability('admin_cliente', 'clients.manage')).toBe(true);
    expect(hasCapability('admin_cliente', 'technicians.invite')).toBe(true);

    expect(hasCapability('coordinador', 'users.manage')).toBe(false);
    expect(hasCapability('coordinador', 'clients.manage')).toBe(false);
    expect(hasCapability('coordinador', 'technicians.invite')).toBe(false);
  });

  it('keeps installation evidence, location and system management available to admin and coordinator', () => {
    for (const role of ['admin_cliente', 'coordinador'] as const) {
      expect(hasCapability(role, 'installations.evidence.manage')).toBe(true);
      expect(hasCapability(role, 'installations.locations.manage')).toBe(true);
      expect(hasCapability(role, 'installations.systems.manage')).toBe(true);
    }

    expect(hasCapability('tecnico', 'installations.evidence.manage')).toBe(false);
    expect(hasCapability('tecnico', 'installations.locations.manage')).toBe(false);
    expect(hasCapability('tecnico', 'installations.systems.manage')).toBe(false);
    expect(hasCapability('cliente_lectura', 'installations.evidence.manage')).toBe(false);
    expect(hasCapability('cliente_lectura', 'installations.locations.manage')).toBe(false);
    expect(hasCapability('cliente_lectura', 'installations.systems.manage')).toBe(false);
  });

  it('keeps operational management available to admin and coordinator', () => {
    for (const role of ['admin_cliente', 'coordinador'] as const) {
      expect(hasCapability(role, 'work_orders.create')).toBe(true);
      expect(hasCapability(role, 'work_orders.assign')).toBe(true);
      expect(hasCapability(role, 'work_orders.review')).toBe(true);
      expect(hasCapability(role, 'work_orders.validate')).toBe(true);
      expect(hasCapability(role, 'work_orders.cancel')).toBe(true);
      expect(hasCapability(role, 'work_order_templates.manage')).toBe(true);
    }
  });

  it('keeps work-order execution technician-only in the UI compatibility layer', () => {
    expect(hasCapability('tecnico', 'work_orders.execute')).toBe(true);
    expect(hasCapability('tecnico_externo', 'work_orders.execute')).toBe(true);
    expect(hasCapability('admin_cliente', 'work_orders.execute')).toBe(false);
    expect(hasCapability('coordinador', 'work_orders.execute')).toBe(false);
  });

  it('keeps read-only client on dashboard, work orders and planning only', () => {
    expect(capabilitiesForRole('cliente_lectura')).toEqual([
      'dashboard.read',
      'work_orders.read',
      'planning.read',
    ]);
    expect(hasCapability('cliente_lectura', 'reports.read')).toBe(false);
    expect(hasCapability('cliente_lectura', 'clients.read')).toBe(false);
    expect(hasCapability('cliente_lectura', 'work_orders.create')).toBe(false);
  });

  it('denies every capability to unknown, empty or missing roles', () => {
    for (const role of ['super_admin', 'owner', '', null, undefined]) {
      expect(capabilitiesForRole(role)).toEqual([]);
      expect(hasCapability(role, 'work_orders.create')).toBe(false);
      expect(hasCapability(role, 'users.manage')).toBe(false);
      expect(hasCapability(role, 'work_orders.execute')).toBe(false);
      expect(hasCapability(role, 'installations.locations.manage')).toBe(false);
      expect(hasCapability(role, 'installations.systems.manage')).toBe(false);
    }
  });
});
