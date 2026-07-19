import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { listWorkOrderAuditEvents } from './workOrderAuditRepository';

function createQueryMock(data: unknown[], error: unknown = null) {
  const result = Promise.resolve({ data, error });
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: result.then.bind(result),
  };
  return chain;
}

describe('workOrderAuditRepository', () => {
  it('enriquece los eventos con el nombre del actor registrado en perfiles', async () => {
    const auditQuery = createQueryMock([{
      id: 'audit-1',
      tenant_id: 'tenant-1',
      action: 'create_work_order',
      entity_type: 'ordenes_trabajo',
      entity_id: 'ot-1',
      user_id: 'user-1',
      metadata: { estado_nuevo: 'ASIGNADA' },
      created_at: '2026-07-19T10:00:00.000Z',
    }]);
    const profilesQuery = createQueryMock([{ id: 'user-1', nombre: 'Laura Sánchez' }]);
    const supabase = {
      from: vi.fn((table: string) => table === 'audit_logs' ? auditQuery : profilesQuery),
    };

    const events = await listWorkOrderAuditEvents(supabase as unknown as SupabaseClient, 'tenant-1');

    expect(profilesQuery.in).toHaveBeenCalledWith('id', ['user-1']);
    expect(events).toEqual([expect.objectContaining({
      id: 'audit-1',
      userId: 'user-1',
      actorName: 'Laura Sánchez',
    })]);
  });
});
