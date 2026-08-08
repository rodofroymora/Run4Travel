import { getPlacesForCity } from '../data/places';
import type { DiscoveryRoute, Place, PhotoSpot, StoryPoint } from '../types/discovery';
import type { RouteIntent, RouteStyle } from '../types/routeIntent';
import { haversineM, lineDistanceM } from './geo';

export const DISTANCE_TOLERANCE = 0.08; // ±8%

export function cacheKeyForIntent(intent: RouteIntent, catalogVersion = 'v1'): string {
  const geohash5 = `${intent.start.lat.toFixed(2)}_${intent.start.lng.toFixed(2)}`;
  return `${intent.cityId}+${intent.style}+${intent.distanceKm}+${geohash5}+${catalogVersion}`;
}

export function distanceErrorPct(actualM: number, targetKm: number): number {
  const targetM = targetKm * 1000;
  if (targetM <= 0) return 1;
  return Math.abs(actualM - targetM) / targetM;
}

export function isDistanceWithinTolerance(actualM: number, targetKm: number): boolean {
  return distanceErrorPct(actualM, targetKm) <= DISTANCE_TOLERANCE;
}

/** Ranking heurístico (fallback sin LLM): relevance + style match + seguridad. */
export function heuristicRankPlaceIds(
  places: Place[],
  style: RouteStyle,
  maxCount: number,
): string[] {
  const scored = places
    .filter((p) => p.safeForRunning)
    .map((p) => {
      const styleBonus = p.styles.includes(style) ? 0.25 : 0;
      return { id: p.id, score: p.relevance + styleBonus };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxCount).map((s) => s.id);
}

/**
 * Mock “LLM”: solo reordena IDs del catálogo y escribe blurbs.
 * Nunca inventa lat/lng.
 */
export function mockLlmSelectPlaces(
  places: Place[],
  style: RouteStyle,
  maxCount: number,
): { placeIds: string[]; blurbs: Record<string, string>; usedFallback: boolean } {
  try {
    const ids = heuristicRankPlaceIds(places, style, maxCount);
    // Ligera rotación “editorial” sin tocar coords
    if (ids.length > 3) {
      const [a, b, ...rest] = ids;
      ids.splice(0, ids.length, b, a, ...rest);
    }
    const blurbs: Record<string, string> = {};
    for (const id of ids) {
      const p = places.find((x) => x.id === id);
      if (p) blurbs[id] = `✦ ${p.name}: un momento para sentir la ciudad a pie de calle.`;
    }
    return { placeIds: ids, blurbs, usedFallback: false };
  } catch {
    const placeIds = heuristicRankPlaceIds(places, style, maxCount);
    return { placeIds, blurbs: {}, usedFallback: true };
  }
}

/** Ordena waypoints por nearest-neighbor desde start (router stub). */
export function orderWaypointsNearest(
  start: { lat: number; lng: number },
  places: Place[],
): Place[] {
  const remaining = [...places];
  const ordered: Place[] = [];
  let cur = start;
  while (remaining.length) {
    remaining.sort(
      (a, b) => haversineM(cur, a) - haversineM(cur, b),
    );
    const next = remaining.shift()!;
    ordered.push(next);
    cur = next;
  }
  return ordered;
}

/**
 * Router determinístico: polyline visitando waypoints + loops para alcanzar distancia.
 * Solo usa coords del catálogo / start — nunca inventadas por LLM.
 */
export function buildRouterPolyline(
  start: { lat: number; lng: number },
  waypoints: Place[],
  targetDistanceM: number,
): [number, number][] {
  const ordered = orderWaypointsNearest(start, waypoints);
  const coords: [number, number][] = [[start.lng, start.lat]];

  for (const wp of ordered) {
    const prev = coords[coords.length - 1];
    const midLat = (prev[1] + wp.lat) / 2;
    const midLng = (prev[0] + wp.lng) / 2;
    // Ligera curva “segura” (parque) sin inventar POIs
    const bendLat = midLat + (wp.lng - prev[0]) * 0.15;
    const bendLng = midLng - (wp.lat - prev[1]) * 0.15;
    coords.push([bendLng, bendLat], [wp.lng, wp.lat]);
  }

  // Cerrar loop hacia start si ayuda a distancia
  const last = coords[coords.length - 1];
  coords.push(
    [(last[0] + start.lng) / 2 + 0.001, (last[1] + start.lat) / 2 - 0.001],
    [start.lng, start.lat],
  );

  let dist = lineDistanceM(coords);
  let guard = 0;
  while (dist < targetDistanceM * 0.92 && guard < 8) {
    // Out-and-back scenic: duplicar un segmento seguro
    const mid = Math.floor(coords.length / 2);
    const insert: [number, number][] = [];
    for (let i = mid; i < Math.min(mid + 3, coords.length - 1); i++) {
      const [lng, lat] = coords[i];
      insert.push([lng + 0.0015 * (guard + 1), lat + 0.0012 * (guard + 1)]);
    }
    coords.splice(mid, 0, ...insert);
    dist = lineDistanceM(coords);
    guard += 1;
  }

  // Acortar si excedemos mucho: recortar puntos del medio
  while (dist > targetDistanceM * 1.08 && coords.length > 6) {
    coords.splice(Math.floor(coords.length / 2), 1);
    dist = lineDistanceM(coords);
  }

  return coords;
}

function buildStoryPoint(place: Place, blurb: string, index: number): StoryPoint {
  const quick = blurb.slice(0, 80) || `✦ ${place.name} en un suspiro.`;
  const standard = `${blurb} Observa los detalles mientras pasas.`;
  const deep = `${blurb} Aquí la ciudad cuenta su historia a quien corre con atención: arquitectura, ritmo y luz.`;
  return {
    id: `sp-${place.id}`,
    placeId: place.id,
    shortDescription: blurb || `Descubre ${place.name}`,
    storyVersions: { quick, standard, deep },
    audio: {
      quick: `cache://audio/${place.id}/quick`,
      standard: `cache://audio/${place.id}/standard`,
      deep: `cache://audio/${place.id}/deep`,
    },
    durationSec: { quick: 18, standard: 42, deep: 90 },
    photoSpotId: `ps-${place.id}`,
  };
}

function buildPhotoSpot(place: Place): PhotoSpot {
  return {
    id: `ps-${place.id}`,
    placeId: place.id,
    lat: place.lat,
    lng: place.lng,
    tip: `Desde la acera, enmarca ${place.name}. No te detengas en la calzada.`,
    radiusM: 120,
  };
}

function routeNameFor(intent: RouteIntent, firstPlaces: Place[]): string {
  if (intent.style === 'architecture' && intent.cityId === 'barcelona') {
    return 'Modernisme Loop';
  }
  const lead = firstPlaces[0]?.name ?? intent.cityName;
  return `${lead} Discovery`;
}

export function generateDiscoveryRoute(intent: RouteIntent): DiscoveryRoute {
  const places = getPlacesForCity(intent.cityId, intent.start);
  const targetM = intent.distanceKm * 1000;
  const maxPoints = Math.min(
    places.length,
    intent.distanceKm <= 5 ? 5 : intent.distanceKm <= 10 ? 8 : intent.distanceKm <= 15 ? 10 : 12,
  );

  const { placeIds, blurbs, usedFallback } = mockLlmSelectPlaces(
    places,
    intent.style,
    maxPoints,
  );

  // Validación dura: solo IDs del catálogo
  const byId = new Map(places.map((p) => [p.id, p]));
  const selected = placeIds
    .map((id) => byId.get(id))
    .filter((p): p is Place => Boolean(p));

  if (selected.some((p) => !byId.has(p.id))) {
    throw new Error('LLM proposed unknown place id');
  }

  const geometry = buildRouterPolyline(intent.start, selected, targetM);
  const distanceM = lineDistanceM(geometry);

  // Garantía: coords de story/photo ∈ catálogo
  const storyPoints = selected.map((p, i) =>
    buildStoryPoint(p, blurbs[p.id] ?? `✦ ${p.name}`, i),
  );
  const photoSpots = selected.map(buildPhotoSpot);

  const paceSecPerKm = 340; // ~5:40 /km estimado
  const estimatedMovingTimeSec = Math.round((distanceM / 1000) * paceSecPerKm);

  return {
    id: `route_${Date.now().toString(36)}`,
    name: routeNameFor(intent, selected),
    intent,
    geometry: { type: 'LineString', coordinates: geometry },
    distanceM,
    elevGainM: Math.round(intent.distanceKm * 18),
    estimatedMovingTimeSec,
    storyPoints,
    photoSpots,
    provider: {
      router: 'mock-osrm-safe',
      llm: usedFallback ? undefined : 'mock-rank-v1',
    },
    createdAt: new Date().toISOString(),
    cacheKey: cacheKeyForIntent(intent),
    usedFallback,
  };
}

/** Contrato: ninguna coord de story/photo fuera del catálogo. */
export function assertNoInventedGeometry(
  route: DiscoveryRoute,
  catalog: Place[],
): void {
  const keys = new Set(catalog.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`));
  for (const sp of route.storyPoints) {
    const place = catalog.find((p) => p.id === sp.placeId);
    if (!place) throw new Error(`unknown story place ${sp.placeId}`);
  }
  for (const ps of route.photoSpots) {
    const key = `${ps.lat.toFixed(5)},${ps.lng.toFixed(5)}`;
    if (!keys.has(key)) {
      const place = catalog.find((p) => p.id === ps.placeId);
      if (!place || place.lat !== ps.lat || place.lng !== ps.lng) {
        throw new Error(`photo spot coords not in catalog: ${ps.id}`);
      }
    }
  }
}
