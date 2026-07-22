import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mapChecklistTemplate, prepareChecklistFromTemplate, saveChecklistTemplate } from './checklistTemplateRepository';
import type { ChecklistTemplateDraft } from '../types/checklistTemplate';

const draft: ChecklistTemplateDraft = {
  tenantId: 'tenant-a',
  name: '  Revisión FV  ',
  description: '  Controles  ',
  specialty: '  Fotovoltaica  ',
  active: true,
  sections: [{
    id: 'section-local',
    title: '  Seguridad  ',
    description: '',
    order: 10,
    points: [{
      id: 'point-local',
      title: '  Acceso seguro  ',
      instructions: '  Comprobar  ',
      responseType: 'seleccion',
      unit: '',
      options: [' Correcto ', '', ' No aplica '],
      required: true,
      negativeObservationRequired: true,
      photoRequired: true,
      critical: false,
      order: 10,
    }],
  }],
};

describe('checklistTemplateRepository', () => {
  it('mapea secciones y puntos en el orden persistido sin inventar valores', () => {
    const template = mapChecklistTemplate({
      id: 'template-a', tenant_id: 'tenant-a', nombre: 'Revisión FV', version: 3, estado: 'activo',
      created_by: 'admin-a', updated_by: 'admin-a', created_at: '2026-07-22T08:00:00Z', updated_at: '2026-07-22T09:00:00Z',
      checklist_plantilla_secciones: [
        { id: 'section-b', titulo: 'Segunda', orden: 20, checklist_plantilla_puntos: [] },
        { id: 'section-a', titulo: 'Primera', orden: 10, checklist_plantilla_puntos: [
          { id: 'point-b', titulo: 'Dos', tipo_respuesta: 'texto', orden: 20 },
          { id: 'point-a', titulo: 'Uno', tipo_respuesta: 'numero', unidad: 'V', orden: 10 },
        ] },
      ],
    });

    expect(template.sections.map((section) => section.id)).toEqual(['section-a', 'section-b']);
    expect(template.sections[0].points.map((point) => point.id)).toEqual(['point-a', 'point-b']);
    expect(template.sections[0].points[0]).toMatchObject({ responseType: 'numero', unit: 'V' });
  });

  it('envía una instantánea limpia y explícita a la RPC de guardado', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'template-a' }, error: null });
    await saveChecklistTemplate({ rpc } as unknown as SupabaseClient, draft, null);

    expect(rpc).toHaveBeenCalledWith('save_checklist_template', {
      template_uuid: null,
      payload_json: expect.objectContaining({
        tenantId: 'tenant-a', name: 'Revisión FV', description: 'Controles', specialty: 'Fotovoltaica',
        sections: [expect.objectContaining({
          title: 'Seguridad',
          points: [expect.objectContaining({ title: 'Acceso seguro', options: ['Correcto', 'No aplica'], photoRequired: true })],
        })],
      }),
    });
  });

  it('prepara una OT únicamente mediante la RPC versionada', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { work_order_id: 'order-a', template_version: 2 }, error: null });
    await prepareChecklistFromTemplate({ rpc } as unknown as SupabaseClient, 'order-a', 'template-a');
    expect(rpc).toHaveBeenCalledWith('prepare_work_order_checklist', { work_order_uuid: 'order-a', template_uuid: 'template-a' });
  });
});
