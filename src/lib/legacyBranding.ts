const EXACT_LEGACY_LABELS = new Map<string, string>([
  ['Administración Demo HomeServe', 'Administración Demo IsiVoltPro'],
  ['Técnico Demo HomeServe', 'Técnico Demo IsiVoltPro'],
  ['HomeServe', 'IsiVoltPro'],
]);

export function normalizeLegacyBrandLabel(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return EXACT_LEGACY_LABELS.get(value.trim()) ?? value;
}

export function normalizeLegacyBrandText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value
    .replaceAll('Administración Demo HomeServe', 'Administración Demo IsiVoltPro')
    .replaceAll('Técnico Demo HomeServe', 'Técnico Demo IsiVoltPro')
    .replaceAll('Contacto Demo HomeServe', 'Contacto Demo IsiVoltPro');
}
