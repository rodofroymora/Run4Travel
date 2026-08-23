import { PLACE_CATALOG_VERSION, blurbForPlace, getPlacesForCity } from '../data/places';
import { fetchLlmPlaceRank } from '../services/llmRank';
import { getMapboxToken, getRouteRouter, mockSafeRouter } from '../services/routing';
import type { RouteRouter } from '../services/routing';
import type { DiscoveryRoute, Place, PhotoSpot, StoryPoint } from '../types/discovery';
import type { RouteIntent, RouteStyle } from '../types/routeIntent';
import { haversineM, lineDistanceM } from './geo';

export const DISTANCE_TOLERANCE = 0.08; // ±8%
export const DISTANCE_TOLERANCE_IDEAL = 0.05; // ±5%

export function cacheKeyForIntent(
  intent: RouteIntent,
  catalogVersion = PLACE_CATALOG_VERSION,
  routerId = getMapboxToken() ? 'mapbox-walking-v2' : 'mock-osrm-safe',
): string {
  const geohash5 = `${intent.start.lat.toFixed(2)}_${intent.start.lng.toFixed(2)}`;
  return `${intent.cityId}+${intent.style}+${intent.distanceKm}+${geohash5}+${catalogVersion}+${routerId}`;
}

export function distanceErrorPct(actualM: number, targetKm: number): number {
  const targetM = targetKm * 1000;
  if (targetM <= 0) return 1;
  return Math.abs(actualM - targetM) / targetM;
}

export function isDistanceWithinTolerance(actualM: number, targetKm: number): boolean {
  return distanceErrorPct(actualM, targetKm) <= DISTANCE_TOLERANCE;
}

export function isDistanceIdeal(actualM: number, targetKm: number): boolean {
  return distanceErrorPct(actualM, targetKm) <= DISTANCE_TOLERANCE_IDEAL;
}

/** Ranking heurístico (fallback sin ✦): relevance + style match + seguridad. */
export function heuristicRankPlaceIds(
  places: Place[],
  style: RouteStyle,
  maxCount: number,
): string[] {
  const scored = places
    .filter((p) => p.safeForRunning)
    .map((p) => {
      const styleBonus = p.styles.includes(style) ? 0.25 : 0;
      const parkBonus =
        style === 'parks' && p.category === 'park'
          ? 0.1
          : style === 'waterfront' && p.category === 'waterfront'
            ? 0.1
            : 0;
      return { id: p.id, score: p.relevance + styleBonus + parkBonus };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxCount).map((s) => s.id);
}

/**
 * Mock ✦: solo reordena IDs del catálogo y escribe blurbs.
 * Nunca inventa lat/lng.
 */
export function mockLlmSelectPlaces(
  places: Place[],
  style: RouteStyle,
  maxCount: number,
  forceFallback = false,
): {
  placeIds: string[];
  blurbs: Record<string, string>;
  usedFallback: boolean;
  routeTitle?: string;
  provider?: string;
} {
  if (forceFallback) {
    const placeIds = heuristicRankPlaceIds(places, style, maxCount);
    return { placeIds, blurbs: {}, usedFallback: true };
  }
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
      if (p) blurbs[id] = blurbForPlace(p);
    }
    return { placeIds: ids, blurbs, usedFallback: false, provider: 'mock-rank-v2' };
  } catch {
    const placeIds = heuristicRankPlaceIds(places, style, maxCount);
    return { placeIds, blurbs: {}, usedFallback: true };
  }
}

/** ✦ real (API key) o mock local — solo IDs del catálogo/POI. */
export async function selectPlacesWithLlm(args: {
  places: Place[];
  style: RouteStyle;
  maxCount: number;
  cityName: string;
  distanceKm: number;
  forceFallback?: boolean;
}): Promise<{
  placeIds: string[];
  blurbs: Record<string, string>;
  usedFallback: boolean;
  routeTitle?: string;
  provider?: string;
}> {
  if (args.forceFallback) {
    return mockLlmSelectPlaces(args.places, args.style, args.maxCount, true);
  }
  const remote = await fetchLlmPlaceRank(args);
  if (remote) {
    const blurbs = { ...remote.blurbs };
    for (const id of remote.placeIds) {
      if (!blurbs[id]) {
        const p = args.places.find((x) => x.id === id);
        if (p) blurbs[id] = blurbForPlace(p);
      }
    }
    return {
      placeIds: remote.placeIds,
      blurbs,
      usedFallback: false,
      routeTitle: remote.routeTitle,
      provider: remote.provider,
    };
  }
  return mockLlmSelectPlaces(args.places, args.style, args.maxCount);
}

