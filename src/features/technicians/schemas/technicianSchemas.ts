import { z } from 'zod';

export const technicianInvitationSchema = z.object({
  name: z.string().trim().min(2, 'Indica el nombre del técnico').max(180),
  email: z.string().trim().email('Indica un correo válido'),
  phone: z.string().trim().max(50).optional().default(''),
  specialty: z.string().trim().max(180).optional().default(''),
  role: z.enum(['tecnico', 'tecnico_externo']),
  requireMfa: z.boolean().default(false),
});

export type TechnicianInvitationFormValues = z.infer<typeof technicianInvitationSchema>;
