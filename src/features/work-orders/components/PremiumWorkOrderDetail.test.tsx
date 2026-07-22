// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PremiumWorkOrderDetail from './PremiumWorkOrderDetail';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import type { WorkOrderAuditEvent } from '../api/workOrderAuditRepository';

const requirements = {
  checklist: true,
  initialPhotos: false,
  finalPhotos: false,
  measurements: false,
  materials: false,
  technicianSignature: false,
  responsibleSignature: false,
  finalFunctionalTest: false,
  report: true,
  administrativeReview: true,
};

const order: WorkOrderListItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  tenantId: '11111111-1111-4111-8111-111111111111',
  code: 'OT-2026-00003',
  title: 'Auditoría asignación E2E nueva',
  description: null,
  type: 'mantenimiento_preventivo',
  priority: 'normal',
  status: 'EN_CURSO',
  siteId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  locationId: null,
  assetId: null,
  assignedTo: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  createdBy: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  plannedAt: null,
  dueAt: null,
  estimatedMinutes: null,
  instructions: null,
  safetyNotes: null,
  expectedResult: null,
  requirements,
  blockReason: null,
  blockNotes: null,
  createdAt: '2026-07-20T21:14:00.000Z',
  updatedAt: '2026-07-20T21:23:00.000Z',
  clientId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  clientName: 'Cliente Solar E2E',
  siteName: 'Cubierta E2E',
  locationName: null,
  assignedToName: 'Técnico E2E Ficticio',
  assetName: null,
  assetType: null,
  assetReference: null,
  assetCriticality: null,
  assetStatus: null,
};

const auditEvents: WorkOrderAuditEvent[] = [
  {
    id: '1', tenantId: order.tenantId, action: 'create_work_order', entityType: 'ordenes_trabajo', entityId: order.id, userId: order.createdBy, actorName: 'Admin E2E Ficticio', metadata: {}, createdAt: '2026-07-20T21:14:00.000Z',
  },
  {
    id: '2', tenantId: order.tenantId, action: 'assign_work_order', entityType: 'ordenes_trabajo', entityId: order.id, userId: order.createdBy, actorName: 'Admin E2E Ficticio', metadata: { estado_anterior: 'BORRADOR', estado_nuevo: 'ASIGNADA', assigned_to_name: 'Técnico E2E Ficticio' }, createdAt: '2026-07-20T21:14:10.000Z',
  },
  {
    id: '3', tenantId: order.tenantId, action: 'accept_work_order', entityType: 'ordenes_trabajo', entityId: order.id, userId: order.assignedTo, actorName: 'Técnico E2E Ficticio', metadata: { estado_anterior: 'ASIGNADA', estado_nuevo: 'ACEPTADA' }, createdAt: '2026-07-20T21:22:00.000Z',
  },
  {
    id: '4', tenantId: order.tenantId, action: 'start_work_order_visit', entityType: 'ordenes_trabajo', entityId: order.id, userId: order.assignedTo, actorName: 'Técnico E2E Ficticio', metadata: { estado_anterior: 'ACEPTADA', estado_nuevo: 'EN_CURSO' }, createdAt: '2026-07-20T21:23:00.000Z',
  },
];

function renderDetail(overrides: Partial<WorkOrderListItem> = {}, operationalPanels?: { evidence?: ReactNode; review?: ReactNode }) {
  return render(<PremiumWorkOrderDetail
    order={{ ...order, ...overrides }}
    auditEvents={auditEvents}
    back={vi.fn()}
    onNewRelated={vi.fn()}
    statusLabel="En curso"
    priorityLabel="Media"
    typeLabel="Preventivo"
    displayDate={(value) => value ? '20/07/2026 21:23' : 'Sin planificar'}
    statusClass={(status) => `status-${status.toLowerCase()}`}
    priorityClass={() => 'priority-media'}
    operationalPanels={operationalPanels}
  />);
}

describe('ficha administrativa premium de OT', () => {
  afterEach(() => cleanup());

  it('muestra datos reales, acción informativa y pie de marca', () => {
    renderDetail();

    expect(screen.getByRole('heading', { name: 'OT-2026-00003' })).toBeTruthy();
    expect(screen.getByText('Cliente Solar E2E')).toBeTruthy();
    expect(screen.getByText('Cubierta E2E')).toBeTruthy();
    expect(screen.getByText('En curso')).toBeTruthy();
    expect(screen.getByText('Media')).toBeTruthy();
    expect(screen.getAllByText('Completar ejecución').length).toBeGreaterThan(0);
    expect(screen.getByText('Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Registrar avance/i })).toBeNull();
  });

  it('permite recorrer las pestañas y conserva el orden cronológico de auditoría', () => {
    renderDetail();

    const historyTab = screen.getAllByRole('tab', { name: /Historial/ })[0];
    expect(historyTab.getAttribute('aria-selected')).toBe('false');
    fireEvent.click(historyTab);

    expect(historyTab.getAttribute('aria-selected')).toBe('true');
    const panel = screen.getByRole('tabpanel');
    expect(panel.textContent).toContain('OT creada');
    expect(panel.textContent).toContain('OT asignada');
    expect(panel.textContent?.indexOf('OT creada')).toBeLessThan(panel.textContent?.indexOf('OT asignada') ?? 0);
  });

  it('permite mover el foco entre pestañas con el teclado', () => {
    renderDetail();

    const summaryTab = screen.getAllByRole('tab', { name: /Resumen/ })[0];
    fireEvent.keyDown(summaryTab, { key: 'ArrowRight' });

    const historyTab = screen.getAllByRole('tab', { name: /Historial/ })[0];
    expect(historyTab.getAttribute('aria-selected')).toBe('true');
  });

  it('expone estados vacíos sin inventar contacto, dirección o teléfono', () => {
    renderDetail();

    expect(screen.getAllByText('Ubicación pendiente').length).toBeGreaterThan(0);
    expect(screen.getByText('Sin equipo vinculado')).toBeTruthy();
    expect(screen.getByText('Sin descripción registrada.')).toBeTruthy();
    expect(screen.getByText('Contacto no disponible en los datos visibles')).toBeTruthy();
    expect(screen.queryByText(/600/)).toBeNull();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it('muestra la dirección real y un enlace externo seguro en Instalación', () => {
    renderDetail({ siteAddress: 'Calle Demostración 1, 28000 Madrid' });
    fireEvent.click(screen.getByRole('tab', { name: /Instalación/ }));

    expect(screen.getByText('Calle Demostración 1, 28000 Madrid')).toBeTruthy();
    const directions = screen.getByRole('link', { name: /Abrir indicaciones/ });
    expect(directions.getAttribute('href')).toContain('google.com/maps/dir/');
    expect(directions.getAttribute('target')).toBe('_blank');
    expect(directions.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('sitúa las evidencias reales y la revisión en sus pestañas correspondientes', () => {
    renderDetail({}, {
      evidence: <section aria-label="Evidencias reales">Resumen técnico, checklist y fotografías privadas</section>,
      review: <form aria-label="Revisión administrativa"><textarea aria-label="Nota de revisión" /></form>,
    });

    fireEvent.click(screen.getByRole('tab', { name: /Evidencias/ }));
    expect(screen.getByLabelText('Evidencias reales')).toBeTruthy();
    expect(screen.queryByLabelText('Revisión administrativa')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Administración/ }));
    expect(screen.getByLabelText('Revisión administrativa')).toBeTruthy();
    expect(screen.queryByLabelText('Evidencias reales')).toBeNull();
  });
});
