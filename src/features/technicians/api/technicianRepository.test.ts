import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  calculateTechnicianWorkload,
  createTechnicianInvitation,
  friendlyTechnicianError,
  isAssignableTechnician,
  mapTechnician,
  toDetailedInvitationRpcArgs,
} from './technicianRepository';

const member = {
  id: 'membership-1',
  tenant_id: 'tenant-1',
  user_id: 'technician-1',
  role: 'tecnico' as const,
  estado: 'activo' as const,
  especialidad: '  Fotovoltaica  ',
  updated_at: '2026-07-18T08:00:00.000Z',
};

describe('technician repository contracts', () => {
  it('mapea teléfono, especialidad y última actividad del técnico', () => {
    const technician = mapTechnician(
      member,
      { id: 'technician-1', nombre: '  Ana Ruiz  ', email: ' ana@example.com ', telefono: ' 600 123 123 ' },
      [{ assigned_to: 'technician-1', estado: 'EN_CURSO', updated_at: '2026-07-19T09:00:00.000Z' }],
    );

    expect(technician).toMatchObject({
      name: 'Ana Ruiz',
      email: 'ana@example.com',
      phone: '600 123 123',
      specialty: 'Fotovoltaica',
      lastActivityAt: '2026-07-19T09:00:00.000Z',
    });
  });

  it('prepara una invitación detallada con email normalizado y vacíos nulos', () => {
    expect(toDetailedInvitationRpcArgs({
      tenantId: 'tenant-1',
      name: '  Luis Soler  ',
      email: ' LUIS@EXAMPLE.COM ',
      phone: '   ',
      specialty: '  Climatización  ',
      role: 'tecnico_externo',
      requireMfa: true,
    })).toEqual({
      tenant_uuid: 'tenant-1',
      invite_email: 'luis@example.com',
      invite_role: 'tecnico_externo',
      require_mfa: true,
      invite_name: 'Luis Soler',
      invite_phone: null,
      invite_specialty: 'Climatización',
    });
  });

  it('crea la invitación mediante la RPC específica y devuelve el token', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ invitation_token: 'token-1' }], error: null });
    const input = {
      tenantId: 'tenant-1',
      name: 'Luis Soler',
      email: 'LUIS@EXAMPLE.COM',
      phone: '600 111 222',
      specialty: 'Fotovoltaica',
      role: 'tecnico' as const,
      requireMfa: false,
    };

    await expect(createTechnicianInvitation({ rpc } as unknown as SupabaseClient, input)).resolves.toEqual({
      token: 'token-1',
      email: 'luis@example.com',
    });
    expect(rpc).toHaveBeenCalledWith('create_tenant_invitation_with_details', expect.objectContaining({
      invite_phone: '600 111 222',
      invite_specialty: 'Fotovoltaica',
    }));
  });

  it('considera asignable al técnico activo', () => {
    expect(isAssignableTechnician({ role: 'tecnico', status: 'activo' })).toBe(true);
  });

  it('impide asignar un técnico inactivo', () => {
    expect(isAssignableTechnician({ role: 'tecnico_externo', status: 'inactivo' })).toBe(false);
  });

  it('calcula la carga sin mezclar las OT de otros técnicos', () => {
    expect(calculateTechnicianWorkload([
      { assigned_to: 'technician-1', estado: 'ASIGNADA', updated_at: '2026-07-18T08:00:00.000Z' },
      { assigned_to: 'technician-1', estado: 'BLOQUEADA', updated_at: '2026-07-18T09:00:00.000Z' },
      { assigned_to: 'technician-1', estado: 'VALIDADA', updated_at: '2026-07-18T10:00:00.000Z' },
      { assigned_to: 'technician-2', estado: 'EN_CURSO', updated_at: '2026-07-18T11:00:00.000Z' },
    ], 'technician-1')).toEqual({ assigned: 1, inProgress: 1, completed: 1 });
  });

  it('traduce errores técnicos sin mostrar mensajes internos', () => {
    expect(friendlyTechnicianError(new Error('row-level security violation'), 'Error')).toBe('No tienes permiso para realizar esta acción.');
    expect(friendlyTechnicianError(new Error('Failed to fetch'), 'Error')).toBe('No hay conexión con el servidor. Comprueba la red y vuelve a intentarlo.');
  });
});
