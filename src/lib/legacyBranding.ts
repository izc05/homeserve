const LEGACY_BRAND = ['Home', 'Serve'].join('');
const ADMIN_LEGACY = `Administración Demo ${LEGACY_BRAND}`;
const TECHNICIAN_LEGACY = `Técnico Demo ${LEGACY_BRAND}`;
const CONTACT_LEGACY = `Contacto Demo ${LEGACY_BRAND}`;

const EXACT_LEGACY_LABELS = new Map<string, string>([
  [ADMIN_LEGACY, 'Administración Demo IsiVoltPro'],
  [TECHNICIAN_LEGACY, 'Técnico Demo IsiVoltPro'],
  [LEGACY_BRAND, 'IsiVoltPro'],
]);

export function normalizeLegacyBrandLabel(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return EXACT_LEGACY_LABELS.get(value.trim()) ?? value;
}

export function normalizeLegacyBrandText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value
    .replaceAll(ADMIN_LEGACY, 'Administración Demo IsiVoltPro')
    .replaceAll(TECHNICIAN_LEGACY, 'Técnico Demo IsiVoltPro')
    .replaceAll(CONTACT_LEGACY, 'Contacto Demo IsiVoltPro');
}
