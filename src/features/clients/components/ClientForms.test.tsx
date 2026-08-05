// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ClientForm from './ClientForm';
import InstallationForm from './InstallationForm';

const submitClient = async () => undefined;
const submitInstallation = async () => undefined;

afterEach(cleanup);

describe('Client and installation forms', () => {
  it('organizes the client form into clear operational sections', () => {
    render(<ClientForm submitLabel="Crear cliente" onSubmit={submitClient} />);

    expect(screen.getByRole('heading', { name: 'Identificación' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Contacto y comunicación' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ubicación y observaciones' })).toBeTruthy();
    expect(screen.getByLabelText('Nombre')).toBeTruthy();
    expect(screen.getByLabelText('Correo')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Crear cliente/ })).toBeTruthy();
  });

  it('organizes the installation form around identity, location and contact', () => {
    render(<InstallationForm clientId="client-1" submitLabel="Guardar instalación" onSubmit={submitInstallation} />);

    expect(screen.getByRole('heading', { name: 'Identificación de la instalación' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ubicación e información operativa' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Contacto en la instalación' })).toBeTruthy();
    expect(screen.getByLabelText('Nombre instalación')).toBeTruthy();
    expect(screen.getByLabelText('Dirección')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Guardar instalación/ })).toBeTruthy();
  });
});
