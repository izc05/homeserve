import { describe, expect, it } from 'vitest';
import appSource from '../App.tsx?raw';
import authAppSource from '../AuthApp.tsx?raw';

const appCapabilities = [
  "hasCapability(viewerRole, 'work_orders.create')",
  "hasCapability(viewerRole, 'work_orders.assign')",
  "hasCapability(viewerRole, 'work_orders.review')",
  "hasCapability(viewerRole, 'work_orders.validate')",
  "hasCapability(viewerRole, 'work_orders.cancel')",
  "hasCapability(viewerRole, 'work_orders.audit.read')",
  "hasCapability(viewerRole, 'work_order_templates.manage')",
  "hasCapability(viewerRole, 'installations.evidence.manage')",
] as const;

describe('capability consumers', () => {
  it('keeps App decisions on explicit capabilities', () => {
    for (const capabilityCheck of appCapabilities) {
      expect(appSource).toContain(capabilityCheck);
    }
  });

  it('does not restore the legacy manager role check in App', () => {
    expect(appSource).not.toContain("['admin_cliente', 'coordinador'].includes(role)");
    expect(appSource).not.toContain('function isManagerRole');
  });

  it('keeps user management on users.manage', () => {
    expect(authAppSource).toContain("hasCapability(role, 'users.manage')");
    expect(authAppSource).not.toContain("role === 'admin_cliente'");
  });

  it('keeps auth/session flows untouched by capability decisions', () => {
    expect(authAppSource).toContain("getSupabaseClient().auth.signInWithPassword");
    expect(authAppSource).toContain("supabase.auth.onAuthStateChange");
    expect(authAppSource).toContain("rpc('accept_tenant_invitation'");
    expect(authAppSource).toContain("rpc('create_tenant_invitation'");
  });
});
