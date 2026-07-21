import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ClientDetail,
  ClientInstallation,
  ClientListItem,
  ClientRecord,
  ClientWorkOrderSummary,
  CreateClientInput,
  CreateInstallationInput,
  EntityStatus,
  UpdateClientInput,
  UpdateInstallationInput,
} from '../types/client';

type ClientRow = {
  id: string;
  tenant_id: string;
  nombre: string;
  codigo: string | null;
  cif_nif: string | null;
  contacto_nombre: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  observaciones: string | null;
  estado: EntityStatus;
  created_at: string;
  updated_at: string;
};

type InstallationRow = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  nombre: string;
  codigo: string | null;
  tipo: string | null;
  direccion: string | null;
  descripcion: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  estado: EntityStatus;
  created_at: string;
  updated_at: string;
};

type WorkOrderRow = {
  id: string;
  cliente_id: string | null;
  codigo_ot: string;
  titulo: string;
  estado: string;
  updated_at: string;
};

const CLIENT_COLUMNS = 'id,tenant_id,nombre,codigo,cif_nif,contacto_nombre,email,telefono,direccion,observaciones,estado,created_at,updated_at';
const INSTALLATION_COLUMNS = 'id,tenant_id,cliente_id,nombre,codigo,tipo,direccion,descripcion,contacto_nombre,contacto_telefono,contacto_email,estado,created_at,updated_at';
const WORK_ORDER_COLUMNS = 'id,cliente_id,codigo_ot,titulo,estado,updated_at';
const CLOSED_WORK_ORDER_STATUSES = new Set(['VALIDADA', 'CANCELADA']);

function nullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

export function normalizeEntityStatus(value: string): EntityStatus {
  if (value === 'activo' || value === 'inactivo') return value;
  throw new Error('El estado debe ser activo o inactivo.');
}

export function mapClientRow(row: ClientRow): ClientRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    name: String(row.nombre),
    code: row.codigo ? String(row.codigo) : null,
    cifNif: row.cif_nif ? String(row.cif_nif) : null,
    contactName: row.contacto_nombre ? String(row.contacto_nombre) : null,
    email: row.email ? String(row.email) : null,
    phone: row.telefono ? String(row.telefono) : null,
    address: row.direccion ? String(row.direccion) : null,
    notes: row.observaciones ? String(row.observaciones) : null,
    status: normalizeEntityStatus(row.estado),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapInstallationRow(row: InstallationRow): ClientInstallation {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    clientId: String(row.cliente_id),
    name: String(row.nombre),
    code: row.codigo ? String(row.codigo) : null,
    type: row.tipo ? String(row.tipo) : null,
    address: row.direccion ? String(row.direccion) : null,
    description: row.descripcion ? String(row.descripcion) : null,
    contactName: row.contacto_nombre ? String(row.contacto_nombre) : null,
    contactPhone: row.contacto_telefono ? String(row.contacto_telefono) : null,
    contactEmail: row.contacto_email ? String(row.contacto_email) : null,
    status: normalizeEntityStatus(row.estado),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapWorkOrderRow(row: WorkOrderRow): ClientWorkOrderSummary {
  return {
    id: String(row.id),
    code: String(row.codigo_ot),
    title: String(row.titulo),
    status: String(row.estado),
    updatedAt: String(row.updated_at),
  };
}

export function toClientPayload(input: CreateClientInput | UpdateClientInput) {
  return {
    nombre: input.name.trim(),
    codigo: nullableText(input.code),
    cif_nif: nullableText(input.cifNif),
    contacto_nombre: nullableText(input.contactName),
    email: nullableText(input.email),
    telefono: nullableText(input.phone),
    direccion: nullableText(input.address),
    observaciones: nullableText(input.notes),
    estado: normalizeEntityStatus(input.status),
  };
}

export function toInstallationPayload(input: CreateInstallationInput | UpdateInstallationInput) {
  return {
    nombre: input.name.trim(),
    codigo: nullableText(input.code),
    tipo: nullableText(input.type),
    direccion: nullableText(input.address),
    descripcion: nullableText(input.description),
    contacto_nombre: nullableText(input.contactName),
    contacto_telefono: nullableText(input.contactPhone),
    contacto_email: nullableText(input.contactEmail),
    estado: normalizeEntityStatus(input.status),
  };
}

export function filterClients(clients: ClientListItem[], search: string, status: 'todos' | EntityStatus): ClientListItem[] {
  const query = search.trim().toLocaleLowerCase('es-ES');
  return clients.filter((client) => {
    const matchesStatus = status === 'todos' || client.status === status;
    if (!matchesStatus || !query) return matchesStatus;
    return [client.name, client.code, client.cifNif, client.contactName, client.email, client.phone]
      .some((value) => value?.toLocaleLowerCase('es-ES').includes(query));
  });
}

export function filterInstallationsByClient(installations: ClientInstallation[], clientId: string): ClientInstallation[] {
  return installations.filter((installation) => installation.clientId === clientId);
}

export function hasNoInstallations(installations: ClientInstallation[]): boolean {
  return installations.length === 0;
}

export function friendlyClientError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.toLocaleLowerCase('es-ES');
  if (message.includes('row-level security') || message.includes('permission denied')) return 'No tienes permiso para realizar esta acción.';
  if (message.includes('duplicate key') || message.includes('unique')) return 'Ya existe un registro con ese código en esta organización.';
  if (message.includes('foreign key')) return 'El cliente o la instalación ya no están disponibles. Actualiza la pantalla e inténtalo de nuevo.';
  return fallback;
}

