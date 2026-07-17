import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  WorkOrderPriority,
  WorkOrderType,
} from '../types/workOrder';

export type InstallationOption = {
  id: string;
  name: string;
  code: string | null;
};

export type LocationOption = {
  id: string;
  installationId: string;
  name: string;
};

export type AssetOption = {
  id: string;
  installationId: string;
  locationId: string | null;
  name: string;
};

export type TechnicianOption = {
  id: string;
  name: string;
  role: 'tecnico' | 'tecnico_externo';
};

export type WorkOrderCreationCatalog = {
  installations: InstallationOption[];
  locations: LocationOption[];
  assets: AssetOption[];
  technicians: TechnicianOption[];
};

export type CreateWorkOrderRequirements = {
  checklist: boolean;
  initialPhotos: boolean;
  finalPhotos: boolean;
  measurements: boolean;
  materials: boolean;
  technicianSignature: boolean;
  responsibleSignature: boolean;
  finalFunctionalTest: boolean;
  report: boolean;
  administrativeReview: boolean;
};

export type CreateWorkOrderInput = {
  tenantId: string;
  installationId: string;
  locationId: string | null;
  assetId: string | null;
  technicianId: string | null;
  title: string;
  description: string | null;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  plannedAt: string | null;
  dueAt: string | null;
  estimatedMinutes: number | null;
  instructions: string | null;
  safetyNotes: string | null;
  expectedResult: string | null;
  requirements: CreateWorkOrderRequirements;
};

export type CreatedWorkOrder = {
  id: string;
  code: string;
  status: string;
};

type InstallationRow = { id: string; nombre: string; codigo: string | null };
type LocationRow = { id: string; instalacion_id: string; nombre: string };
type AssetRow = {
  id: string;
  instalacion_id: string;
  ubicacion_id: string | null;
  nombre: string;
};
type MemberRow = {
  user_id: string;
  role: 'tecnico' | 'tecnico_externo';
};
type ProfileRow = { id: string; nombre: string | null };
type CreatedWorkOrderRow = { id: string; codigo_ot: string; estado: string };

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function nullableText(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

export function toCreateWorkOrderRpcArgs(input: CreateWorkOrderInput): Record<string, unknown> {
  return {
    tenant_uuid: input.tenantId,
    installation_uuid: input.installationId,
    title_text: input.title.trim(),
    description_text: nullableText(input.description),
    work_order_type_text: input.type,
    priority_text: input.priority,
    location_uuid: input.locationId,
    asset_uuid: input.assetId,
    technician_uuid: input.technicianId,
    planned_at_value: input.plannedAt,
    due_at_value: input.dueAt,
    estimated_minutes_value: input.estimatedMinutes,
    instructions_text: nullableText(input.instructions),
    safety_notes_text: nullableText(input.safetyNotes),
    expected_result_text: nullableText(input.expectedResult),
    requirements_json: {
      requiere_checklist: input.requirements.checklist,
      requiere_fotos_iniciales: input.requirements.initialPhotos,
      requiere_fotos_finales: input.requirements.finalPhotos,
      requiere_mediciones: input.requirements.measurements,
      requiere_materiales: input.requirements.materials,
      requiere_firma_tecnico: input.requirements.technicianSignature,
      requiere_firma_cliente: input.requirements.responsibleSignature,
      requiere_prueba_funcional: input.requirements.finalFunctionalTest,
      requiere_informe: input.requirements.report,
      requiere_revision_admin: input.requirements.administrativeReview,
    },
  };
}

export async function loadWorkOrderCreationCatalog(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<WorkOrderCreationCatalog> {
  if (!tenantId.trim()) throw new Error('Selecciona una organización antes de crear una OT.');

  const [installationResult, locationResult, assetResult, memberResult] = await Promise.all([
    supabase
      .from('instalaciones')
      .select('id,nombre,codigo')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('ubicaciones')
      .select('id,instalacion_id,nombre')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('activos')
      .select('id,instalacion_id,ubicacion_id,nombre')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('tenant_members')
      .select('user_id,role')
      .eq('tenant_id', tenantId)
      .eq('estado', 'activo')
      .in('role', ['tecnico', 'tecnico_externo'])
      .order('created_at'),
  ]);

  for (const result of [installationResult, locationResult, assetResult, memberResult]) {
    if (result.error) throw result.error;
  }

  const members = (memberResult.data ?? []) as unknown as MemberRow[];
  const userIds = unique(members.map((member) => String(member.user_id)));
  let profiles: ProfileRow[] = [];

  if (userIds.length > 0) {
    const profileResult = await supabase
      .from('profiles')
      .select('id,nombre')
      .in('id', userIds);
    if (profileResult.error) throw profileResult.error;
    profiles = (profileResult.data ?? []) as unknown as ProfileRow[];
  }

  const profileNames = new Map(
    profiles.map((profile) => [String(profile.id), String(profile.nombre || 'Técnico sin nombre')]),
  );

  return {
    installations: ((installationResult.data ?? []) as unknown as InstallationRow[]).map((row) => ({
      id: String(row.id),
      name: String(row.nombre),
      code: row.codigo ? String(row.codigo) : null,
    })),
    locations: ((locationResult.data ?? []) as unknown as LocationRow[]).map((row) => ({
      id: String(row.id),
      installationId: String(row.instalacion_id),
      name: String(row.nombre),
    })),
    assets: ((assetResult.data ?? []) as unknown as AssetRow[]).map((row) => ({
      id: String(row.id),
      installationId: String(row.instalacion_id),
      locationId: row.ubicacion_id ? String(row.ubicacion_id) : null,
      name: String(row.nombre),
    })),
    technicians: members.map((member) => ({
      id: String(member.user_id),
      name: profileNames.get(String(member.user_id)) ?? 'Técnico sin nombre',
      role: member.role,
    })),
  };
}

export async function createWorkOrder(
  supabase: SupabaseClient,
  input: CreateWorkOrderInput,
): Promise<CreatedWorkOrder> {
  const { data, error } = await supabase.rpc(
    'create_work_order',
    toCreateWorkOrderRpcArgs(input),
  );

  if (error) throw error;

  const row = data as unknown as CreatedWorkOrderRow | null;
  if (!row?.id || !row.codigo_ot) {
    throw new Error('La base de datos no devolvió la OT creada.');
  }

  return {
    id: String(row.id),
    code: String(row.codigo_ot),
    status: String(row.estado),
  };
}
