export const TECHNICAL_SYSTEM_CRITICALITIES = ['baja', 'media', 'alta', 'critica'] as const;
export type TechnicalSystemCriticality = (typeof TECHNICAL_SYSTEM_CRITICALITIES)[number];

export const TECHNICAL_SYSTEM_STATUSES = ['activo', 'fuera_servicio', 'inactivo'] as const;
export type TechnicalSystemStatus = (typeof TECHNICAL_SYSTEM_STATUSES)[number];

export const TECHNICAL_SYSTEM_SPECIALTIES = [
  { value: 'general', label: 'General / multidisciplinar' },
  { value: 'electricidad_bt', label: 'Electricidad BT' },
  { value: 'climatizacion', label: 'Climatización y ventilación' },
  { value: 'refrigeracion', label: 'Refrigeración' },
  { value: 'fontaneria', label: 'Fontanería y saneamiento' },
  { value: 'acs_legionella', label: 'ACS / Legionella' },
  { value: 'pci', label: 'Protección contra incendios' },
  { value: 'gases_medicinales', label: 'Gases medicinales' },
  { value: 'telecomunicaciones', label: 'Telecomunicaciones y datos' },
  { value: 'automatizacion_control', label: 'Automatización y control' },
  { value: 'obra_civil', label: 'Obra civil / edificación' },
  { value: 'otra', label: 'Otra' },
] as const;

export type TechnicalSystem = {
  id: string;
  tenantId: string;
  installationId: string;
  name: string;
  code: string | null;
  specialty: string;
  description: string | null;
  criticality: TechnicalSystemCriticality;
  status: TechnicalSystemStatus;
  createdAt: string;
  updatedAt: string;
};

export type InstallationTechnicalSystemInput = {
  tenantId: string;
  installationId: string;
  name: string;
  code?: string | null;
  specialty: string;
  description?: string | null;
  criticality?: TechnicalSystemCriticality;
  status?: TechnicalSystemStatus;
};

export type UpdateInstallationTechnicalSystemInput = Omit<InstallationTechnicalSystemInput, 'tenantId' | 'installationId'>;
