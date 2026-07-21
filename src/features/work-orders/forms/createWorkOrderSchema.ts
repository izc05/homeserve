import { z } from 'zod';
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_TYPES,
} from '../types/workOrder';

const optionalUuid = z
  .string()
  .trim()
  .refine((value) => value === '' || z.string().uuid().safeParse(value).success, 'Identificador no válido');

const optionalDateTime = z.string().trim();

const optionalMinutes = z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  z.coerce.number().int().min(1).max(43200).optional(),
);

export const createWorkOrderSchema = z
  .object({
    title: z.string().trim().min(3, 'Escribe al menos 3 caracteres').max(180),
    description: z.string().max(8000).optional().default(''),
    clientId: z.string().uuid('Selecciona un cliente'),
    installationId: z.string().uuid('Selecciona una instalación'),
    locationId: optionalUuid.default(''),
    assetId: optionalUuid.default(''),
    technicianId: optionalUuid.default(''),
    type: z.enum(WORK_ORDER_TYPES),
    priority: z.enum(WORK_ORDER_PRIORITIES),
    plannedAt: optionalDateTime.default(''),
    dueAt: optionalDateTime.default(''),
    estimatedMinutes: optionalMinutes,
    instructions: z.string().max(5000).optional().default(''),
    safetyNotes: z.string().max(5000).optional().default(''),
    expectedResult: z.string().max(5000).optional().default(''),
    checklist: z.boolean().default(true),
    initialPhotos: z.boolean().default(false),
    finalPhotos: z.boolean().default(true),
    measurements: z.boolean().default(false),
    materials: z.boolean().default(false),
    technicianSignature: z.boolean().default(true),
    responsibleSignature: z.boolean().default(false),
    finalFunctionalTest: z.boolean().default(false),
    report: z.boolean().default(true),
    administrativeReview: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (value.plannedAt && value.dueAt && new Date(value.dueAt) < new Date(value.plannedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueAt'],
        message: 'La fecha límite no puede ser anterior a la fecha prevista',
      });
    }
  });

export type CreateWorkOrderFormValues = z.infer<typeof createWorkOrderSchema>;

export function localDateTimeToIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
