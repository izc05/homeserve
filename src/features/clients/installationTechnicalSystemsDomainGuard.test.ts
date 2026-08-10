import { describe, expect, it } from 'vitest';
import capabilitiesSource from '../../auth/capabilities.ts?raw';
import locationsPanelSource from './components/InstallationLocationsPanel.tsx?raw';
import systemsPanelSource from './components/InstallationTechnicalSystemsPanel.tsx?raw';
import repositorySource from './api/installationTechnicalSystemRepository.ts?raw';
import migrationSource from '../../../supabase/migrations/20260810161500_add_installation_technical_systems_v1.sql?raw';

describe('OT-05 technical systems domain guard', () => {
  it('keeps a dedicated systems management capability', () => {
    expect(capabilitiesSource).toContain("'installations.systems.manage'");
    expect(capabilitiesSource).toContain("'installations.locations.manage'");
  });

  it('shows technical systems from the existing installation context without replacing locations', () => {
    expect(locationsPanelSource).toContain('InstallationTechnicalSystemsPanel');
    expect(locationsPanelSource).toContain('InstallationLocationsPanel');
    expect(locationsPanelSource).toContain('Ubicaciones / zonas');
    expect(systemsPanelSource).toContain('Sistemas técnicos');
  });

  it('states that the technical system remains optional for work orders', () => {
    expect(systemsPanelSource).toContain('el sistema seguirá siendo opcional');
    expect(systemsPanelSource).not.toContain('sistema obligatorio');
  });

  it('does not expose physical deletion from the frontend repository', () => {
    expect(repositorySource).not.toContain('.delete(');
    expect(repositorySource).not.toContain('.remove(');
  });

  it('does not modify assets or work orders in the v1 system migration', () => {
    expect(migrationSource).toContain('create table public.sistemas_instalacion');
    expect(migrationSource).not.toContain('alter table public.activos');
    expect(migrationSource).not.toContain('alter table public.ordenes_trabajo');
    expect(migrationSource).not.toContain('insert into public.sistemas_instalacion');
  });

  it('does not grant physical delete privileges in SQL', () => {
    expect(migrationSource).toContain('grant select, insert, update on public.sistemas_instalacion to authenticated');
    expect(migrationSource).not.toContain('grant select, insert, update, delete');
    expect(migrationSource).not.toContain('for delete');
  });
});
