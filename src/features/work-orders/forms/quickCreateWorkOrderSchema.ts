import { z } from 'zod';
import { WORK_ORDER_PRIORITIES } from '../types/workOrder';

const optionalUuid = z
  .string()
  .trim()
  .refine((value) => value === '' || z.string().uuid().safeParse(value).success, 'Identificador no válido');

export const quickCreateWorkOrderSchema = z.object({
  clientId: z.string().uuid('Selecciona un cliente'),
  installationId: z.string().uuid('Selecciona una instalación'),
  locationId: optionalUuid.default(''),
  systemId: optionalUuid.default(''),
  assetId: optionalUuid.default(''),
  title: z.string().trim().min(3, 'Describe el problema con al menos 3 caracteres').max(180),
  description: z.string().max(8000).optional().default(''),
  priority: z.enum(WORK_ORDER_PRIORITIES).default('normal'),
});

export type QuickCreateWorkOrderFormValues = z.infer<typeof quickCreateWorkOrderSchema>;
