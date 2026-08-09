import type {
  LatLng,
  RouteDirectionsRequest,
  RouteDirectionsResult,
  RouteRouter,
} from './types';

const MAPBOX_MAX_COORDS = 25;
const DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox';

type MapboxDirectionsResponse = {
  code?: string;
  message?: string;
  routes?: Array<{
    distance: number;
    geometry: { coordinates: [number, number][] };
  }>;
};

/**
 * Real Mapbox Directions (walking profile for sidewalk-safe geometry).
 * ✦ never invents coords — only catalog waypoints are sent; Mapbox returns the line.
 */
export class MapboxSafeRouter implements RouteRouter {
  readonly provider = 'mapbox-walking';

  constructor(private readonly accessToken: string) {}

  async buildDirections(
    req: RouteDirectionsRequest,
  ): Promise<RouteDirectionsResult> {
    const ordered = orderNearest(req.start, req.waypoints);
    const points = truncateForMapbox([req.start, ...ordered, req.start]);
    const path = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const profile = req.preferSafe ? 'walking' : 'walking';

    const url =
      `${DIRECTIONS_BASE}/${profile}/${path}` +
      `?geometries=geojson&overview=full&access_token=${encodeURIComponent(this.accessToken)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Mapbox Directions HTTP ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}`,
      );
    }

    const data = (await res.json()) as MapboxDirectionsResponse;
    if (data.code && data.code !== 'Ok') {
      throw new Error(data.message ?? `Mapbox Directions code ${data.code}`);
    }

    const route = data.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
      throw new Error('Mapbox Directions returned no geometry');
    }

    return {
      coordinates: route.geometry.coordinates,
      distanceM: route.distance,
      provider: this.provider,
    };
  }
}

function orderNearest(start: LatLng, waypoints: LatLng[]): LatLng[] {
  const remaining = [...waypoints];
  const ordered: LatLng[] = [];
  let cur = start;
  while (remaining.length) {
    remaining.sort(
      (a, b) => crowFlyM(cur, a) - crowFlyM(cur, b),
    );
    const next = remaining.shift()!;
    ordered.push(next);
    cur = next;
  }
  return ordered;
}

function crowFlyM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Mapbox allows max 25 coordinates including start/end. */
function truncateForMapbox(points: LatLng[]): LatLng[] {
  if (points.length <= MAPBOX_MAX_COORDS) return points;
  const start = points[0];
  const end = points[points.length - 1];
  const middle = points.slice(1, -1);
  const keep = MAPBOX_MAX_COORDS - 2;
  const step = Math.max(1, Math.ceil(middle.length / keep));
  const sampled: LatLng[] = [];
  for (let i = 0; i < middle.length && sampled.length < keep; i += step) {
    sampled.push(middle[i]);
  }
  return [start, ...sampled, end];
}
