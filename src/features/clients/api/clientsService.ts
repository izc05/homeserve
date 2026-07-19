import { getSupabaseClient } from '../../../lib/supabase';
import {
  createClient,
  createClientInstallation,
  getClientDetail,
  listClients,
  setClientStatus,
  setInstallationStatus,
  updateClient,
  updateClientInstallation,
} from './clientRepository';
import type {
  ClientInstallation,
  CreateClientInput,
  CreateInstallationInput,
  EntityStatus,
  UpdateClientInput,
  UpdateInstallationInput,
} from '../types/client';

export const clientsService = {
  list: (tenantId: string) => listClients(getSupabaseClient(), tenantId),
  detail: (tenantId: string, clientId: string) => getClientDetail(getSupabaseClient(), tenantId, clientId),
  create: (input: CreateClientInput) => createClient(getSupabaseClient(), input),
  update: (tenantId: string, clientId: string, input: UpdateClientInput) => updateClient(getSupabaseClient(), tenantId, clientId, input),
  setStatus: (tenantId: string, clientId: string, status: EntityStatus) => setClientStatus(getSupabaseClient(), tenantId, clientId, status),
  createInstallation: (input: CreateInstallationInput) => createClientInstallation(getSupabaseClient(), input),
  updateInstallation: (tenantId: string, installationId: string, input: UpdateInstallationInput) => updateClientInstallation(getSupabaseClient(), tenantId, installationId, input),
  setInstallationStatus: (tenantId: string, installation: ClientInstallation, status: EntityStatus) => setInstallationStatus(getSupabaseClient(), tenantId, installation, status),
};
