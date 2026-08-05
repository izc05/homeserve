import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Building2, LoaderCircle, MapPin, Save, UserRound } from 'lucide-react';
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
      <div className="client-form-sections">
        <section className="client-form-section" aria-labelledby="installation-identity-heading">
          <header className="client-form-section-heading">
            <span className="client-form-section-icon"><Building2 size={19} /></span>
            <div>
              <h3 id="installation-identity-heading">Identificación de la instalación</h3>
              <p>Nombre, código y tipo de centro que aparecerán en las órdenes de trabajo.</p>
            </div>
          </header>
          <div className="form-grid">
            <label className="full-field">Nombre instalación
              <input {...form.register('name')} placeholder="Instalación o centro" />
              {errors.name && <small className="field-error">{errors.name.message}</small>}
            </label>
            <label>Código
              <input {...form.register('code')} placeholder="7D001" />
            </label>
            <label>Tipo
              <input {...form.register('type')} placeholder="Fotovoltaica, industrial..." />
            </label>
            <label>Estado
              <select {...form.register('status')}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select>
            </label>
          </div>
        </section>

        <section className="client-form-section" aria-labelledby="installation-location-heading">
          <header className="client-form-section-heading">
            <span className="client-form-section-icon"><MapPin size={19} /></span>
            <div>
              <h3 id="installation-location-heading">Ubicación e información operativa</h3>
              <p>Dirección, accesos y particularidades que necesita conocer el técnico.</p>
            </div>
          </header>
          <div className="form-grid">
            <label className="full-field">Dirección
              <input {...form.register('address')} placeholder="Dirección de la instalación" />
            </label>
            <label className="full-field">Descripción
              <textarea {...form.register('description')} placeholder="Acceso, particularidades técnicas o información operativa." rows={4} />
            </label>
          </div>
        </section>

        <section className="client-form-section" aria-labelledby="installation-contact-heading">
          <header className="client-form-section-heading">
            <span className="client-form-section-icon"><UserRound size={19} /></span>
            <div>
              <h3 id="installation-contact-heading">Contacto en la instalación</h3>
              <p>Responsable local y datos de contacto para coordinar el acceso o la intervención.</p>
            </div>
          </header>
          <div className="form-grid">
            <label>Contacto
              <input {...form.register('contactName')} placeholder="Responsable en planta" />
            </label>
            <label>Teléfono contacto
              <input {...form.register('contactPhone')} placeholder="600 000 000" />
            </label>
            <label className="full-field">Correo contacto
              <input {...form.register('contactEmail')} placeholder="planta@empresa.es" type="email" />
              {errors.contactEmail && <small className="field-error">{errors.contactEmail.message}</small>}
            </label>
          </div>
        </section>
      </div>

      {submitError && <p className="form-global-error"><AlertTriangle size={17} /> {submitError}</p>}
      <div className="form-actions"><button className="primary-button" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{submitLabel}</button></div>
    </form>
  );
}
