import { describe, expect, it } from 'vitest';
import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';
import { groupTechnicianOrders, technicianParticipationLabel } from './technicianMobile';

function order(id: string, assignedTo: string, status: WorkOrderListItem['status']): WorkOrderListItem {
  return {
    id,
    tenantId: 'tenant-a',
    code: `OT-${id}`,
    title: `Trabajo ${id}`,
    description: null,
    type: 'averia',
    priority: 'normal',
    status,
    siteId: 'site-a',
    locationId: null,
    assetId: null,
    assignedTo,
    createdBy: 'admin-a',
    plannedAt: '2026-08-10T08:00:00.000Z',
    dueAt: null,
    estimatedMinutes: null,
    instructions: null,
    safetyNotes: null,
    expectedResult: null,
    requirements: {
      checklist: false,
      initialPhotos: false,
      finalPhotos: false,
      measurements: false,
      materials: false,
      technicianSignature: false,
      responsibleSignature: false,
      finalFunctionalTest: false,
      report: false,
      administrativeReview: false,
    },
    blockReason: null,
    blockNotes: null,
    createdAt: '2026-08-10T07:00:00.000Z',
    updatedAt: '2026-08-10T07:00:00.000Z',
    siteName: 'Instalación A',
    locationName: null,
    assignedToName: null,
    assetName: null,
    assetType: null,
    assetReference: null,
    assetCriticality: null,
    assetStatus: null,
  };
}

describe('technician participant mode', () => {
  const viewerId = 'tech-collaborator';
  const responsibleOrder = order('1', viewerId, 'EN_CURSO');
  const collaboratorOrder = order('2', 'tech-responsible', 'ACEPTADA');

  it('mantiene el filtro legacy por assigned_to cuando no se activa el modo participante', () => {
    const groups = groupTechnicianOrders([responsibleOrder, collaboratorOrder], viewerId, new Date('2026-08-10T09:00:00Z'));
    expect(groups.en_curso.map((item) => item.id)).toEqual(['1']);
    expect(groups.pendientes).toHaveLength(0);
  });

  it('incluye todas las OT ya autorizadas por RLS en modo participante', () => {
    const groups = groupTechnicianOrders([responsibleOrder, collaboratorOrder], viewerId, new Date('2026-08-10T09:00:00Z'), true);
    expect(groups.en_curso.map((item) => item.id)).toEqual(['1']);
    expect(groups.pendientes.map((item) => item.id)).toEqual(['2']);
  });

  it('distingue responsable y colaborador sin inventar otro rol', () => {
    expect(technicianParticipationLabel(responsibleOrder, viewerId)).toBe('Responsable');
    expect(technicianParticipationLabel(collaboratorOrder, viewerId)).toBe('Colaborador');
  });
});
