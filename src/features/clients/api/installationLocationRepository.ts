import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ClientLocation,
  InstallationLocationInput,
  UpdateInstallationLocationInput,
} from '../types/location';
import type { EntityStatus } from '../types/client';

const LOCATION_SELECT = 'id,tenant_id,instalacion_id,nombre,codigo,tipo,descripcion,estado,created_at,updated_at';

type LocationRow = {
  id: string;
  tenant_id: string;
  instalacion_id: string;
  nombre: string;
  codigo: string | null;
  tipo: string | null;
  descripcion: string | null;
  estado: EntityStatus;
  created_at: string;
  updated_at: string;
};

function nullable(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

export function mapInstallationLocation(row: LocationRow): ClientLocation {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    installationId: String(row.instalacion_id),
    name: String(row.nombre),
    code: row.codigo ? String(row.codigo) : null,
    type: row.tipo ? String(row.tipo) : null,
    description: row.descripcion ? String(row.descripcion) : null,
    status: row.estado,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listInstallationLocations(
  client: SupabaseClient,
  tenantId: string,
  installationId: string,
): Promise<ClientLocation[]> {
  const { data, error } = await client
    .from('ubicaciones')
    .select(LOCATION_SELECT)
    .eq('tenant_id', tenantId)
    .eq('instalacion_id', installationId)
    .is('deleted_at', null)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapInstallationLocation(row as LocationRow));
}

export async function createInstallationLocation(
  client: SupabaseClient,
  input: InstallationLocationInput,
): Promise<ClientLocation> {
  const { data, error } = await client
    .from('ubicaciones')
    .insert({
      tenant_id: input.tenantId,
      instalacion_id: input.installationId,
      nombre: input.name.trim(),
      codigo: nullable(input.code),
      tipo: nullable(input.type),
      descripcion: nullable(input.description),
      estado: input.status ?? 'activo',
    })
    .select(LOCATION_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('No se pudo recuperar la ubicación creada.');
  return mapInstallationLocation(data as LocationRow);
}

export async function updateInstallationLocation(
  client: SupabaseClient,
  tenantId: string,
  installationId: string,
  locationId: string,
  input: UpdateInstallationLocationInput,
): Promise<ClientLocation> {
  const { data, error } = await client
    .from('ubicaciones')
    .update({
      nombre: input.name.trim(),
      codigo: nullable(input.code),
      tipo: nullable(input.type),
      descripcion: nullable(input.description),
      estado: input.status ?? 'activo',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('instalacion_id', installationId)
    .eq('id', locationId)
    .is('deleted_at', null)
    .select(LOCATION_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('No se pudo recuperar la ubicación actualizada.');
  return mapInstallationLocation(data as LocationRow);
}

export async function setInstallationLocationStatus(
  client: SupabaseClient,
  tenantId: string,
  installationId: string,
  locationId: string,
  status: EntityStatus,
): Promise<ClientLocation> {
  const { data, error } = await client
    .from('ubicaciones')
    .update({ estado: status, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('instalacion_id', installationId)
    .eq('id', locationId)
    .is('deleted_at', null)
    .select(LOCATION_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar el estado de la ubicación.');
  return mapInstallationLocation(data as LocationRow);
}
