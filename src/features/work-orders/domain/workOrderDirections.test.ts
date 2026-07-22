import { describe, expect, it } from 'vitest';
import { workOrderDirectionsUrl, workOrderEmbedMapUrl } from './workOrderDirections';

describe('work order directions', () => {
  it('codifica una dirección real sin usar claves de mapas', () => {
    const url = workOrderDirectionsUrl({ address: 'Calle Demostración 1, 28000 Madrid' });
    expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=Calle%20Demostraci%C3%B3n%201%2C%2028000%20Madrid');
    expect(url).not.toContain('key=');
  });

  it('prioriza coordenadas válidas y conserva el estado vacío', () => {
    expect(workOrderDirectionsUrl({ address: 'Dirección secundaria', latitude: 40.4168, longitude: -3.7038 })).toContain('destination=40.4168%2C-3.7038');
    expect(workOrderDirectionsUrl({ address: '  ' })).toBeNull();
  });

  it('genera un mapa embebido sin clave a partir de la dirección recibida', () => {
    const url = workOrderEmbedMapUrl({ address: 'Calle Demostración 1, Madrid' });
    expect(url).toBe('https://www.google.com/maps?q=Calle%20Demostraci%C3%B3n%201%2C%20Madrid&output=embed');
    expect(url).not.toContain('key=');
    expect(workOrderEmbedMapUrl({ address: null })).toBeNull();
  });
});
