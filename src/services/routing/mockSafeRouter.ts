import { haversineM, lineDistanceM } from '../../domain/geo';
import type {
  LatLng,
  RouteDirectionsRequest,
  RouteDirectionsResult,
  RouteRouter,
} from './types';

/**
 * Deterministic safe-ish router stub.
 * - Visits waypoints nearest-neighbor from start
 * - Inserts gentle bends between catalog points (no new POIs)
 * - Adds meter-targeted out-and-back spurs to hit ±8% of target
 *
 * With EXPO_PUBLIC_MAPBOX_TOKEN, getRouteRouter() prefers MapboxSafeRouter
 * and falls back here on network/API errors.
 */
export class MockSafeRouter implements RouteRouter {
  readonly provider = 'mock-osrm-safe';

  buildDirections(req: RouteDirectionsRequest): RouteDirectionsResult {
    const ordered = orderNearest(req.start, req.waypoints);
    let best = buildAndFit(req.start, ordered, req.targetDistanceM);

    for (let n = ordered.length - 1; n >= 1; n--) {
      const candidate = buildAndFit(
        req.start,
        ordered.slice(0, n),
        req.targetDistanceM,
      );
      if (
        Math.abs(candidate.distanceM - req.targetDistanceM) <
        Math.abs(best.distanceM - req.targetDistanceM)
      ) {
        best = candidate;
      }
      if (withinBand(best.distanceM, req.targetDistanceM)) break;
    }
    return best;
  }
}

export const mockSafeRouter = new MockSafeRouter();

function withinBand(actual: number, target: number): boolean {
  return Math.abs(actual - target) / target <= 0.08;
}

function orderNearest(start: LatLng, waypoints: LatLng[]): LatLng[] {
  const remaining = [...waypoints];
  const ordered: LatLng[] = [];
  let cur = start;
  while (remaining.length) {
    remaining.sort((a, b) => haversineM(cur, a) - haversineM(cur, b));
    const next = remaining.shift()!;
    ordered.push(next);
    cur = next;
  }
  return ordered;
}

function bendBetween(a: LatLng, b: LatLng, strength = 0.12): [number, number] {
  const midLat = (a.lat + b.lat) / 2;
  const midLng = (a.lng + b.lng) / 2;
  const bendLat = midLat + (b.lng - a.lng) * strength;
  const bendLng = midLng - (b.lat - a.lat) * strength;
  return [bendLng, bendLat];
}

function buildBaseLoop(
  start: LatLng,
  waypoints: LatLng[],
  withBends: boolean,
): [number, number][] {
  const coords: [number, number][] = [[start.lng, start.lat]];
  let prev = start;
  for (const wp of waypoints) {
    if (withBends) coords.push(bendBetween(prev, wp));
    coords.push([wp.lng, wp.lat]);
    prev = wp;
  }
  if (withBends) coords.push(bendBetween(prev, start, 0.1));
  coords.push([start.lng, start.lat]);
  return coords;
}

/** ~1 degree lat ≈ 111_320 m; lng scaled by cos(lat). */
function offsetMeters(
  from: LatLng,
  northM: number,
  eastM: number,
): [number, number] {
  const dLat = northM / 111_320;
  const dLng = eastM / (111_320 * Math.cos((from.lat * Math.PI) / 180));
  return [from.lng + dLng, from.lat + dLat];
}

/**
 * Add an out-and-back spur of approximately `meters` (round-trip ≈ 2 * meters).
 * Geometry is router-owned; does not create catalog POIs.
 */
function addMeterSpur(
  coords: [number, number][],
  atIndex: number,
  meters: number,
  angleRad: number,
): [number, number][] {
  const base = coords[Math.max(0, Math.min(atIndex, coords.length - 1))];
  const from = { lat: base[1], lng: base[0] };
  const north = Math.cos(angleRad) * meters;
  const east = Math.sin(angleRad) * meters;
  const tip = offsetMeters(from, north, east);
  const next = [...coords];
  const insertAt = Math.min(atIndex + 1, next.length - 1);
  next.splice(insertAt, 0, tip, [base[0], base[1]]);
  return next;
}

function buildAndFit(
  start: LatLng,
  waypoints: LatLng[],
  targetM: number,
): RouteDirectionsResult {
  const lo = targetM * 0.92;
  const hi = targetM * 1.08;

  let current =
    waypoints.length === 0
      ? ([[start.lng, start.lat], [start.lng, start.lat]] as [number, number][])
      : buildBaseLoop(start, waypoints, true);
  let dist = lineDistanceM(current);

  if (dist > hi) {
    current = buildBaseLoop(start, waypoints, false);
    dist = lineDistanceM(current);
  }

  // Still long: use only the closest prefix of waypoints
  let prefix = waypoints;
  while (dist > hi && prefix.length > 1) {
    prefix = prefix.slice(0, prefix.length - 1);
    current = buildBaseLoop(start, prefix, false);
    dist = lineDistanceM(current);
  }

  // Stretch with meter-targeted spurs (each adds ~2*meters)
  let guard = 0;
  while (dist < lo && guard < 30) {
    const need = lo - dist;
    const spurM = Math.min(1200, Math.max(80, need / 2));
    const angle = (guard * 0.9) % (Math.PI * 2);
    const at = guard % Math.max(1, current.length - 1);
    current = addMeterSpur(current, at, spurM, angle);
    dist = lineDistanceM(current);
    guard += 1;
  }

  // Trim soft midpoints if slightly over
  guard = 0;
  while (dist > hi && current.length > prefix.length + 2 && guard < 50) {
    const cut = Math.floor(current.length / 2);
    if (cut <= 0 || cut >= current.length - 1) break;
    current.splice(cut, 1);
    dist = lineDistanceM(current);
    guard += 1;
  }

  // Final nudge: tiny spur / trim
  if (dist < lo) {
    current = addMeterSpur(current, 0, (lo - dist) / 2 + 20, 0.3);
  }

  return {
    coordinates: current,
    distanceM: lineDistanceM(current),
    provider: 'mock-osrm-safe',
  };
}
