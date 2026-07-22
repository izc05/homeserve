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

  it('muestra un estado vacío cuando no existe dirección', () => {
    render(<LocationMapCard installationName="Vivienda Demo" />);
    expect(screen.getByText('Mapa no disponible')).toBeTruthy();
    expect(screen.queryByTitle('Mapa de Vivienda Demo')).toBeNull();
    expect(screen.queryByRole('link', { name: /Cómo llegar/i })).toBeNull();
  });

  it('ofrece una alternativa visible si el mapa externo no carga', () => {
    render(<LocationMapCard address="Calle Demo 7, Madrid" installationName="Vivienda Demo" />);
    expect(screen.getByText(/Si el mapa no carga/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cómo llegar/i })).toBeTruthy();
  });
});
