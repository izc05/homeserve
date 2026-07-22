import { useState } from 'react';
import { AlertTriangle, ExternalLink, MapPin } from 'lucide-react';
import { workOrderDirectionsUrl, workOrderEmbedMapUrl } from '../domain/workOrderDirections';

type Props = {
  address?: string | null;
  installationName?: string | null;
  className?: string;
};

export default function LocationMapCard({ address, installationName, className = '' }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const mapUrl = workOrderEmbedMapUrl({ address });
  const directionsUrl = workOrderDirectionsUrl({ address });
  const mapFailed = Boolean(mapUrl && failedUrl === mapUrl);

  return <section className={`location-map-card ${className}`.trim()} aria-labelledby="location-map-card-title">
    <header>
      <span className="location-map-icon" aria-hidden="true"><MapPin size={20} /></span>
      <div><span>Ubicación de la instalación</span><h3 id="location-map-card-title">{installationName || 'Cómo llegar'}</h3><p>{address?.trim() || 'Dirección pendiente'}</p></div>
      {directionsUrl && <a className="secondary-button location-map-directions" href={directionsUrl} rel="noopener noreferrer" target="_blank"><ExternalLink size={17} /> Cómo llegar</a>}
    </header>

    {!mapUrl && <div className="location-map-fallback"><MapPin size={28} /><strong>Mapa no disponible</strong><p>La instalación todavía no tiene una dirección registrada.</p></div>}
    {mapUrl && mapFailed && <div className="location-map-fallback" role="status"><AlertTriangle size={28} /><strong>No se pudo cargar el mapa</strong><p>La dirección sigue disponible y puedes abrir las indicaciones externas.</p></div>}
    {mapUrl && !mapFailed && <><iframe
      allowFullScreen
      loading="lazy"
      onError={() => setFailedUrl(mapUrl)}
      referrerPolicy="no-referrer-when-downgrade"
      src={mapUrl}
      title={`Mapa de ${installationName || address || 'la instalación'}`}
    /><p className="location-map-assist">Si el mapa no carga, utiliza “Cómo llegar” para abrir las indicaciones.</p></>}
  </section>;
}
