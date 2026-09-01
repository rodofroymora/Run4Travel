const EARTH_M = 6371000;

export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lineDistanceM(coords: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    total += haversineM({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
  }
  return total;
}

/** Interpola un punto a lo largo de una polyline a `distanceAlongM`. */
export function pointAlongLine(
  coords: [number, number][],
  distanceAlongM: number,
): { lat: number; lng: number; index: number } {
  if (coords.length === 0) return { lat: 0, lng: 0, index: 0 };
  if (coords.length === 1 || distanceAlongM <= 0) {
    const [lng, lat] = coords[0];
    return { lat, lng, index: 0 };
  }

  let remaining = distanceAlongM;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const seg = haversineM({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
    if (remaining <= seg || i === coords.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, remaining / seg);
      return {
        lat: lat1 + (lat2 - lat1) * t,
        lng: lng1 + (lng2 - lng1) * t,
        index: i - 1,
      };
    }
    remaining -= seg;
  }
  const [lng, lat] = coords[coords.length - 1];
  return { lat, lng, index: coords.length - 1 };
}

export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')} /km`;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function formatDistanceKm(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Minimum distance from a point to any vertex/segment of a polyline (meters). */
export function distanceToPolylineM(
  point: { lat: number; lng: number },
  coords: [number, number][],
): number {
  if (!coords.length) return Infinity;
  let best = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i]!;
    best = Math.min(best, haversineM(point, { lat, lng }));
  }
  return best;
}

/**
 * Distance along the polyline to the vertex closest to `point`.
 * Used so demo GPS (which follows the line) still triggers off-road POIs.
 */
export function distanceAlongToClosestM(
  point: { lat: number; lng: number },
  coords: [number, number][],
): number {
  if (!coords.length) return 0;
  let bestI = 0;
  let bestD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i]!;
    const d = haversineM(point, { lat, lng });
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  return lineDistanceM(coords.slice(0, bestI + 1));
}
