export type StoreLocationConfig = {
  lat: number;
  lng: number;
  zoom: number;
  label?: string;
};

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function getStoreLocationConfig(): StoreLocationConfig | null {
  const lat = num(process.env.NEXT_PUBLIC_STORE_LAT);
  const lng = num(process.env.NEXT_PUBLIC_STORE_LNG);
  if (lat == null || lng == null) return null;

  const zoom = num(process.env.NEXT_PUBLIC_STORE_MAP_ZOOM) ?? 15;
  const label = process.env.NEXT_PUBLIC_STORE_LABEL?.trim() || undefined;
  return { lat, lng, zoom, label };
}
