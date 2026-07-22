export type WorkOrderDirectionsInput = {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function workOrderDirectionsUrl(input: WorkOrderDirectionsInput): string | null {
  const hasCoordinates = Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  const destination = hasCoordinates
    ? `${input.latitude},${input.longitude}`
    : input.address?.trim() || null;

  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function workOrderEmbedMapUrl(input: WorkOrderDirectionsInput): string | null {
  const address = input.address?.trim();
  if (!address) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}
