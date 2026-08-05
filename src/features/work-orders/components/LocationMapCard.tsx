import { useState } from 'react';
import { AlertTriangle, ExternalLink, MapPin } from 'lucide-react';
import { workOrderDirectionsUrl, workOrderEmbedMapUrl } from '../domain/workOrderDirections';

type Props = {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  installationName?: string | null;
  className?: string;
};

export default function LocationMapCard({ address, latitude, longitude, installationName, className = '' }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const location = { address, latitude, longitude };
  const mapUrl = workOrderEmbedMapUrl(location);
  const directionsUrl = workOrderDirectionsUrl(location);
  const mapFailed = Boolean(mapUrl && failedUrl === mapUrl);
  const coordinatesLabel = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
    : null;

  return <section className={`location-map-card ${className}`.trim()} aria-labelledby="location-map-card-title">
    <header>
      <span className="location-map-icon" aria-hidden="true"><MapPin size={20} /></span>
      <div><span>Ubicación de la instalación</span><h3 id="location-map-card-title">{installationName || 'Cómo llegar'}</h3><p>{address?.trim() || coordinatesLabel || 'Ubicación pendiente'}</p>{address && coordinatesLabel && <small>{coordinatesLabel}</small>}</div>
      {directionsUrl && <a className="secondary-button location-map-directions" href={directionsUrl} rel="noopener noreferrer" target="_blank"><ExternalLink size={17} /> Cómo llegar</a>}
    </header>

    {!mapUrl && <div className="location-map-fallback"><MapPin size={28} /><strong>Mapa no disponible</strong><p>La instalación todavía no tiene dirección ni coordenadas registradas.</p></div>}
    {mapUrl && mapFailed && <div className="location-map-fallback" role="status"><AlertTriangle size={28} /><strong>No se pudo cargar el mapa</strong><p>La ubicación sigue disponible y puedes abrir las indicaciones externas.</p></div>}
    {mapUrl && !mapFailed && <><iframe
      allowFullScreen
      loading="lazy"
      onError={() => setFailedUrl(mapUrl)}
      referrerPolicy="no-referrer-when-downgrade"
      src={mapUrl}
      title={`Mapa de ${installationName || address || coordinatesLabel || 'la instalación'}`}
    /><p className="location-map-assist">Mapa cargado bajo demanda. Si no aparece, utiliza “Cómo llegar”.</p></>}
  </section>;
}
