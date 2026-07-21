import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, LoaderCircle, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { installationFormSchema, type InstallationFormValues } from '../schemas/clientSchemas';

const EMPTY_VALUES: InstallationFormValues = {
  clientId: '', name: '', code: '', type: '', address: '', description: '', contactName: '', contactPhone: '', contactEmail: '', status: 'activo',
};

type InstallationFormProps = {
  clientId: string;
  initialValues?: Partial<InstallationFormValues>;
  submitLabel: string;
  onSubmit: (values: InstallationFormValues) => Promise<void>;
};

export default function InstallationForm({ clientId, initialValues, submitLabel, onSubmit }: InstallationFormProps) {
  const [submitError, setSubmitError] = useState('');
  const previousValues = useRef({ clientId, initialValues });
  const form = useForm<InstallationFormValues>({
    resolver: zodResolver(installationFormSchema),
    defaultValues: { ...EMPTY_VALUES, clientId, ...initialValues },
  });

  useEffect(() => {
    if (previousValues.current.clientId === clientId && JSON.stringify(previousValues.current.initialValues) === JSON.stringify(initialValues)) return;
    form.reset({ ...EMPTY_VALUES, clientId, ...initialValues });
    previousValues.current = { clientId, initialValues };
    setSubmitError('');
  }, [clientId, form, initialValues]);

  const submit = form.handleSubmit(async (values) => {
    setSubmitError('');
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo guardar la instalación.');
    }
  });
  const errors = form.formState.errors;

  return (
    <form className="client-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <input type="hidden" {...form.register('clientId')} />
      <div className="form-grid">
        <label>Nombre instalación
          <input {...form.register('name')} placeholder="Instalación o centro" />
          {errors.name && <small className="field-error">{errors.name.message}</small>}
        </label>
        <label>Código
          <input {...form.register('code')} placeholder="7D001" />
        </label>
        <label>Tipo
          <input {...form.register('type')} placeholder="Fotovoltaica, industrial..." />
        </label>
        <label className="full-field">Dirección
          <input {...form.register('address')} placeholder="Dirección de la instalación" />
        </label>
        <label>Contacto
          <input {...form.register('contactName')} placeholder="Responsable en planta" />
        </label>
        <label>Teléfono contacto
          <input {...form.register('contactPhone')} placeholder="600 000 000" />
        </label>
        <label>Correo contacto
          <input {...form.register('contactEmail')} placeholder="planta@empresa.es" type="email" />
          {errors.contactEmail && <small className="field-error">{errors.contactEmail.message}</small>}
        </label>
        <label>Estado
          <select {...form.register('status')}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select>
        </label>
        <label className="full-field">Descripción
          <textarea {...form.register('description')} placeholder="Acceso, particularidades técnicas o información operativa." rows={3} />
        </label>
      </div>
      {submitError && <p className="form-global-error"><AlertTriangle size={17} /> {submitError}</p>}
      <div className="form-actions"><button className="primary-button" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{submitLabel}</button></div>
    </form>
  );
}
