import type { WorkOrderStatus } from '../../work-orders/types/workOrder';

export type EntityStatus = 'activo' | 'inactivo';

export type ClientRecord = {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  cifNif: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClientListItem = ClientRecord & {
  installationCount: number;
  openWorkOrderCount: number;
};

export type ClientInstallation = {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  code: string | null;
  type: string | null;
  address: string | null;
  description: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClientWorkOrderSummary = {
  id: string;
  code: string;
  title: string;
  status: WorkOrderStatus;
  updatedAt: string;
};

export type ClientDetail = {
  client: ClientRecord;
  installations: ClientInstallation[];
  openWorkOrders: ClientWorkOrderSummary[];
  recentWorkOrders: ClientWorkOrderSummary[];
};

export type CreateClientInput = Omit<ClientRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> & {
  tenantId: string;
};

export type UpdateClientInput = Omit<CreateClientInput, 'tenantId'>;

export type CreateInstallationInput = Omit<ClientInstallation, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> & {
  tenantId: string;
};

export type UpdateInstallationInput = Omit<CreateInstallationInput, 'tenantId' | 'clientId'>;
