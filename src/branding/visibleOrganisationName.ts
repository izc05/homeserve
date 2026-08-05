import { PRODUCT_NAME } from '../components/ProductBrand';

const LEGACY_ORGANISATION_KEY = ['home', 'serve'].join('');

export function visibleOrganisationName(value: string | null | undefined) {
  const name = value?.trim() || 'Organización';
  const normalized = name.toLowerCase().replaceAll(/[\s_-]+/g, '');
  return normalized.includes(LEGACY_ORGANISATION_KEY) ? PRODUCT_NAME : name;
}
