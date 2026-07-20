import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, LoaderCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { technicianInvitationSchema, type TechnicianInvitationFormValues } from '../schemas/technicianSchemas';

type Props = {
  onSubmit: (values: TechnicianInvitationFormValues) => Promise<void>;
};

export default function TechnicianInvitationForm({ onSubmit }: Props) {
  const [submitError, setSubmitError] = useState('');
  const form = useForm<TechnicianInvitationFormValues>({
    resolver: zodResolver(technicianInvitationSchema),
    defaultValues: { name: '', email: '', phone: '', specialty: '', role: 'tecnico', requireMfa: false },
  });
  const submit = form.handleSubmit(async (values) => {
    setSubmitError('');
    try {
      await onSubmit(values);
      form.reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo crear la invitación.');
    }
  });
  return <form className="technician-invite-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <label>Nombre<input {...form.register('name')} placeholder="Nombre y apellidos" />{form.formState.errors.name && <small className="field-error">{form.formState.errors.name.message}</small>}</label>
    <label>Correo<input {...form.register('email')} placeholder="tecnico@empresa.es" type="email" />{form.formState.errors.email && <small className="field-error">{form.formState.errors.email.message}</small>}</label>
    <label>Teléfono<input {...form.register('phone')} placeholder="600 000 000" /></label>
    <label>Especialidad<input {...form.register('specialty')} placeholder="Fotovoltaica, electricidad..." /></label>
    <label>Tipo de técnico<select {...form.register('role')}><option value="tecnico">Técnico</option><option value="tecnico_externo">Técnico externo</option></select></label>
    <label className="checkbox-field"><input {...form.register('requireMfa')} type="checkbox" /> Exigir MFA</label>
    {submitError && <p className="form-global-error full-field"><AlertTriangle size={17} /> {submitError}</p>}
    <button className="primary-button" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />} Crear invitación</button>
  </form>;
}
