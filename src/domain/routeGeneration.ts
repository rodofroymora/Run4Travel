import { PLACE_CATALOG_VERSION, blurbForPlace, getPlacesForCity } from '../data/places';
import { offersForSelectedPlaces } from './partnerOffers';
import { fetchLlmStories, type StoryDraft } from '../services/llmCopy';
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
            : style === 'cafes' && p.category === 'cafe'
              ? 0.2
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
  startLabel?: string;
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
    // Pad if ✦ returns too few stops for the distance budget.
    let placeIds = [...remote.placeIds];
    if (placeIds.length < args.maxCount) {
      const filler = heuristicRankPlaceIds(args.places, args.style, args.maxCount);
      for (const id of filler) {
        if (!placeIds.includes(id)) placeIds.push(id);
        if (placeIds.length >= args.maxCount) break;
      }
    }
    const blurbs = { ...remote.blurbs };
    for (const id of placeIds) {
      if (!blurbs[id]) {
        const p = args.places.find((x) => x.id === id);
        if (p) blurbs[id] = blurbForPlace(p);
      }
    }
    return {
      placeIds,
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

function estimateNarrationSec(text: string, cap: number): number {
  // ~13 chars/sec for calm podcast Spanish
  return Math.max(20, Math.min(cap, Math.round(text.length / 13)));
}

/** Local podcast script when ✦ API is unavailable — still spoken, not a tweet. */
function podcastFallback(place: Place, blurb: string): StoryDraft {
  const hook = blurb.replace(/^✦\s*/, '') || `${place.name} te espera a pie de calle.`;
  return {
    quick: `✦ Mientras te acercas a ${place.name}, baja un segundo el ritmo mental. ${hook} Sigue por la acera, respira, y deja que este rincón de la ciudad te hable al pasar.`,
    standard: `✦ Bienvenido a este tramo frente a ${place.name}. Soy tu guía de Discovery Run. ${hook} Fíjate en la luz, en los detalles de la fachada o del paisaje, y en cómo la gente usa este espacio. No te detengas en la calzada: la historia viaja contigo mientras corres. Cuando pases el punto, lleva contigo una imagen clara de este lugar.`,
    deep: `✦ Abre este episodio en ${place.name}. Aquí la ciudad baja la voz y te cuenta algo más lento. ${hook} Imagina quiénes cruzaron este mismo suelo antes que tú — vecinos, viajeros, artesanos — y qué ritmo tenía el barrio en otras décadas. Observa texturas, sombra y sonido alrededor. Si puedes, alinea una mirada segura desde la acera sin frenar el tráfico ni tu carrera. Este es el corte largo: un recuerdo sensorial para cuando termines el run y vuelvas al mapa en la cabeza.`,
  };
}

function buildStoryPoint(
  place: Place,
  blurb: string,
  draft?: StoryDraft,
  partnerOfferId?: string,
): StoryPoint {
  const base = blurb || blurbForPlace(place);
  const fallback = podcastFallback(place, base);
  const quick = draft?.quick ?? fallback.quick;
  const standard = draft?.standard ?? fallback.standard;
  const deep = draft?.deep ?? fallback.deep;
  return {
    id: `sp-${place.id}`,
    placeId: place.id,
    placeName: place.name,
    shortDescription: quick.slice(0, 140),
    storyVersions: { quick, standard, deep },
    audio: {
      quick: `cache://audio/${place.id}/quick`,
      standard: `cache://audio/${place.id}/standard`,
      deep: `cache://audio/${place.id}/deep`,
    },
    durationSec: {
      quick: estimateNarrationSec(quick, 70),
      standard: estimateNarrationSec(standard, 140),
      deep: estimateNarrationSec(deep, 200),
    },
    photoSpotId: `ps-${place.id}`,
    partnerOfferId,
  };
}

function buildPhotoSpot(place: Place): PhotoSpot {
  return {
    id: `ps-${place.id}`,
    placeId: place.id,
    lat: place.lat,
    lng: place.lng,
    tip:
      place.category === 'cafe'
        ? `Enmarca ${place.name} desde la acera. El café espera al terminar — no cruces en rojo.`
        : `Desde la acera, enmarca ${place.name}. No te detengas en la calzada.`,
    radiusM: 120,
  };
}

function routeNameFor(intent: RouteIntent, firstPlaces: Place[]): string {
  if (intent.cityId === 'barcelona' || intent.cityName.toLowerCase().includes('barcelona')) {
    if (intent.style === 'architecture') return 'Modernisme Loop';
    if (intent.style === 'parks') return 'Parques & Miradores';
    if (intent.style === 'historic') return 'Gòtic & Born Run';
    if (intent.style === 'waterfront') return 'Mar & Passeig';
    if (intent.style === 'highlights') return 'Batlló Discovery';
  }
  if (intent.style === 'architecture' && intent.cityId === 'barcelona') {
    return 'Modernisme Loop';
  }
  if (intent.style === 'parks' && intent.cityId === 'barcelona') {
    return 'Parques & Miradores';
  }
  if (intent.style === 'historic' && intent.cityId === 'cdmx') {
    return 'Centro Histórico Loop';
  }
  if (intent.style === 'cafes') {
    return `${intent.cityName} Coffee Run`;
  }
  const lead = firstPlaces[0]?.name ?? intent.cityName;
  return `${lead} Discovery`;
}

function minWaypointsForDistance(distanceKm: number, forMapbox: boolean): number {
  // Discovery density: longer runs need more story/photo stops, not just longer legs.
  if (distanceKm <= 5) return forMapbox ? 4 : 5;
  if (distanceKm <= 10) return forMapbox ? 7 : 8;
  if (distanceKm <= 15) return forMapbox ? 8 : 10;
  if (distanceKm <= 21) return forMapbox ? 10 : 11;
  return forMapbox ? 11 : 12;
}

function waypointBudget(
  distanceKm: number,
  catalogSize: number,
  forMapbox = false,
): number[] {
  const minN = Math.min(catalogSize, minWaypointsForDistance(distanceKm, forMapbox));
  const base = minN;
  const candidates = forMapbox
    ? [base, base + 1, base + 2, Math.max(minN, base - 1), base + 3]
    : [base, base + 1, base + 2, Math.max(minN, base - 1)];

  return [...new Set(candidates.map((n) => Math.min(catalogSize, Math.max(minN, n))))];
}

/** Keep waypoints near the chosen start zone (not across the whole city). */
export function filterPlacesNearStart(
  places: Place[],
  start: { lat: number; lng: number },
  targetDistanceM: number,
): Place[] {
  const radius = Math.max(2500, targetDistanceM * 0.32);
  const near = places
    .map((p) => ({ p, d: haversineM(start, p) }))
    .filter((x) => x.d <= radius)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.p);
  if (near.length >= 4) return near;
  // Fallback: nearest N from start — still zone-local preference
  return [...places]
    .sort((a, b) => haversineM(start, a) - haversineM(start, b))
    .slice(0, Math.min(12, places.length));
}

