import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, LoaderCircle, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { clientFormSchema, type ClientFormValues } from '../schemas/clientSchemas';

const EMPTY_VALUES: ClientFormValues = {
  name: '', code: '', cifNif: '', contactName: '', email: '', phone: '', address: '', notes: '', status: 'activo',
};

type ClientFormProps = {
  initialValues?: Partial<ClientFormValues>;
  submitLabel: string;
  onSubmit: (values: ClientFormValues) => Promise<void>;
};

export default function ClientForm({ initialValues, submitLabel, onSubmit }: ClientFormProps) {
  const [submitError, setSubmitError] = useState('');
  const previousInitialValues = useRef(initialValues);
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { ...EMPTY_VALUES, ...initialValues },
  });

  useEffect(() => {
    if (JSON.stringify(previousInitialValues.current) === JSON.stringify(initialValues)) return;
    form.reset({ ...EMPTY_VALUES, ...initialValues });
    previousInitialValues.current = initialValues;
    setSubmitError('');
  }, [form, initialValues]);

  const submit = form.handleSubmit(async (values) => {
    setSubmitError('');
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo guardar el cliente.');
    }
  });
  const errors = form.formState.errors;

  return (
    <form className="client-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="form-grid">
        <label>Nombre
          <input {...form.register('name')} autoComplete="organization" placeholder="Nombre comercial" />
          {errors.name && <small className="field-error">{errors.name.message}</small>}
        </label>
        <label>Código
          <input {...form.register('code')} placeholder="CLI-001" />
        </label>
        <label>CIF/NIF
          <input {...form.register('cifNif')} placeholder="B12345678" />
        </label>
        <label>Persona de contacto
          <input {...form.register('contactName')} placeholder="Nombre y apellidos" />
        </label>
        <label>Correo
          <input {...form.register('email')} autoComplete="email" placeholder="contacto@empresa.es" type="email" />
          {errors.email && <small className="field-error">{errors.email.message}</small>}
        </label>
        <label>Teléfono
          <input {...form.register('phone')} autoComplete="tel" placeholder="600 000 000" />
        </label>
        <label className="full-field">Dirección
          <input {...form.register('address')} autoComplete="street-address" placeholder="Calle, número, localidad" />
        </label>
        <label className="full-field">Observaciones
          <textarea {...form.register('notes')} placeholder="Información relevante para la relación operativa." rows={3} />
        </label>
        <label>Estado
          <select {...form.register('status')}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select>
        </label>
      </div>
      {submitError && <p className="form-global-error"><AlertTriangle size={17} /> {submitError}</p>}
      <div className="form-actions"><button className="primary-button" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{submitLabel}</button></div>
    </form>
  );
}
