export const TECHNICAL_SPECIALTY_KEYS = [
  'general',
  'electricidad_bt',
  'electricidad_mt_at',
  'fotovoltaica',
  'grupos_sai',
  'climatizacion',
  'refrigeracion',
  'fontaneria_saneamiento',
  'acs_legionella',
  'pci',
  'gases_medicinales',
  'electromedicina',
  'ascensores',
  'telecomunicaciones',
  'seguridad_control',
  'automatizacion_control',
  'aire_comprimido',
  'vapor',
  'obra_civil',
  'eficiencia_energetica',
  'otra',
] as const;

export type TechnicalSpecialtyKey = (typeof TECHNICAL_SPECIALTY_KEYS)[number];

export type TechnicalSpecialty = {
  key: TechnicalSpecialtyKey;
  label: string;
  group: string;
  shortLabel: string;
};

export const TECHNICAL_SPECIALTIES: readonly TechnicalSpecialty[] = [
  { key: 'general', label: 'General / multidisciplinar', shortLabel: 'General', group: 'General' },
  { key: 'electricidad_bt', label: 'Electricidad de baja tensión', shortLabel: 'Electricidad BT', group: 'Electricidad' },
  { key: 'electricidad_mt_at', label: 'Media y alta tensión', shortLabel: 'MT / AT', group: 'Electricidad' },
  { key: 'fotovoltaica', label: 'Energía solar fotovoltaica', shortLabel: 'Fotovoltaica', group: 'Energía' },
  { key: 'grupos_sai', label: 'Grupos electrógenos y SAI', shortLabel: 'Grupos / SAI', group: 'Energía' },
  { key: 'climatizacion', label: 'Climatización y ventilación', shortLabel: 'Climatización', group: 'HVAC' },
  { key: 'refrigeracion', label: 'Refrigeración', shortLabel: 'Refrigeración', group: 'HVAC' },
  { key: 'fontaneria_saneamiento', label: 'Fontanería y saneamiento', shortLabel: 'Fontanería', group: 'Hidráulica' },
  { key: 'acs_legionella', label: 'ACS y prevención de Legionella', shortLabel: 'ACS / Legionella', group: 'Hidráulica' },
  { key: 'pci', label: 'Protección contra incendios', shortLabel: 'PCI', group: 'Seguridad' },
  { key: 'gases_medicinales', label: 'Gases medicinales', shortLabel: 'Gases medicinales', group: 'Hospitalario' },
  { key: 'electromedicina', label: 'Electromedicina', shortLabel: 'Electromedicina', group: 'Hospitalario' },
  { key: 'ascensores', label: 'Ascensores y elevación', shortLabel: 'Ascensores', group: 'Transporte' },
  { key: 'telecomunicaciones', label: 'Telecomunicaciones y datos', shortLabel: 'Telecomunicaciones', group: 'Comunicaciones' },
  { key: 'seguridad_control', label: 'Seguridad y control de accesos', shortLabel: 'Seguridad', group: 'Seguridad' },
  { key: 'automatizacion_control', label: 'Automatización y control', shortLabel: 'Automatización', group: 'Control' },
  { key: 'aire_comprimido', label: 'Aire comprimido', shortLabel: 'Aire comprimido', group: 'Industrial' },
  { key: 'vapor', label: 'Vapor y fluidos térmicos', shortLabel: 'Vapor', group: 'Industrial' },
  { key: 'obra_civil', label: 'Obra civil y edificación', shortLabel: 'Obra civil', group: 'Infraestructura' },
  { key: 'eficiencia_energetica', label: 'Eficiencia energética', shortLabel: 'Eficiencia', group: 'Energía' },
  { key: 'otra', label: 'Otra especialidad', shortLabel: 'Otra', group: 'General' },
];

export const INSTALLATION_SECTORS = [
  ['general', 'General / mixto'],
  ['hospitalario', 'Hospitalario / sanitario'],
  ['industrial', 'Industrial'],
  ['terciario', 'Terciario / comercial'],
  ['residencial', 'Residencial'],
  ['publico', 'Edificio público'],
  ['educativo', 'Educativo'],
  ['hotelero', 'Hotelero'],
  ['logistico', 'Logístico'],
  ['agroalimentario', 'Agroalimentario'],
  ['infraestructura', 'Infraestructura'],
  ['otro', 'Otro'],
] as const;

export type InstallationSectorKey = (typeof INSTALLATION_SECTORS)[number][0];

const specialtyByKey = new Map(TECHNICAL_SPECIALTIES.map((specialty) => [specialty.key, specialty]));

export function technicalSpecialtyLabel(key: string | null | undefined): string {
  if (!key) return 'General';
  return specialtyByKey.get(key as TechnicalSpecialtyKey)?.shortLabel ?? key;
}

export function isTechnicalSpecialtyKey(value: string): value is TechnicalSpecialtyKey {
  return TECHNICAL_SPECIALTY_KEYS.includes(value as TechnicalSpecialtyKey);
}
