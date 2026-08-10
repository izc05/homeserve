import { describe, expect, it } from 'vitest';
import appSource from '../../../App.tsx?raw';
import repositorySource from '../api/installationLocationRepository.ts?raw';
import clientsWorkspaceSource from '../pages/ClientsWorkspace.tsx?raw';
import panelSource from './InstallationLocationsPanel.tsx?raw';

describe('installation locations domain guard', () => {
  it('keeps location management behind an explicit capability in App', () => {
    expect(appSource).toContain("hasCapability(viewerRole, 'installations.locations.manage')");
    expect(appSource).toContain('canManageLocations={canManageLocations}');
  });

  it('keeps locations inside the selected installation workspace', () => {
    expect(clientsWorkspaceSource).toContain("import InstallationLocationsPanel from '../components/InstallationLocationsPanel';");
    expect(clientsWorkspaceSource).toContain('<InstallationLocationsPanel');
    expect(clientsWorkspaceSource).toContain('installationId={installationDetail.id}');
    expect(clientsWorkspaceSource).toContain('canManage={canManageLocations}');
  });

  it('refreshes the work-order creation catalog after location changes', () => {
    expect(panelSource).toContain("invalidateQueries({ queryKey: ['work-order-creation-catalog', tenantId] })");
  });

  it('keeps location optional in OT copy', () => {
    expect(panelSource).toContain('La ubicación seguirá siendo opcional al crear una OT.');
  });

  it('uses soft-state management and never exposes physical delete', () => {
    expect(repositorySource).toContain(".is('deleted_at', null)");
    expect(repositorySource).toContain('setInstallationLocationStatus');
    expect(repositorySource).not.toContain('.delete(');
  });
});
