import type { LatLng, RouteDirectionsRequest, RouteDirectionsResult, RouteRouter } from './types';

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
 *
 * Important: every requested waypoint is included in the Directions call.
 * Distance fitting must change *which places* are selected upstream
 * (routeGeneration), never by silently dropping vias here — otherwise
 * story markers appear off the polyline.
 */
export class MapboxSafeRouter implements RouteRouter {
  readonly provider = 'mapbox-walking';

  constructor(private readonly accessToken: string) {}

  async buildDirections(
    req: RouteDirectionsRequest,
  ): Promise<RouteDirectionsResult> {
    const ordered = orderNearest(req.start, req.waypoints);
    if (ordered.length === 0) {
      return this.fetchLoop(req.start, [], req.preferSafe);
    }
    return this.fetchLoop(req.start, ordered, req.preferSafe);
  }

  private async fetchLoop(
    start: LatLng,
    waypoints: LatLng[],
    preferSafe: boolean,
  ): Promise<RouteDirectionsResult> {
    const points = truncateForMapbox([start, ...waypoints, start]);
    const path = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const profile = preferSafe ? 'walking' : 'walking';

    const url =
      `${DIRECTIONS_BASE}/${profile}/${path}` +
      `?geometries=geojson&overview=full` +
      `&access_token=${encodeURIComponent(this.accessToken)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'network';
      throw new Error(
        msg.includes('abort') ? 'Mapbox Directions timeout' : `Mapbox Directions failed: ${msg}`,
      );
    } finally {
      clearTimeout(timer);
    }
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

/**
 * Nearest-neighbor visit order from start (deterministic, catalog-only).
 * Exported for routeGeneration so story order matches the polyline.
 */
export function orderNearest(start: LatLng, waypoints: LatLng[]): LatLng[] {
  const remaining = [...waypoints];
  const ordered: LatLng[] = [];
  let cur = start;
  while (remaining.length) {
    remaining.sort((a, b) => crowFlyM(cur, a) - crowFlyM(cur, b));
    const next = remaining.shift()!;
    ordered.push(next);
    cur = next;
  }
  return ordered;
}

/**
 * Legacy candidate builder (tests / diagnostics). Prefer full set only —
 * dropping vias causes orphan story markers on the map.
 */
export function buildWaypointCandidates(ordered: LatLng[]): LatLng[][] {
  if (ordered.length < 1) return [];
  return [ordered];
}

/** Mapbox allows max 25 coordinates including start/end. */
function truncateForMapbox(points: LatLng[]): LatLng[] {
  if (points.length <= MAPBOX_MAX_COORDS) return points;
  const start = points[0];
  const end = points[points.length - 1];
  const middle = points.slice(1, -1);
  const keep = MAPBOX_MAX_COORDS - 2;
  // Prefer keeping as many vias as possible (even spacing), never invent coords.
  const sampled: LatLng[] = [];
  if (middle.length <= keep) return points;
  for (let i = 0; i < keep; i++) {
    const idx = Math.round((i * (middle.length - 1)) / Math.max(1, keep - 1));
    sampled.push(middle[idx]!);
  }
  return [start, ...sampled, end];
}
