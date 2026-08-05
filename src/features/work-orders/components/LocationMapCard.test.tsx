// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LocationMapCard from './LocationMapCard';

describe('LocationMapCard', () => {
  afterEach(() => cleanup());

  it('muestra un mapa y un enlace externo a partir de la dirección recibida', () => {
    render(<LocationMapCard address="Calle Demo 7, Madrid" installationName="Vivienda Demo" />);

    const frame = screen.getByTitle('Mapa de Vivienda Demo');
    expect(frame.getAttribute('src')).toContain('Calle%20Demo%207%2C%20Madrid');
    expect(frame.getAttribute('src')).not.toContain('key=');
    const link = screen.getByRole('link', { name: /Cómo llegar/i });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('prioriza coordenadas y las muestra como metadato de la ubicación', () => {
    render(<LocationMapCard
      address="Dirección secundaria"
      latitude={37.177336}
      longitude={-3.598557}
      installationName="Hospital Demo"
    />);

    expect(screen.getByTitle('Mapa de Hospital Demo').getAttribute('src')).toContain('37.177336%2C-3.598557');
    expect(screen.getByText('37.177336, -3.598557')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cómo llegar/i }).getAttribute('href')).toContain('37.177336%2C-3.598557');
  });

  it('muestra un estado vacío cuando no existe dirección ni coordenadas', () => {
    render(<LocationMapCard installationName="Vivienda Demo" />);
    expect(screen.getByText('Mapa no disponible')).toBeTruthy();
    expect(screen.queryByTitle('Mapa de Vivienda Demo')).toBeNull();
    expect(screen.queryByRole('link', { name: /Cómo llegar/i })).toBeNull();
  });

  it('ofrece una alternativa visible y discreta mientras se carga el mapa externo', () => {
    render(<LocationMapCard address="Calle Demo 7, Madrid" installationName="Vivienda Demo" />);
    expect(screen.getByText(/Mapa cargado bajo demanda/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cómo llegar/i })).toBeTruthy();
  });
});
