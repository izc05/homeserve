import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InstallationTechnicalSystemInput,
  TechnicalSystem,
  TechnicalSystemStatus,
  UpdateInstallationTechnicalSystemInput,
} from '../types/technicalSystem';

const TECHNICAL_SYSTEM_SELECT = 'id,tenant_id,instalacion_id,nombre,codigo,especialidad,descripcion,criticidad,estado,created_at,updated_at';

type TechnicalSystemRow = {
  id: string;
  tenant_id: string;
  instalacion_id: string;
  nombre: string;
  codigo: string | null;
  especialidad: string;
  descripcion: string | null;
  criticidad: TechnicalSystem['criticality'];
  estado: TechnicalSystemStatus;
  created_at: string;
  updated_at: string;
};

function nullable(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

export function mapInstallationTechnicalSystem(row: TechnicalSystemRow): TechnicalSystem {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    installationId: String(row.instalacion_id),
    name: String(row.nombre),
    code: row.codigo ? String(row.codigo) : null,
    specialty: String(row.especialidad),
    description: row.descripcion ? String(row.descripcion) : null,
    criticality: row.criticidad,
    status: row.estado,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listInstallationTechnicalSystems(
  client: SupabaseClient,
  tenantId: string,
  installationId: string,
): Promise<TechnicalSystem[]> {
  const { data, error } = await client
    .from('sistemas_instalacion')
    .select(TECHNICAL_SYSTEM_SELECT)
    .eq('tenant_id', tenantId)
    .eq('instalacion_id', installationId)
    .is('deleted_at', null)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapInstallationTechnicalSystem(row as TechnicalSystemRow));
}

export async function createInstallationTechnicalSystem(
  client: SupabaseClient,
  input: InstallationTechnicalSystemInput,
): Promise<TechnicalSystem> {
  const { data, error } = await client
    .from('sistemas_instalacion')
    .insert({
      tenant_id: input.tenantId,
      instalacion_id: input.installationId,
      nombre: input.name.trim(),
      codigo: nullable(input.code),
      especialidad: input.specialty.trim(),
      descripcion: nullable(input.description),
      criticidad: input.criticality ?? 'media',
      estado: input.status ?? 'activo',
    })
    .select(TECHNICAL_SYSTEM_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('No se pudo recuperar el sistema técnico creado.');
  return mapInstallationTechnicalSystem(data as TechnicalSystemRow);
}

export async function updateInstallationTechnicalSystem(
  client: SupabaseClient,
  tenantId: string,
  installationId: string,
  systemId: string,
  input: UpdateInstallationTechnicalSystemInput,
): Promise<TechnicalSystem> {
  const { data, error } = await client
    .from('sistemas_instalacion')
    .update({
      nombre: input.name.trim(),
      codigo: nullable(input.code),
      especialidad: input.specialty.trim(),
      descripcion: nullable(input.description),
      criticidad: input.criticality ?? 'media',
      estado: input.status ?? 'activo',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('instalacion_id', installationId)
    .eq('id', systemId)
    .is('deleted_at', null)
    .select(TECHNICAL_SYSTEM_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('No se pudo recuperar el sistema técnico actualizado.');
  return mapInstallationTechnicalSystem(data as TechnicalSystemRow);
}

export async function setInstallationTechnicalSystemStatus(
  client: SupabaseClient,
  tenantId: string,
  installationId: string,
  systemId: string,
  status: TechnicalSystemStatus,
): Promise<TechnicalSystem> {
  const { data, error } = await client
    .from('sistemas_instalacion')
    .update({ estado: status, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('instalacion_id', installationId)
    .eq('id', systemId)
    .is('deleted_at', null)
    .select(TECHNICAL_SYSTEM_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar el estado del sistema técnico.');
  return mapInstallationTechnicalSystem(data as TechnicalSystemRow);
}
