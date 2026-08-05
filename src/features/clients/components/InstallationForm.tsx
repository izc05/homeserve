import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, LocateFixed, LoaderCircle, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import LocationMapCard from '../../work-orders/components/LocationMapCard';
import { installationFormSchema, type InstallationFormValues } from '../schemas/clientSchemas';

const EMPTY_VALUES: InstallationFormValues = {
  clientId: '', name: '', code: '', type: '', address: '', latitude: null, longitude: null, description: '', contactName: '', contactPhone: '', contactEmail: '', status: 'activo',
};

type InstallationFormProps = {
  clientId: string;
  initialValues?: Partial<InstallationFormValues>;
  submitLabel: string;
  onSubmit: (values: InstallationFormValues) => Promise<void>;
};

export default function InstallationForm({ clientId, initialValues, submitLabel, onSubmit }: InstallationFormProps) {
  const [submitError, setSubmitError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [locating, setLocating] = useState(false);
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
    setLocationStatus('');
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
  const address = form.watch('address');
  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');
  const installationName = form.watch('name');

  const useCurrentLocation = () => {
    setLocationStatus('');
    if (!navigator.geolocation) {
      setLocationStatus('Este dispositivo no permite obtener la ubicación.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', Number(position.coords.latitude.toFixed(6)), { shouldDirty: true, shouldValidate: true });
        form.setValue('longitude', Number(position.coords.longitude.toFixed(6)), { shouldDirty: true, shouldValidate: true });
        setLocationStatus(`Ubicación obtenida con una precisión aproximada de ${Math.round(position.coords.accuracy)} m.`);
        setLocating(false);
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setLocationStatus(denied ? 'No se concedió permiso para usar la ubicación.' : 'No se pudo obtener la ubicación actual.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  };

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
        <label>Latitud
          <input inputMode="decimal" step="0.000001" type="number" {...form.register('latitude', { setValueAs: (value) => value === '' ? null : Number(value) })} placeholder="37.177336" />
          {errors.latitude && <small className="field-error">{errors.latitude.message}</small>}
        </label>
        <label>Longitud
          <input inputMode="decimal" step="0.000001" type="number" {...form.register('longitude', { setValueAs: (value) => value === '' ? null : Number(value) })} placeholder="-3.598557" />
          {errors.longitude && <small className="field-error">{errors.longitude.message}</small>}
        </label>
        <div className="full-field installation-geolocation-actions">
          <button className="secondary-button" disabled={locating} onClick={useCurrentLocation} type="button">{locating ? <LoaderCircle className="spin" size={17} /> : <LocateFixed size={17} />} Usar ubicación actual</button>
          {locationStatus && <small role="status">{locationStatus}</small>}
        </div>
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
      {(address || (Number.isFinite(latitude) && Number.isFinite(longitude))) && <LocationMapCard address={address} latitude={latitude} longitude={longitude} installationName={installationName || 'Vista previa'} className="installation-form-map" />}
      {submitError && <p className="form-global-error"><AlertTriangle size={17} /> {submitError}</p>}
      <div className="form-actions"><button className="primary-button" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{submitLabel}</button></div>
    </form>
  );
}
