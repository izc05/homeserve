import { describe, expect, it, vi } from 'vitest';
import {
  cancelScheduledMaintenance,
  canEditScheduledMaintenance,
  canGenerateWorkOrderFromScheduledMaintenance,
  generateDueScheduledMaintenances,
  generateWorkOrderFromScheduledMaintenance,
  isActionableScheduledMaintenance,
  listScheduledMaintenances,
  rescheduleScheduledMaintenance,
  skipScheduledMaintenance,
} from './scheduledMaintenanceRepository';

function createQueryMock(data: unknown[], error: unknown = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve({ data, error })),
  };
  return chain;
}

function scheduledRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'scheduled-1',
    tenant_id: 'tenant-1',
    plan_id: 'plan-1',
    instalacion_id: 'site-1',
    ubicacion_id: null,
    activo_id: 'asset-1',
    ot_id: null,
    titulo: 'Revisión mensual',
    descripcion: null,
    tipo: 'preventivo',
    estado: 'proximo',
    prioridad: 'normal',
    fecha_programada: '2026-07-30',
    fecha_limite: '2026-08-02',
    assigned_to: null,
    origen: 'plan',
    created_at: '2026-07-18T10:00:00.000Z',
    updated_at: '2026-07-18T10:00:00.000Z',
    ...overrides,
  };
}

describe('scheduledMaintenanceRepository', () => {
  it('lista mantenimientos programados por organización', async () => {
    const query = createQueryMock([scheduledRow()]);
    const supabase = { from: vi.fn(() => query) };

    const result = await listScheduledMaintenances(supabase as any, 'tenant-1');

    expect(supabase.from).toHaveBeenCalledWith('mantenimientos_programados');
    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(result[0]).toMatchObject({
      id: 'scheduled-1',
      tenantId: 'tenant-1',
      planId: 'plan-1',
      assetId: 'asset-1',
      status: 'proximo',
    });
  });

  it('genera mantenimientos vencidos o próximos desde planes', async () => {
    const supabase = {
      rpc: vi.fn(() => Promise.resolve({
        data: {
          tenant_id: 'tenant-1',
          horizon_days: 45,
          generated_count: 2,
          skipped_count: 1,
          generated_ids: ['scheduled-1', 'scheduled-2'],
        },
        error: null,
      })),
    };

    const result = await generateDueScheduledMaintenances(supabase as any, {
      tenantId: 'tenant-1',
      horizonDays: 45,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('generate_due_scheduled_maintenances', {
      tenant_uuid: 'tenant-1',
      horizon_days: 45,
    });
    expect(result).toEqual({
      tenantId: 'tenant-1',
      horizonDays: 45,
      generatedCount: 2,
      skippedCount: 1,
      generatedIds: ['scheduled-1', 'scheduled-2'],
    });
  });

  it('normaliza horizontes negativos a cero', async () => {
    const supabase = {
      rpc: vi.fn(() => Promise.resolve({
        data: { tenant_id: 'tenant-1', horizon_days: 0, generated_count: 0, skipped_count: 0, generated_ids: [] },
        error: null,
      })),
    };

    await generateDueScheduledMaintenances(supabase as any, { tenantId: 'tenant-1', horizonDays: -7 });

    expect(supabase.rpc).toHaveBeenCalledWith('generate_due_scheduled_maintenances', {
      tenant_uuid: 'tenant-1',
      horizon_days: 0,
    });
  });

  it('reprograma un mantenimiento programado', async () => {
    const supabase = {
      rpc: vi.fn(() => Promise.resolve({
        data: scheduledRow({ fecha_programada: '2026-08-10', fecha_limite: '2026-08-12', estado: 'programado' }),
        error: null,
      })),
    };

    const result = await rescheduleScheduledMaintenance(supabase as any, {
      scheduledMaintenanceId: 'scheduled-1',
      scheduledDate: '2026-08-10',
      dueDate: '2026-08-12',
      reason: 'Cambio de ventana',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('reschedule_scheduled_maintenance', {
      scheduled_maintenance_uuid: 'scheduled-1',
      scheduled_date: '2026-08-10',
      due_date: '2026-08-12',
      reason_text: 'Cambio de ventana',
    });
    expect(result).toMatchObject({ scheduledDate: '2026-08-10', dueDate: '2026-08-12', status: 'programado' });
  });

  it('cancela planificación con motivo obligatorio y limpio', async () => {
    const supabase = {
      rpc: vi.fn(() => Promise.resolve({
        data: scheduledRow({ estado: 'cancelado' }),
        error: null,
      })),
    };

    const result = await cancelScheduledMaintenance(supabase as any, {
      scheduledMaintenanceId: 'scheduled-1',
      reason: '  Equipo retirado  ',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('cancel_scheduled_maintenance', {
      scheduled_maintenance_uuid: 'scheduled-1',
      reason_text: 'Equipo retirado',
    });
    expect(result.status).toBe('cancelado');
  });

  it('marca planificación como no aplica y avanza el plan', async () => {
    const supabase = {
      rpc: vi.fn(() => Promise.resolve({
        data: scheduledRow({ estado: 'no_aplica' }),
        error: null,
      })),
    };

    const result = await skipScheduledMaintenance(supabase as any, {
      scheduledMaintenanceId: 'scheduled-1',
      reason: 'No procede este ciclo',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('skip_scheduled_maintenance', {
      scheduled_maintenance_uuid: 'scheduled-1',
      reason_text: 'No procede este ciclo',
    });
    expect(result.status).toBe('no_aplica');
  });

  it('genera OT desde un mantenimiento programado', async () => {
    const supabase = {
      rpc: vi.fn(() => Promise.resolve({
        data: { id: 'ot-1', codigo_ot: 'OT-2026-00001', estado: 'ASIGNADA' },
        error: null,
      })),
    };

    const result = await generateWorkOrderFromScheduledMaintenance(supabase as any, {
      scheduledMaintenanceId: 'scheduled-1',
      technicianId: 'tech-1',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('create_work_order_from_scheduled_maintenance', {
      scheduled_maintenance_uuid: 'scheduled-1',
      technician_uuid: 'tech-1',
    });
    expect(result).toMatchObject({ id: 'ot-1', code: 'OT-2026-00001', status: 'ASIGNADA' });
  });

  it('bloquea generación de OT duplicada o cerrada', () => {
    expect(canGenerateWorkOrderFromScheduledMaintenance('proximo', null)).toBe(true);
    expect(canGenerateWorkOrderFromScheduledMaintenance('ot_generada', null)).toBe(false);
    expect(canGenerateWorkOrderFromScheduledMaintenance('completado', null)).toBe(false);
    expect(canGenerateWorkOrderFromScheduledMaintenance('proximo', 'ot-1')).toBe(false);
  });

  it('marca qué planificaciones son accionables y editables', () => {
    expect(isActionableScheduledMaintenance('vencido')).toBe(true);
    expect(isActionableScheduledMaintenance('cancelado')).toBe(false);
    expect(isActionableScheduledMaintenance('completado')).toBe(false);
    expect(canEditScheduledMaintenance('proximo', null)).toBe(true);
    expect(canEditScheduledMaintenance('proximo', 'ot-1')).toBe(false);
    expect(canEditScheduledMaintenance('no_aplica', null)).toBe(false);
  });
});
