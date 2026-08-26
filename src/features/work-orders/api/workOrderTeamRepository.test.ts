import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  activeParticipantRole,
  closeMyWorkOrderVisit,
  finalizeWorkOrderTechnical,
  handoverWorkOrderResponsibility,
  setWorkOrderCollaborator,
  type WorkOrderParticipant,
} from './workOrderTeamRepository';

const workOrderId = '11111111-1111-4111-8111-111111111111';
const technicianId = '22222222-2222-4222-8222-222222222222';

describe('workOrderTeamRepository RPC contracts', () => {
  it('envía alta de colaborador a la RPC segura', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'participant-1' }, error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    await setWorkOrderCollaborator(supabase, {
      workOrderId,
      technicianId,
      enabled: true,
      reason: 'Apoyo técnico',
    });

    expect(rpc).toHaveBeenCalledWith('set_work_order_collaborator', {
      work_order_uuid: workOrderId,
      technician_uuid: technicianId,
      enabled: true,
      reason_text: 'Apoyo técnico',
    });
  });

  it('transporta el cierre de la visita propia sin cerrar la OT', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'visit-1' }, error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    await closeMyWorkOrderVisit(supabase, {
      workOrderId,
      workDone: '  Reparación y prueba  ',
      pendingWork: '  Revisar mañana  ',
      result: 'necesita_otra_visita',
    });

    expect(rpc).toHaveBeenCalledWith('close_my_work_order_visit', {
      work_order_uuid: workOrderId,
      payload_json: expect.objectContaining({
        trabajo_realizado: 'Reparación y prueba',
        trabajo_pendiente: 'Revisar mañana',
        resultado_cierre: 'necesita_otra_visita',
      }),
    });
  });

  it('usa la RPC específica para la finalización técnica global', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: workOrderId }, error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    await finalizeWorkOrderTechnical(supabase, workOrderId, '  Trabajo completado por el equipo  ');

    expect(rpc).toHaveBeenCalledWith('finalize_work_order_technical', {
      work_order_uuid: workOrderId,
      summary_text: 'Trabajo completado por el equipo',
    });
  });

  it('envía el relevo con nota y política del técnico saliente', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: workOrderId }, error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    await handoverWorkOrderResponsibility(supabase, {
      workOrderId,
      nextTechnicianId: technicianId,
      note: '  Cambio de turno documentado  ',
      keepPreviousAsCollaborator: true,
    });

    expect(rpc).toHaveBeenCalledWith('handover_work_order_responsibility', {
      work_order_uuid: workOrderId,
      next_technician_uuid: technicianId,
      note_text: 'Cambio de turno documentado',
      keep_previous_as_collaborator: true,
    });
  });

  it('rechaza cierre y relevo sin texto suficiente antes de llamar a Supabase', async () => {
    const rpc = vi.fn();
    const supabase = { rpc } as unknown as SupabaseClient;

    await expect(closeMyWorkOrderVisit(supabase, { workOrderId, workDone: ' ' })).rejects.toThrow('trabajo realizado');
    await expect(handoverWorkOrderResponsibility(supabase, {
      workOrderId,
      nextTechnicianId: technicianId,
      note: 'abc',
      keepPreviousAsCollaborator: false,
    })).rejects.toThrow('nota de relevo');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('activeParticipantRole', () => {
  const participants: WorkOrderParticipant[] = [
    {
      id: 'p1',
      workOrderId,
      technicianId: 'tech-old',
      technicianName: 'Anterior',
      role: 'responsable',
      status: 'retirado',
      addedAt: '2026-08-10T08:00:00Z',
      removedAt: '2026-08-10T10:00:00Z',
      reason: 'Relevo',
    },
    {
      id: 'p2',
      workOrderId,
      technicianId,
      technicianName: 'Entrante',
      role: 'responsable',
      status: 'activo',
      addedAt: '2026-08-10T10:00:00Z',
      removedAt: null,
      reason: null,
    },
  ];

  it('devuelve solo el rol de la participación activa', () => {
    expect(activeParticipantRole(participants, technicianId)).toBe('responsable');
    expect(activeParticipantRole(participants, 'tech-old')).toBeNull();
    expect(activeParticipantRole(participants, 'unknown')).toBeNull();
  });
});