/** Sync polyline helper for unit tests (always mock router). */
export function buildRouterPolyline(
  start: { lat: number; lng: number },
  waypoints: Place[],
  targetDistanceM: number,
): [number, number][] {
  const result = mockSafeRouter.buildDirections({
    start,
    waypoints: waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
    targetDistanceM,
    preferSafe: true,
  });
  return result.coordinates;
}

function buildStoryPoint(place: Place, blurb: string): StoryPoint {
  const base = blurb || blurbForPlace(place);
  const quick = base.length > 90 ? `${base.slice(0, 87)}…` : base;
  const standard = `${base} Observa los detalles mientras pasas.`;
  const deep = `${base} Aquí la ciudad cuenta su historia a quien corre con atención: arquitectura, ritmo y luz.`;
  return {
    id: `sp-${place.id}`,
    placeId: place.id,
    shortDescription: base,
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
  if (intent.style === 'parks' && intent.cityId === 'barcelona') {
    return 'Parques & Miradores';
  }
  if (intent.style === 'historic' && intent.cityId === 'cdmx') {
    return 'Centro Histórico Loop';
  }
  const lead = firstPlaces[0]?.name ?? intent.cityName;
  return `${lead} Discovery`;
}

function waypointBudget(
  distanceKm: number,
  catalogSize: number,
  forMapbox = false,
): number[] {
  const base = forMapbox
    ? distanceKm <= 5
      ? 3
      : distanceKm <= 10
        ? 5
        : distanceKm <= 15
          ? 7
          : distanceKm <= 21
            ? 9
            : 10
    : distanceKm <= 5
      ? 4
      : distanceKm <= 10
        ? 7
        : distanceKm <= 15
          ? 9
          : distanceKm <= 21
            ? 11
            : 12;

  const candidates = forMapbox
    ? [base, base - 1, base + 1, base - 2, base + 2, Math.max(2, base - 3), base + 3]
    : [base, base + 1, base - 1, base + 2, Math.max(3, base - 2)];

  const minN = forMapbox ? 2 : 3;
  return [...new Set(candidates.map((n) => Math.min(catalogSize, Math.max(minN, n))))];
}

/** Keep waypoints runnable: ~40% of target as max crow-fly from start. */
export function filterPlacesNearStart(
  places: Place[],
  start: { lat: number; lng: number },
  targetDistanceM: number,
): Place[] {
  const radius = Math.max(1500, targetDistanceM * 0.4);
  const near = places.filter((p) => haversineM(start, p) <= radius);
  if (near.length >= 4) return near;
  // Fallback: nearest N by distance
  return [...places]
    .sort((a, b) => haversineM(start, a) - haversineM(start, b))
    .slice(0, Math.min(10, places.length));
}

export async function generateDiscoveryRoute(
  intent: RouteIntent,
  router: RouteRouter = getRouteRouter(),
  placesOverride?: Place[],
): Promise<DiscoveryRoute> {
  const allPlaces = placesOverride ?? getPlacesForCity(intent.cityId, intent.start);
  const targetM = intent.distanceKm * 1000;
  const places = filterPlacesNearStart(allPlaces, intent.start, targetM);
  const forMapbox = Boolean(getMapboxToken()) || routerUsesMapbox(router);

  let best: RouteCandidate | null = null;
  let llmProvider: string | undefined;

  for (const maxPoints of waypointBudget(intent.distanceKm, places.length, forMapbox)) {
    const ranked = await selectPlacesWithLlm({
      places,
      style: intent.style,
      maxCount: maxPoints,
      cityName: intent.cityName,
      distanceKm: intent.distanceKm,
    });
    if (ranked.provider) llmProvider = ranked.provider;
    const byId = new Map(places.map((p) => [p.id, p]));
    const selected = ranked.placeIds
      .map((id) => byId.get(id))
      .filter((p): p is Place => Boolean(p));

    if (selected.length < 2) continue;

    const directions = await Promise.resolve(
      router.buildDirections({
        start: intent.start,
        waypoints: selected.map((p) => ({ lat: p.lat, lng: p.lng })),
        targetDistanceM: targetM,
        preferSafe: true,
      }),
    );

    const err = distanceErrorPct(directions.distanceM, intent.distanceKm);
    if (!best || err < best.err) {
      best = {
        selected,
        blurbs: ranked.blurbs,
        usedFallback: ranked.usedFallback,
        geometry: directions.coordinates,
        distanceM: directions.distanceM,
        provider: directions.provider,
        err,
        routeTitle: ranked.routeTitle,
      };
    }
    if (err <= DISTANCE_TOLERANCE_IDEAL) break;
    if (err <= DISTANCE_TOLERANCE) break;
  }

  if (!best) {
    throw new Error('No hay suficientes lugares seguros en el catálogo');
  }

  // Place-level refine: add/drop catalog places until ±8% or attempts exhausted.
  if (best.err > DISTANCE_TOLERANCE) {
    best = await refineDistanceWithPlaces({
      intent,
      places,
      router,
      targetM,
      current: best,
    });
  }

  const storyPoints = best.selected.map((p) =>
    buildStoryPoint(p, best!.blurbs[p.id] ?? blurbForPlace(p)),
  );
  const photoSpots = best.selected.map(buildPhotoSpot);

  const paceSecPerKm = 340; // ~5:40 /km estimado
  const estimatedMovingTimeSec = Math.round((best.distanceM / 1000) * paceSecPerKm);

  return {
    id: `route_${Date.now().toString(36)}`,
    name: best.routeTitle?.trim() || routeNameFor(intent, best.selected),
    intent,
    geometry: { type: 'LineString', coordinates: best.geometry },
    distanceM: best.distanceM,
    elevGainM: Math.round(intent.distanceKm * 18),
    estimatedMovingTimeSec,
    storyPoints,
    photoSpots,
    provider: {
      router: best.provider,
      llm: best.usedFallback ? undefined : llmProvider ?? 'mock-rank-v2',
    },
    createdAt: new Date().toISOString(),
    cacheKey: cacheKeyForIntent(intent),
    usedFallback: best.usedFallback,
  };
}

type RouteCandidate = {
  selected: Place[];
  blurbs: Record<string, string>;
  usedFallback: boolean;
  geometry: [number, number][];
  distanceM: number;
  provider: string;
  err: number;
  routeTitle?: string;
};

function routerUsesMapbox(router: RouteRouter): boolean {
  return (router as { provider?: string }).provider === 'mapbox-walking';
}

async function refineDistanceWithPlaces(args: {
  intent: RouteIntent;
  places: Place[];
  router: RouteRouter;
  targetM: number;
  current: RouteCandidate;
}): Promise<RouteCandidate> {
  const { intent, places, router, targetM } = args;
  let best = args.current;
  const ranked = heuristicRankPlaceIds(places, intent.style, places.length);
  const selectedIds = () => new Set(best.selected.map((p) => p.id));
  const byId = new Map(places.map((p) => [p.id, p]));

  for (let i = 0; i < 6 && best.err > DISTANCE_TOLERANCE; i++) {
    let nextSelected: Place[] | null = null;

    if (best.distanceM > targetM * 1.08 && best.selected.length > 2) {
      // Drop farthest from start (often the long detour)
      const sorted = [...best.selected].sort(
        (a, b) => haversineM(intent.start, b) - haversineM(intent.start, a),
      );
      const dropId = sorted[0]!.id;
      nextSelected = best.selected.filter((p) => p.id !== dropId);
    } else if (best.distanceM < targetM * 0.92) {
      const used = selectedIds();
      const addId = ranked.find((id) => !used.has(id));
      if (!addId) break;
      const place = byId.get(addId);
      if (!place) break;
      nextSelected = [...best.selected, place];
    } else {
      break;
    }

    if (!nextSelected || nextSelected.length < 2) break;

    const directions = await Promise.resolve(
      router.buildDirections({
        start: intent.start,
        waypoints: nextSelected.map((p) => ({ lat: p.lat, lng: p.lng })),
        targetDistanceM: targetM,
        preferSafe: true,
      }),
    );
    const err = distanceErrorPct(directions.distanceM, intent.distanceKm);
    const blurbs = { ...best.blurbs };
    for (const p of nextSelected) {
      if (!blurbs[p.id]) blurbs[p.id] = blurbForPlace(p);
    }

    if (err < best.err || err <= DISTANCE_TOLERANCE) {
      best = {
        selected: nextSelected,
        blurbs,
        usedFallback: best.usedFallback,
        geometry: directions.coordinates,
        distanceM: directions.distanceM,
        provider: directions.provider,
        err,
      };
    } else {
      // No improvement — stop to avoid thrashing API calls
      break;
    }
  }

  return best;
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

/** Geometry vertices may be router-interpolated; waypoints must stay catalog-only. */
export function assertRouterOwnedGeometry(route: DiscoveryRoute): void {
  if (route.geometry.type !== 'LineString') {
    throw new Error('geometry must be LineString');
  }
  if (route.geometry.coordinates.length < 2) {
    throw new Error('geometry too short');
  }
  const dist = lineDistanceM(route.geometry.coordinates);
  if (Math.abs(dist - route.distanceM) > 25) {
    throw new Error('distanceM does not match geometry');
  }
}
