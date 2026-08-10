import type { EntityStatus } from './client';

export type ClientLocation = {
  id: string;
  tenantId: string;
  installationId: string;
  name: string;
  code: string | null;
  type: string | null;
  description: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type InstallationLocationInput = {
  tenantId: string;
  installationId: string;
  name: string;
  code?: string | null;
  type?: string | null;
  description?: string | null;
  status?: EntityStatus;
};

export type UpdateInstallationLocationInput = Omit<InstallationLocationInput, 'tenantId' | 'installationId'>;
