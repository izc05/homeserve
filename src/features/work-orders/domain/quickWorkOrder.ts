import type { CreateWorkOrderInput, CreateWorkOrderRequirements } from '../api/workOrderCommands';
import type { QuickCreateWorkOrderFormValues } from '../forms/quickCreateWorkOrderSchema';

export const QUICK_WORK_ORDER_REQUIREMENTS: Readonly<CreateWorkOrderRequirements> = {
  checklist: false,
  initialPhotos: false,
  finalPhotos: true,
  measurements: false,
  materials: false,
  technicianSignature: false,
  responsibleSignature: false,
  finalFunctionalTest: false,
  report: false,
  administrativeReview: true,
};

function nullable(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

export function buildQuickWorkOrderInput(
  tenantId: string,
  values: QuickCreateWorkOrderFormValues,
): CreateWorkOrderInput {
  if (!tenantId.trim()) throw new Error('Selecciona una organización antes de crear la OT.');

  return {
    tenantId,
    installationId: values.installationId,
    locationId: values.locationId || null,
    systemId: values.systemId || null,
    assetId: values.assetId || null,
    technicianId: null,
    title: values.title.trim(),
    description: nullable(values.description),
    type: 'averia',
    priority: values.priority,
    plannedAt: null,
    dueAt: null,
    estimatedMinutes: null,
    instructions: null,
    safetyNotes: null,
    expectedResult: null,
    requirements: { ...QUICK_WORK_ORDER_REQUIREMENTS },
  };
}