/** Visit order matching the walking polyline (nearest-neighbor from start). */
export function orderPlacesNearest(
  start: { lat: number; lng: number },
  places: Place[],
): Place[] {
  const remaining = [...places];
  const ordered: Place[] = [];
  let cur = start;
  while (remaining.length) {
    remaining.sort((a, b) => haversineM(cur, a) - haversineM(cur, b));
    const next = remaining.shift()!;
    ordered.push(next);
    cur = next;
  }
  return ordered;
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
  const minPts = Math.min(
    places.length,
    minWaypointsForDistance(intent.distanceKm, forMapbox),
  );

  for (const maxPoints of waypointBudget(intent.distanceKm, places.length, forMapbox)) {
    const ranked = await selectPlacesWithLlm({
      places,
      style: intent.style,
      maxCount: maxPoints,
      cityName: intent.cityName,
      distanceKm: intent.distanceKm,
      startLabel: intent.start.label,
    });
    if (ranked.provider) llmProvider = ranked.provider;
    const byId = new Map(places.map((p) => [p.id, p]));
    const selected = ranked.placeIds
      .map((id) => byId.get(id))
      .filter((p): p is Place => Boolean(p));

    if (selected.length < 2) continue;

    const visitOrder = orderPlacesNearest(intent.start, selected);

    const directions = await Promise.resolve(
      router.buildDirections({
        start: intent.start,
        waypoints: visitOrder.map((p) => ({ lat: p.lat, lng: p.lng })),
        targetDistanceM: targetM,
        preferSafe: true,
      }),
    );

    const err = distanceErrorPct(directions.distanceM, intent.distanceKm);
    const denseEnough = visitOrder.length >= minPts;
    // Prefer denser discovery when distance is similar (don't stop at 4 stops on a 10K).
    const score = err + (denseEnough ? 0 : 0.15) - visitOrder.length * 0.005;
    const bestScore = best
      ? best.err + (best.selected.length >= minPts ? 0 : 0.15) - best.selected.length * 0.005
      : Infinity;

    if (!best || score < bestScore) {
      best = {
        selected: visitOrder,
        blurbs: ranked.blurbs,
        usedFallback: ranked.usedFallback,
        geometry: directions.coordinates,
        distanceM: directions.distanceM,
        provider: directions.provider,
        err,
        routeTitle: ranked.routeTitle,
      };
    }
    if (err <= DISTANCE_TOLERANCE_IDEAL && denseEnough) break;
    if (err <= DISTANCE_TOLERANCE && denseEnough) break;
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

  const storyDrafts =
    (await fetchLlmStories({
      cityName: intent.cityName,
      style: intent.style,
      locale: intent.locale,
      places: best.selected,
    })) ?? {};

  const partnerOffers = offersForSelectedPlaces(
    best.selected,
    intent.cityId,
    intent.style,
  );
  const offerByPlace = new Map(partnerOffers.map((o) => [o.placeId, o.id]));

  const storyPoints = best.selected.map((p) =>
    buildStoryPoint(
      p,
      best!.blurbs[p.id] ?? blurbForPlace(p),
      storyDrafts[p.id],
      offerByPlace.get(p.id),
    ),
  );
  const photoSpots = best.selected.map(buildPhotoSpot);

  const paceSecPerKm = 340; // ~5:40 /km estimado
  const estimatedMovingTimeSec = Math.round((best.distanceM / 1000) * paceSecPerKm);
  const zone = intent.start.label ? ` desde ${intent.start.label}` : '';
  const podcastIntro = `✦ Bienvenido a tu Discovery Run en ${intent.cityName}${zone}. Soy tu guía. Hoy recorremos unos ${intent.distanceKm} kilómetros con ${storyPoints.length} episodios. Mantén la acera, disfruta la ciudad, y cuando te acerques a cada lugar, te cuento su historia. Listos: empieza a correr.`;

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
    places: best.selected,
    partnerOffers,
    podcastIntro,
    provider: {
      router: best.provider,
      llm: best.usedFallback && !Object.keys(storyDrafts).length
        ? undefined
        : llmProvider ?? (Object.keys(storyDrafts).length ? 'llm-stories' : 'mock-rank-v2'),
    },
    createdAt: new Date().toISOString(),
    cacheKey: cacheKeyForIntent(intent),
    usedFallback: best.usedFallback && Object.keys(storyDrafts).length === 0,
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

    const visitOrder = orderPlacesNearest(intent.start, nextSelected);

    const directions = await Promise.resolve(
      router.buildDirections({
        start: intent.start,
        waypoints: visitOrder.map((p) => ({ lat: p.lat, lng: p.lng })),
        targetDistanceM: targetM,
        preferSafe: true,
      }),
    );
    const err = distanceErrorPct(directions.distanceM, intent.distanceKm);
    const blurbs = { ...best.blurbs };
    for (const p of visitOrder) {
      if (!blurbs[p.id]) blurbs[p.id] = blurbForPlace(p);
    }

    if (err < best.err || err <= DISTANCE_TOLERANCE) {
      best = {
        selected: visitOrder,
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
