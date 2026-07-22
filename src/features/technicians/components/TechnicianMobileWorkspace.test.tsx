// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import TechnicianMobileWorkspace from './TechnicianMobileWorkspace';

const viewerId = 'technician-1';

function order(overrides: Partial<WorkOrderListItem> = {}): WorkOrderListItem {
  return {
    id: 'order-1',
    tenantId: 'tenant-1',
    code: 'OT-2026-00001',
    title: 'Revisión del inversor',
    description: null,
    type: 'revision',
    priority: 'normal',
    status: 'EN_CURSO',
    siteId: 'site-1',
    locationId: null,
    assetId: null,
    assignedTo: viewerId,
    createdBy: 'manager-1',
    plannedAt: null,
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
    createdAt: '2026-07-20T07:00:00.000Z',
    updatedAt: '2026-07-20T07:30:00.000Z',
    clientId: null,
    clientName: 'Cliente Solar E2E',
    siteName: 'Cubierta E2E',
    locationName: null,
    assignedToName: 'Técnico E2E Ficticio',
    assetName: null,
    assetType: null,
    assetReference: null,
    assetCriticality: null,
    assetStatus: null,
    ...overrides,
  };
}

function renderWorkspace(orders: WorkOrderListItem[], open = vi.fn()) {
  return render(<TechnicianMobileWorkspace orders={orders} viewerId={viewerId} viewerName="Técnico E2E Ficticio" busyOrderId={null} notice={null} open={open} runAction={vi.fn()} />);
}

describe('TechnicianMobileWorkspace premium', () => {
  afterEach(() => cleanup());

  it('renderiza los cuatro contadores con datos aislados del técnico', () => {
    renderWorkspace([
      order({ id: 'pending', code: 'OT-PEND', status: 'ASIGNADA', plannedAt: new Date().toISOString() }),
      order({ id: 'urgent', code: 'OT-URG', priority: 'urgente' }),
      order({ id: 'other', code: 'OT-OTHER', assignedTo: 'another-technician' }),
    ]);

    expect(screen.getByRole('button', { name: /1\s*Pendientes/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /1\s*Hoy/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /1\s*Urgentes/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /1\s*En curso/ })).toBeTruthy();
    expect(screen.queryByText('OT-OTHER')).toBeNull();
  });

  it('cambia el filtro sin modificar el orden recibido', () => {
    renderWorkspace([
      order({ id: 'first', code: 'OT-FIRST', priority: 'urgente' }),
      order({ id: 'second', code: 'OT-SECOND', priority: 'normal', status: 'ASIGNADA' }),
    ]);

    fireEvent.click(screen.getAllByRole('button', { name: /1\s*Urgentes/ })[0]);
    expect(screen.getAllByText('OT-FIRST').length).toBeGreaterThan(0);
    expect(screen.queryByText('OT-SECOND')).toBeNull();
  });

  it('deriva prioridad, cliente y KPIs del conjunto de OT recibido', () => {
    renderWorkspace([
      order({ id: 'first', code: 'OT-REAL-1', priority: 'normal', status: 'EN_CURSO', clientName: 'Cliente Solar E2E' }),
      order({ id: 'second', code: 'OT-REAL-2', priority: 'normal', status: 'EN_CURSO', clientName: 'Cliente Solar E2E' }),
    ]);

    expect(screen.getByRole('button', { name: /0\s*Pendientes/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /0\s*Hoy/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /0\s*Urgentes/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /2\s*En curso/ })).toBeTruthy();
    expect(screen.getAllByText('Media').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cliente Solar E2E').length).toBeGreaterThan(0);
  });

  it('muestra una cola compacta con dos OT en curso y sus acciones reales', () => {
    renderWorkspace([order({ id: 'first', code: 'OT-FIRST' }), order({ id: 'second', code: 'OT-SECOND', title: 'Revisar protecciones' })]);

    expect(screen.getByRole('heading', { name: 'Cola en curso' })).toBeTruthy();
    expect(screen.getAllByText('OT-FIRST').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OT-SECOND').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Abrir ejecución' })).toHaveLength(3);
  });

  it('expone estados vacíos cuando no hay OT asignadas', () => {
    renderWorkspace([order({ assignedTo: 'another-technician', code: 'OT-OTHER' })]);

    expect(screen.getByText('Sin OT en foco')).toBeTruthy();
    expect(screen.getByText('No hay OT en curso')).toBeTruthy();
    expect(screen.getByText('No hay OT en esta vista')).toBeTruthy();
  });

  it('abre la ejecución mediante el callback existente', () => {
    const open = vi.fn();
    renderWorkspace([order({ id: 'open-me', code: 'OT-OPEN' })], open);

    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir ejecución' })[0]);
    expect(open).toHaveBeenCalledWith('open-me');
  });

  it('muestra estados vacíos explícitos para datos opcionales ausentes', () => {
    renderWorkspace([order({ clientName: null, locationName: null })]);

    expect(screen.getAllByText('Cliente no disponible').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ubicación pendiente').length).toBeGreaterThan(0);
    expect(screen.getByText('Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro')).toBeTruthy();
  });

  it('mantiene clases responsive para tabla y tarjetas móviles', () => {
    const { container } = renderWorkspace([order()]);

    expect(container.querySelector('.technician-premium-order-table')).toBeTruthy();
    expect(container.querySelector('.technician-premium-order-row')).toBeTruthy();
    expect(container.querySelector('.technician-premium-filter-nav')).toBeTruthy();
  });
});
