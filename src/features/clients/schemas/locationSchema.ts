import { z } from 'zod';
import { ENTITY_STATUSES } from './clientSchemas';

const optionalText = (limit: number) => z.string().trim().max(limit).optional().default('');

export const installationLocationFormSchema = z.object({
  name: z.string().trim().min(2, 'Indica el nombre de la ubicación').max(180),
  code: optionalText(80),
  type: optionalText(120),
  description: optionalText(4000),
  status: z.enum(ENTITY_STATUSES).default('activo'),
});

export type InstallationLocationFormValues = z.infer<typeof installationLocationFormSchema>;