export async function listClients(supabase: SupabaseClient, tenantId: string): Promise<ClientListItem[]> {
  const [clientsResult, installationsResult, ordersResult] = await Promise.all([
    supabase.from('clientes').select(CLIENT_COLUMNS).eq('tenant_id', tenantId).is('deleted_at', null).order('nombre'),
    supabase.from('instalaciones').select('id,cliente_id').eq('tenant_id', tenantId).is('deleted_at', null),
    supabase.from('ordenes_trabajo').select('cliente_id,estado').eq('tenant_id', tenantId).is('deleted_at', null),
  ]);
  if (clientsResult.error) throw clientsResult.error;
  if (installationsResult.error) throw installationsResult.error;
  if (ordersResult.error) throw ordersResult.error;

  const installationCounts = new Map<string, number>();
  for (const installation of (installationsResult.data ?? []) as Array<{ cliente_id: string | null }>) {
    if (installation.cliente_id) installationCounts.set(installation.cliente_id, (installationCounts.get(installation.cliente_id) ?? 0) + 1);
  }
  const openOrderCounts = new Map<string, number>();
  for (const order of (ordersResult.data ?? []) as Array<{ cliente_id: string | null; estado: string }>) {
    if (order.cliente_id && !CLOSED_WORK_ORDER_STATUSES.has(order.estado)) {
      openOrderCounts.set(order.cliente_id, (openOrderCounts.get(order.cliente_id) ?? 0) + 1);
    }
  }
  return ((clientsResult.data ?? []) as unknown as ClientRow[]).map((row) => ({
    ...mapClientRow(row),
    installationCount: installationCounts.get(row.id) ?? 0,
    openWorkOrderCount: openOrderCounts.get(row.id) ?? 0,
  }));
}

export async function getClientDetail(supabase: SupabaseClient, tenantId: string, clientId: string): Promise<ClientDetail> {
  const [clientResult, installationsResult, ordersResult] = await Promise.all([
    supabase.from('clientes').select(CLIENT_COLUMNS).eq('tenant_id', tenantId).eq('id', clientId).is('deleted_at', null).maybeSingle(),
    supabase.from('instalaciones').select(INSTALLATION_COLUMNS).eq('tenant_id', tenantId).eq('cliente_id', clientId).is('deleted_at', null).order('nombre'),
    supabase.from('ordenes_trabajo').select(WORK_ORDER_COLUMNS).eq('tenant_id', tenantId).eq('cliente_id', clientId).is('deleted_at', null).order('updated_at', { ascending: false }).limit(12),
  ]);
  if (clientResult.error) throw clientResult.error;
  if (installationsResult.error) throw installationsResult.error;
  if (ordersResult.error) throw ordersResult.error;
  const client = clientResult.data as unknown as ClientRow | null;
  if (!client) throw new Error('El cliente ya no está disponible.');
  const orders = ((ordersResult.data ?? []) as unknown as WorkOrderRow[]).map(mapWorkOrderRow);
  return {
    client: mapClientRow(client),
    installations: ((installationsResult.data ?? []) as unknown as InstallationRow[]).map(mapInstallationRow),
    openWorkOrders: orders.filter((order) => !CLOSED_WORK_ORDER_STATUSES.has(order.status)),
    recentWorkOrders: orders,
  };
}

export async function createClient(supabase: SupabaseClient, input: CreateClientInput): Promise<ClientRecord> {
  const { data, error } = await supabase.from('clientes').insert({ tenant_id: input.tenantId, ...toClientPayload(input) }).select(CLIENT_COLUMNS).single();
  if (error) throw error;
  return mapClientRow(data as unknown as ClientRow);
}

export async function updateClient(supabase: SupabaseClient, tenantId: string, clientId: string, input: UpdateClientInput): Promise<ClientRecord> {
  const { data, error } = await supabase.from('clientes').update(toClientPayload(input)).eq('tenant_id', tenantId).eq('id', clientId).select(CLIENT_COLUMNS).single();
  if (error) throw error;
  return mapClientRow(data as unknown as ClientRow);
}

export async function setClientStatus(supabase: SupabaseClient, tenantId: string, clientId: string, status: EntityStatus): Promise<ClientRecord> {
  const { data, error } = await supabase.from('clientes').update({ estado: normalizeEntityStatus(status) }).eq('tenant_id', tenantId).eq('id', clientId).select(CLIENT_COLUMNS).single();
  if (error) throw error;
  return mapClientRow(data as unknown as ClientRow);
}

export async function createClientInstallation(supabase: SupabaseClient, input: CreateInstallationInput): Promise<ClientInstallation> {
  if (!input.clientId.trim()) throw new Error('Selecciona un cliente antes de guardar la instalación.');
  const { data, error } = await supabase.from('instalaciones').insert({ tenant_id: input.tenantId, cliente_id: input.clientId, ...toInstallationPayload(input) }).select(INSTALLATION_COLUMNS).single();
  if (error) throw error;
  return mapInstallationRow(data as unknown as InstallationRow);
}

export async function updateClientInstallation(supabase: SupabaseClient, tenantId: string, installationId: string, input: UpdateInstallationInput): Promise<ClientInstallation> {
  const { data, error } = await supabase.from('instalaciones').update(toInstallationPayload(input)).eq('tenant_id', tenantId).eq('id', installationId).select(INSTALLATION_COLUMNS).single();
  if (error) throw error;
  return mapInstallationRow(data as unknown as InstallationRow);
}

export async function setInstallationStatus(supabase: SupabaseClient, tenantId: string, installation: ClientInstallation, status: EntityStatus): Promise<ClientInstallation> {
  const { data, error } = await supabase.from('instalaciones').update({ estado: normalizeEntityStatus(status) }).eq('tenant_id', tenantId).eq('id', installation.id).select(INSTALLATION_COLUMNS).single();
  if (error) throw error;
  return mapInstallationRow(data as unknown as InstallationRow);
}
