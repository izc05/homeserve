import { z } from 'zod';

export const ENTITY_STATUSES = ['activo', 'inactivo'] as const;

const optionalText = (limit: number) => z.string().trim().max(limit).optional().default('');
const optionalEmail = z.string().trim().email('Indica un correo válido').or(z.literal('')).default('');
const optionalCoordinate = (minimum: number, maximum: number, message: string) => z.preprocess(
  (value) => value === '' || value === null || value === undefined || Number.isNaN(value) ? null : Number(value),
  z.number().min(minimum, message).max(maximum, message).nullable(),
);

export const clientFormSchema = z.object({
  name: z.string().trim().min(2, 'Indica el nombre del cliente').max(180),
  code: optionalText(80),
  cifNif: optionalText(80),
  contactName: optionalText(180),
  email: optionalEmail,
  phone: optionalText(50),
  address: optionalText(500),
  notes: optionalText(4000),
  status: z.enum(ENTITY_STATUSES).default('activo'),
});

export const installationFormSchema = z.object({
  clientId: z.string().uuid('Selecciona un cliente'),
  name: z.string().trim().min(2, 'Indica el nombre de la instalación').max(180),
  code: optionalText(80),
  type: optionalText(120),
  address: optionalText(500),
  latitude: optionalCoordinate(-90, 90, 'La latitud debe estar entre -90 y 90'),
  longitude: optionalCoordinate(-180, 180, 'La longitud debe estar entre -180 y 180'),
  description: optionalText(4000),
  contactName: optionalText(180),
  contactPhone: optionalText(50),
  contactEmail: optionalEmail,
  status: z.enum(ENTITY_STATUSES).default('activo'),
}).superRefine((values, context) => {
  if ((values.latitude === null) !== (values.longitude === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Indica latitud y longitud juntas',
      path: values.latitude === null ? ['latitude'] : ['longitude'],
    });
  }
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
export type InstallationFormValues = z.infer<typeof installationFormSchema>;
