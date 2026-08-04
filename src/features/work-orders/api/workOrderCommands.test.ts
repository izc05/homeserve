import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  createWorkOrder,
  toCreateWorkOrderRpcArgs,
  type CreateWorkOrderInput,
} from './workOrderCommands';

const baseInput: CreateWorkOrderInput = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  installationId: '22222222-2222-4222-8222-222222222222',
  systemId: '44444444-4444-4444-8444-444444444444',
  specialtyKey: 'electricidad_bt',
  locationId: null,
  assetId: null,
  technicianId: null,
  title: '  Revisar cuadro principal  ',
  description: '  Comprobar protecciones  ',
  type: 'revision',
  priority: 'alta',
  plannedAt: null,
  dueAt: null,
  estimatedMinutes: 90,
  instructions: null,
  safetyNotes: null,
  expectedResult: null,
  requirements: {
    checklist: true,
    initialPhotos: false,
    finalPhotos: true,
    measurements: true,
    materials: false,
    technicianSignature: true,
    responsibleSignature: false,
    finalFunctionalTest: true,
    report: true,
    administrativeReview: true,
  },
};

describe('toCreateWorkOrderRpcArgs', () => {
  it('prepara un borrador multisector y normaliza textos', () => {
    const args = toCreateWorkOrderRpcArgs(baseInput);

    expect(args).toMatchObject({
      tenant_uuid: baseInput.tenantId,
      installation_uuid: baseInput.installationId,
      system_uuid: baseInput.systemId,
      specialty_key_text: 'electricidad_bt',
      technician_uuid: null,
      title_text: 'Revisar cuadro principal',
      description_text: 'Comprobar protecciones',
      work_order_type_text: 'revision',
      priority_text: 'alta',
      estimated_minutes_value: 90,
    });
  });

  it('envía los requisitos con las claves heredadas esperadas por los triggers', () => {
    const args = toCreateWorkOrderRpcArgs(baseInput);

    expect(args.requirements_json).toEqual({
      requiere_checklist: true,
      requiere_fotos_iniciales: false,
      requiere_fotos_finales: true,
      requiere_mediciones: true,
      requiere_materiales: false,
      requiere_firma_tecnico: true,
      requiere_firma_cliente: false,
      requiere_prueba_funcional: true,
      requiere_informe: true,
      requiere_revision_admin: true,
    });
  });

  it('incluye técnico y planificación al crear asignada', () => {
    const input: CreateWorkOrderInput = {
      ...baseInput,
      technicianId: '33333333-3333-4333-8333-333333333333',
      plannedAt: '2026-07-18T08:00:00.000Z',
      dueAt: '2026-07-18T12:00:00.000Z',
    };

    expect(toCreateWorkOrderRpcArgs(input)).toMatchObject({
      technician_uuid: input.technicianId,
      planned_at_value: input.plannedAt,
      due_at_value: input.dueAt,
    });
  });
});

describe('createWorkOrder', () => {
  it('usa la RPC multisector y conserva el mensaje seguro de PostgREST', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: '42501',
        details: null,
        hint: null,
        message: 'new row violates row-level security policy',
      },
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    await expect(createWorkOrder(supabase, baseInput)).rejects.toThrow(
      'new row violates row-level security policy (42501)',
    );
    expect(rpc).toHaveBeenCalledWith('create_work_order_v2', expect.objectContaining({
      system_uuid: baseInput.systemId,
      specialty_key_text: baseInput.specialtyKey,
    }));
  });
});
