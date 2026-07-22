// @vitest-environment jsdom
import type { SupabaseClient } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientForm from '../components/ClientForm';
import { canAccessClientNavigation } from '../clientAccess';
import { clientFormSchema, installationFormSchema } from '../schemas/clientSchemas';
import type { ClientInstallation, ClientListItem } from '../types/client';
import {
  createClientInstallation,
  filterClients,
  filterInstallationsByClient,
  hasNoInstallations,
  mapWorkOrderRow,
  mapClientRow,
  setClientStatus,
  toClientPayload,
} from './clientRepository';

const tenantId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';

const sampleClient = (): ClientListItem => ({
  id: clientId,
  tenantId,
  name: 'Solar Norte',
  code: 'CLI-001',
  cifNif: 'B12345678',
  contactName: 'Marina López',
  email: 'marina@solar-norte.es',
  phone: '600 111 222',
  address: null,
  notes: null,
  status: 'activo',
  createdAt: '2026-07-19T08:00:00.000Z',
  updatedAt: '2026-07-19T08:00:00.000Z',
  installationCount: 2,
  openWorkOrderCount: 1,
});

const sampleInstallation = (id = '33333333-3333-4333-8333-333333333333'): ClientInstallation => ({
  id,
  tenantId,
  clientId,
  name: 'Cubierta principal',
  code: 'INS-001',
  type: 'Fotovoltaica',
  address: null,
  description: null,
  contactName: null,
  contactPhone: null,
  contactEmail: null,
  status: 'activo',
  createdAt: '2026-07-19T08:00:00.000Z',
  updatedAt: '2026-07-19T08:00:00.000Z',
});

describe('gestión de clientes e instalaciones', () => {
  it('mapea los campos canónicos de un cliente', () => {
    const row: Parameters<typeof mapClientRow>[0] = {
      id: clientId,
      tenant_id: tenantId,
      nombre: 'Solar Norte',
      codigo: 'CLI-001',
      cif_nif: 'B12345678',
      contacto_nombre: 'Marina López',
      email: 'marina@solar-norte.es',
      telefono: '600 111 222',
      direccion: 'Calle Sol 1',
      observaciones: 'Acceso por recepción',
      estado: 'activo',
      created_at: '2026-07-19T08:00:00.000Z',
      updated_at: '2026-07-19T08:00:00.000Z',
    };

    expect(mapClientRow(row)).toMatchObject({ cifNif: 'B12345678', contactName: 'Marina López', status: 'activo' });
  });

  it('normaliza los estados de OT de la ficha de cliente sin exponer el valor interno', () => {
    const row: Parameters<typeof mapWorkOrderRow>[0] = {
      id: '77777777-7777-4777-8777-777777777777',
      cliente_id: clientId,
      codigo_ot: 'OT-2026-00003',
      titulo: 'Revisión demo',
      estado: 'FINALIZADA_TECNICO',
      updated_at: '2026-07-22T08:00:00.000Z',
    };

    expect(mapWorkOrderRow(row).status).toBe('FINALIZADA_TECNICO');
  });

  it('crea un payload con textos normalizados', () => {
    expect(toClientPayload({ ...sampleClient(), name: '  Solar Norte  ', code: '  CLI-001  ' })).toMatchObject({
      nombre: 'Solar Norte',
      codigo: 'CLI-001',
      estado: 'activo',
    });
  });

  it('mantiene el estado exacto activo', () => {
    expect(clientFormSchema.parse({ name: 'Solar Norte' }).status).toBe('activo');
  });

  it('rechaza el estado activa', () => {
    expect(clientFormSchema.safeParse({ name: 'Solar Norte', status: 'activa' }).success).toBe(false);
  });

  it('busca por CIF/NIF y persona de contacto', () => {
    const clients = [sampleClient()];
    expect(filterClients(clients, 'B12345678', 'todos')).toHaveLength(1);
    expect(filterClients(clients, 'marina', 'todos')).toHaveLength(1);
  });

  it('filtra clientes activos e inactivos', () => {
    const inactive = { ...sampleClient(), id: '44444444-4444-4444-8444-444444444444', status: 'inactivo' as const };
    expect(filterClients([sampleClient(), inactive], '', 'activo')).toEqual([sampleClient()]);
    expect(filterClients([sampleClient(), inactive], '', 'inactivo')).toEqual([inactive]);
  });

  it('filtra instalaciones por cliente', () => {
    const other = { ...sampleInstallation('55555555-5555-4555-8555-555555555555'), clientId: '66666666-6666-4666-8666-666666666666' };
    expect(filterInstallationsByClient([sampleInstallation(), other], clientId)).toEqual([sampleInstallation()]);
  });

  it('rechaza crear una instalación sin cliente', async () => {
    await expect(createClientInstallation({} as SupabaseClient, {
      tenantId,
      clientId: '',
      name: 'Cubierta principal',
      code: '',
      type: '',
      address: '',
      description: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      status: 'activo',
    })).rejects.toThrow('Selecciona un cliente');
    expect(installationFormSchema.safeParse({ clientId: '', name: 'Cubierta principal' }).success).toBe(false);
  });

  it('desactiva sin borrar físicamente el cliente', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: clientId,
        tenant_id: tenantId,
        nombre: 'Solar Norte',
        codigo: null,
        cif_nif: null,
        contacto_nombre: null,
        email: null,
        telefono: null,
        direccion: null,
        observaciones: null,
        estado: 'inactivo',
        created_at: '2026-07-19T08:00:00.000Z',
        updated_at: '2026-07-19T08:00:00.000Z',
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ eq, select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const supabase = { from } as unknown as SupabaseClient;

    await setClientStatus(supabase, tenantId, clientId, 'inactivo');

    expect(from).toHaveBeenCalledWith('clientes');
    expect(update).toHaveBeenCalledWith({ estado: 'inactivo' });
    expect(from.mock.calls.flat()).not.toContain('delete');
  });

  it('reconoce un cliente sin instalaciones', () => {
    expect(hasNoInstallations([])).toBe(true);
  });

  it('oculta la navegación administrativa a técnicos', () => {
    expect(canAccessClientNavigation('tecnico')).toBe(false);
    expect(canAccessClientNavigation('tecnico_externo')).toBe(false);
    expect(canAccessClientNavigation('coordinador')).toBe(true);
  });

  it('conserva los datos del formulario cuando Supabase rechaza el guardado', async () => {
    render(<ClientForm submitLabel="Guardar cliente" onSubmit={async () => { throw new Error('No tienes permiso para realizar esta acción.'); }} />);
    const name = screen.getByLabelText('Nombre');
    fireEvent.change(name, { target: { value: 'Solar Norte' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }));

    await waitFor(() => expect(screen.getByText('No tienes permiso para realizar esta acción.')).toBeTruthy());
    expect((name as HTMLInputElement).value).toBe('Solar Norte');
  });
});
