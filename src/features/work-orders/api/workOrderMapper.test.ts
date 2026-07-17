import { describe, expect, it } from 'vitest';
import { mapLegacyWorkOrder, type LegacyWorkOrderRow } from './workOrderMapper';

const baseRow: LegacyWorkOrderRow = {
  id: '11111111-1111-4111-8111-111111111111',
  tenant_id: '22222222-2222-4222-8222-222222222222',
  codigo_ot: 'DEMO-OT-003',
  instalacion_id: '33333333-3333-4333-8333-333333333333',
  ubicacion_id: null,
  activo_id: null,
  titulo: 'Reparar avería',
  descripcion: 'Descripción de prueba',
  tipo: 'reparacion',
  prioridad: 'urgente',
  estado: 'PENDIENTE_MATERIAL',
  assigned_to: '44444444-4444-4444-8444-444444444444',
  fecha_prevista: '2026-07-17T08:00:00.000Z',
  fecha_limite: null,
  created_by: '55555555-5555-4555-8555-555555555555',
  created_at: '2026-07-16T10:00:00.000Z',
  updated_at: '2026-07-17T09:00:00.000Z',
  tipo_ot: 'reparacion',
  tiempo_estimado_min: 90,
  duracion_estimada_minutos: null,
  instrucciones_tecnico: 'Revisar antes de sustituir.',
  riesgos_precauciones: 'Consignar la instalación.',
  resultado_esperado: 'Equipo operativo.',
  configuracion: {
    requiere_checklist: true,
    requiere_fotos_iniciales: true,
    requiere_fotos_finales: true,
    requiere_materiales: true,
    requiere_firma_tecnico: true,
    requiere_firma_cliente: false,
    requiere_informe: true,
    requiere_revision_admin: true,
  },
};

describe('legacy work-order mapper', () => {
  it('convierte una fila heredada al dominio oficial sin modificar la fuente', () => {
    const result = mapLegacyWorkOrder(baseRow);

    expect(result).toMatchObject({
      code: 'DEMO-OT-003',
      type: 'mantenimiento_correctivo',
      priority: 'urgente',
      status: 'BLOQUEADA',
      blockReason: 'MATERIAL',
      estimatedMinutes: 90,
    });
    expect(result.requirements).toEqual({
      checklist: true,
      initialPhotos: true,
      finalPhotos: true,
      measurements: false,
      materials: true,
      technicianSignature: true,
      responsibleSignature: false,
      finalFunctionalTest: false,
      report: true,
      administrativeReview: true,
    });
  });

  it('prioriza tipo_ot y la duración normalizada cuando existen', () => {
    const result = mapLegacyWorkOrder({
      ...baseRow,
      tipo: 'revision',
      tipo_ot: 'inspeccion',
      duracion_estimada_minutos: 120,
    });

    expect(result.type).toBe('inspeccion');
    expect(result.estimatedMinutes).toBe(120);
  });

  it('rechaza tipos y prioridades desconocidos', () => {
    expect(() => mapLegacyWorkOrder({ ...baseRow, tipo_ot: 'inventado' })).toThrow(
      'Tipo de OT heredado no reconocido: inventado',
    );
    expect(() => mapLegacyWorkOrder({ ...baseRow, prioridad: 'máxima' })).toThrow(
      'Prioridad de OT heredada no reconocida: máxima',
    );
  });

  it('rechaza filas incompletas en campos obligatorios', () => {
    expect(() => mapLegacyWorkOrder({ ...baseRow, codigo_ot: null })).toThrow(
      'La OT heredada no contiene codigo_ot',
    );
  });
});
