export type WorkOrderDirectionsInput = {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function destination(input: WorkOrderDirectionsInput): string | null {
  const hasCoordinates = Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  if (hasCoordinates) return `${input.latitude},${input.longitude}`;
  return input.address?.trim() || null;
}

export function workOrderDirectionsUrl(input: WorkOrderDirectionsInput): string | null {
  const value = destination(input);
  if (!value) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}`;
}

export function workOrderEmbedMapUrl(input: WorkOrderDirectionsInput): string | null {
  const value = destination(input);
  if (!value) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed`;
}
