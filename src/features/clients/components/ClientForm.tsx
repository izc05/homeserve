import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Building2, LoaderCircle, MapPin, Save, UserRound } from 'lucide-react';
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
      <div className="client-form-sections">
        <section className="client-form-section" aria-labelledby="client-identity-heading">
          <header className="client-form-section-heading">
            <span className="client-form-section-icon"><Building2 size={19} /></span>
            <div>
              <h3 id="client-identity-heading">Identificación</h3>
              <p>Datos comerciales y fiscales que permiten localizar al cliente sin confusiones.</p>
            </div>
          </header>
          <div className="form-grid">
            <label className="full-field">Nombre
              <input {...form.register('name')} autoComplete="organization" placeholder="Nombre comercial o razón social" />
              {errors.name && <small className="field-error">{errors.name.message}</small>}
            </label>
            <label>Código
              <input {...form.register('code')} placeholder="CLI-001" />
            </label>
            <label>CIF/NIF
              <input {...form.register('cifNif')} placeholder="B12345678" />
            </label>
            <label>Estado
              <select {...form.register('status')}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select>
            </label>
          </div>
        </section>

        <section className="client-form-section" aria-labelledby="client-contact-heading">
          <header className="client-form-section-heading">
            <span className="client-form-section-icon"><UserRound size={19} /></span>
            <div>
              <h3 id="client-contact-heading">Contacto y comunicación</h3>
              <p>Persona responsable y canales habituales para coordinar las órdenes de trabajo.</p>
            </div>
          </header>
          <div className="form-grid">
            <label>Persona de contacto
              <input {...form.register('contactName')} placeholder="Nombre y apellidos" />
            </label>
            <label>Teléfono
              <input {...form.register('phone')} autoComplete="tel" placeholder="600 000 000" />
            </label>
            <label className="full-field">Correo
              <input {...form.register('email')} autoComplete="email" placeholder="contacto@empresa.es" type="email" />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </label>
          </div>
        </section>

        <section className="client-form-section" aria-labelledby="client-location-heading">
          <header className="client-form-section-heading">
            <span className="client-form-section-icon"><MapPin size={19} /></span>
            <div>
              <h3 id="client-location-heading">Ubicación y observaciones</h3>
              <p>Dirección principal e información operativa que debe conservarse en la ficha.</p>
            </div>
          </header>
          <div className="form-grid">
            <label className="full-field">Dirección
              <input {...form.register('address')} autoComplete="street-address" placeholder="Calle, número, localidad" />
            </label>
            <label className="full-field">Observaciones
              <textarea {...form.register('notes')} placeholder="Información relevante para la relación operativa." rows={4} />
            </label>
          </div>
        </section>
      </div>

      {submitError && <p className="form-global-error"><AlertTriangle size={17} /> {submitError}</p>}
      <div className="form-actions"><button className="primary-button" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{submitLabel}</button></div>
    </form>
  );
}
