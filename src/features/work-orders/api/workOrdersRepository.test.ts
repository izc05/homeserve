import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { listAccessibleWorkOrders } from './workOrdersRepository';

const orderRow = {
  id: '11111111-1111-4111-8111-111111111111',
  tenant_id: '22222222-2222-4222-8222-222222222222',
  codigo_ot: 'OT-2026-00001',
  cliente_id: '77777777-7777-4777-8777-777777777777',
  instalacion_id: '33333333-3333-4333-8333-333333333333',
  ubicacion_id: '44444444-4444-4444-8444-444444444444',
  activo_id: null,
  titulo: 'Revisión de cuadro eléctrico',
  descripcion: null,
  tipo: 'revision',
  prioridad: 'normal',
  estado: 'ASIGNADA',
  assigned_to: '55555555-5555-4555-8555-555555555555',
  fecha_prevista: '2026-07-17T08:00:00.000Z',
  fecha_limite: null,
  created_by: '66666666-6666-4666-8666-666666666666',
  created_at: '2026-07-16T10:00:00.000Z',
  updated_at: '2026-07-16T10:00:00.000Z',
  tipo_ot: 'revision',
  tiempo_estimado_min: 60,
  duracion_estimada_minutos: null,
  instrucciones_tecnico: null,
  riesgos_precauciones: null,
  resultado_esperado: null,
  configuracion: {},
};

function createFakeClient() {
  const orderLimit = vi.fn(async () => ({ data: [orderRow], error: null }));
  const orderChain = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: orderLimit,
  };
  orderChain.select.mockReturnValue(orderChain);
  orderChain.eq.mockReturnValue(orderChain);
  orderChain.is.mockReturnValue(orderChain);
  orderChain.order.mockReturnValue(orderChain);

  const namedRows: Record<string, Array<Record<string, string | null>>> = {
    clientes: [{ id: orderRow.cliente_id, nombre: 'Servicio Andaluz de Salud' }],
    instalaciones: [{ id: orderRow.instalacion_id, nombre: 'Hospital Universitario', direccion: 'Avenida de la Salud 10, Madrid', contacto_nombre: 'Responsable de guardia', contacto_telefono: null, contacto_email: null }],
    ubicaciones: [{ id: orderRow.ubicacion_id, nombre: 'Sala técnica' }],
    profiles: [{ id: orderRow.assigned_to, nombre: 'María López' }],
  };

  const from = vi.fn((table: string) => {
    if (table === 'ordenes_trabajo') return orderChain;
    const lookupChain = {
      select: vi.fn(),
      in: vi.fn(async () => ({ data: namedRows[table] ?? [], error: null })),
    };
    lookupChain.select.mockReturnValue(lookupChain);
    return lookupChain;
  });

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    orderChain,
  };
}

describe('work-orders repository', () => {
  it('consulta por tenant y completa los nombres visibles', async () => {
    const { client, from, orderChain } = createFakeClient();
    const result = await listAccessibleWorkOrders(client, orderRow.tenant_id, 25);

    expect(orderChain.eq).toHaveBeenCalledWith('tenant_id', orderRow.tenant_id);
    expect(orderChain.is).toHaveBeenCalledWith('deleted_at', null);
    expect(orderChain.limit).toHaveBeenCalledWith(25);
    expect(from).toHaveBeenCalledWith('instalaciones');
    expect(from).toHaveBeenCalledWith('clientes');
    expect(from).toHaveBeenCalledWith('ubicaciones');
    expect(from).toHaveBeenCalledWith('profiles');
    expect(result[0]).toMatchObject({
      code: 'OT-2026-00001',
      clientName: 'Servicio Andaluz de Salud',
      siteName: 'Hospital Universitario',
      siteAddress: 'Avenida de la Salud 10, Madrid',
      siteContactName: 'Responsable de guardia',
      locationName: 'Sala técnica',
      assignedToName: 'María López',
      status: 'ASIGNADA',
    });
  });

  it('rechaza consultas sin organización o con límites no válidos', async () => {
    const { client } = createFakeClient();

    await expect(listAccessibleWorkOrders(client, '')).rejects.toThrow(
      'Se necesita una organización activa',
    );
    await expect(listAccessibleWorkOrders(client, orderRow.tenant_id, 0)).rejects.toThrow(
      'El límite de OT debe estar entre 1 y 500',
    );
  });
});
