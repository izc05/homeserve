import { z } from 'zod';
import {
  TECHNICAL_SYSTEM_CRITICALITIES,
  TECHNICAL_SYSTEM_STATUSES,
} from '../types/technicalSystem';

const optionalText = (limit: number) => z.string().trim().max(limit).optional().default('');

export const installationTechnicalSystemFormSchema = z.object({
  name: z.string().trim().min(2, 'Indica el nombre del sistema').max(180),
  code: optionalText(80),
  specialty: z.string().trim().min(2, 'Indica la especialidad').max(80).default('general'),
  description: optionalText(4000),
  criticality: z.enum(TECHNICAL_SYSTEM_CRITICALITIES).default('media'),
  status: z.enum(TECHNICAL_SYSTEM_STATUSES).default('activo'),
});

export type InstallationTechnicalSystemFormValues = z.infer<typeof installationTechnicalSystemFormSchema>;
