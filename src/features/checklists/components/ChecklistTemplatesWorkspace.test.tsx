// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChecklistTemplatesWorkspace from './ChecklistTemplatesWorkspace';
import type { ChecklistTemplate } from '../types/checklistTemplate';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  duplicate: vi.fn(),
  setActive: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../api/checklistTemplateRepository', () => ({
  listChecklistTemplates: mocks.list,
  saveChecklistTemplate: mocks.save,
  duplicateChecklistTemplate: mocks.duplicate,
  setChecklistTemplateActive: mocks.setActive,
}));

const template: ChecklistTemplate = {
  id: 'template-a', tenantId: 'tenant-a', name: 'Revisión FV', description: 'Comprobaciones reales', specialty: 'Fotovoltaica',
  version: 2, active: true, createdBy: 'admin-a', updatedBy: 'admin-a', createdByName: 'Admin A', updatedByName: 'Admin A', createdAt: '2026-07-22T08:00:00Z', updatedAt: '2026-07-22T09:00:00Z',
  sections: [{ id: 'section-a', title: 'Seguridad', description: '', order: 10, points: [{
    id: 'point-a', title: 'Acceso seguro', instructions: 'Comprobar', responseType: 'si_no_na', unit: '', options: [],
    required: true, negativeObservationRequired: true, photoRequired: true, critical: false, order: 10,
  }] }],
};

function renderWorkspace(canManage = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><ChecklistTemplatesWorkspace tenantId="tenant-a" canManage={canManage} /></QueryClientProvider>);
}

describe('ChecklistTemplatesWorkspace', () => {
  beforeEach(() => {
    mocks.list.mockReset().mockResolvedValue([template]);
    mocks.save.mockReset().mockResolvedValue(template);
    mocks.duplicate.mockReset().mockResolvedValue({ ...template, id: 'copy-a', active: false });
    mocks.setActive.mockReset().mockResolvedValue({ ...template, active: false });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('muestra versión, secciones, puntos y acciones administrativas reales', async () => {
    renderWorkspace();
    expect(await screen.findByRole('heading', { name: 'Revisión FV' })).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
    expect(screen.getByText('1 secciones')).toBeTruthy();
    expect(screen.getByText('1 puntos')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Editar/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Duplicar/ })).toBeTruthy();
  });

  it('previsualiza la plantilla con la misma jerarquía que verá el técnico', async () => {
    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: /Editar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Previsualizar/ }));
    expect(screen.getByText('Vista técnica')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Seguridad/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Acceso seguro')).toBeTruthy();
    expect(screen.getByText('Foto')).toBeTruthy();
  });

  it('confirma antes de desactivar y delega una sola mutación', async () => {
    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(mocks.setActive).toHaveBeenCalledTimes(1));
    expect(mocks.setActive).toHaveBeenCalledWith(expect.anything(), 'template-a', false);
  });

  it('bloquea la administración cuando el rol no tiene permisos', () => {
    renderWorkspace(false);
    expect(screen.getByText('Configuración no disponible')).toBeTruthy();
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
