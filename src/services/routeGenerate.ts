import { cafePlacesForCity } from '../data/cafes';
import { PLACES_BY_CITY, getPlacesForCity as getCatalogPlaces } from '../data/places';
import {
  assertNoInventedGeometry,
  assertRouterOwnedGeometry,
  cacheKeyForIntent,
  distanceErrorPct,
  generateDiscoveryRoute,
  isDistanceWithinTolerance,
} from '../domain/routeGeneration';
import type { DiscoveryRoute, Place } from '../types/discovery';
import type { RouteIntent } from '../types/routeIntent';
import { track } from './analytics';
import { fetchDynamicPlaces, geocodeCity } from './cityGeocode';
import { getLlmApiKey } from './llmRank';
import { clearExpiredRoutes, getCachedRoute, saveRoute } from './routeCache';
import { getMapboxToken } from './routing';
import { getCityById } from './citiesApi';

export type GenerateProgress =
  | { phase: 'cache'; message: string; step: number; total: number }
  | { phase: 'places'; message: string; step: number; total: number }
  | { phase: 'rank'; message: string; step: number; total: number }
  | { phase: 'route'; message: string; step: number; total: number }
  | { phase: 'validate'; message: string; step: number; total: number }
  | {
      phase: 'done';
      message: string;
      route: DiscoveryRoute;
      fromCache: boolean;
      distanceErrorPct: number;
    }
  | { phase: 'error'; message: string };

const TOTAL_STEPS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Catalog ∪ dynamic POIs. Coords always from catalog/geocoder — never ✦. */
export async function resolvePlacesForIntent(intent: RouteIntent): Promise<Place[]> {
  const catalog = getCatalogPlaces(intent.cityId, intent.start);
  const partners = cafePlacesForCity(intent.cityId);
  const hasCurated = Boolean(PLACES_BY_CITY[intent.cityId]?.length);
  const wantCafes = intent.style === 'cafes';

  const city =
    getCityById(intent.cityId) ??
    (await geocodeCity(intent.cityName)) ?? {
      id: intent.cityId,
      name: intent.cityName,
      country: '',
      center: intent.start,
      bounds: {
        minLat: intent.start.lat - 0.08,
        maxLat: intent.start.lat + 0.08,
        minLng: intent.start.lng - 0.08,
        maxLng: intent.start.lng + 0.08,
      },
      supported: true,
      locales: [intent.locale],
    };

  const merge = (lists: Place[][]): Place[] => {
    const byKey = new Map<string, Place>();
    for (const list of lists) {
      for (const p of list) {
        const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
        if (!byKey.has(k)) byKey.set(k, p);
      }
    }
    return [...byKey.values()];
  };

  let dynamic: Place[] = [];
  try {
    dynamic = await fetchDynamicPlaces(city, wantCafes ? 18 : 16, {
      cafes: wantCafes,
    });
  } catch {
    dynamic = [];
  }

  if (wantCafes) {
    const cafes = merge([partners, dynamic.filter((p) => p.category === 'cafe'), catalog.filter((p) => p.category === 'cafe')]);
    if (cafes.length >= 3) {
      track('cafe_route_generated', { cityId: intent.cityId, n: cafes.length });
      return cafes;
    }
    return merge([cafes, catalog]).slice(0, 14);
  }

  if (hasCurated && catalog.length >= 6) {
    return catalog;
  }

  if (dynamic.length >= 4) {
    return merge([dynamic, catalog]);
  }
  return catalog;
}

export async function generateRoute(
  intent: RouteIntent,
  onProgress?: (p: GenerateProgress) => void,
): Promise<DiscoveryRoute> {
  track('route_generate_started', {
    cityId: intent.cityId,
    distanceKm: intent.distanceKm,
    style: intent.style,
    llm: getLlmApiKey() ? 1 : 0,
  });

  await clearExpiredRoutes();

  const key = cacheKeyForIntent(intent);
  onProgress?.({
    phase: 'cache',
    message: `Explorando ${intent.cityName}…`,
    step: 1,
    total: TOTAL_STEPS,
  });
  await sleep(350);

  const cached = await getCachedRoute(key);
  if (cached) {
    track('route_generate_cache_hit', { routeId: cached.id });
    const err = distanceErrorPct(cached.distanceM, intent.distanceKm);
    onProgress?.({
      phase: 'done',
      message: 'Ruta lista desde caché',
      route: cached,
      fromCache: true,
      distanceErrorPct: err,
    });
    track('route_generate_succeeded', { routeId: cached.id, cache: 1 });
    return cached;
  }

  onProgress?.({
    phase: 'places',
    message: '✦ Descubriendo lugares…',
    step: 2,
    total: TOTAL_STEPS,
  });
  const places = await resolvePlacesForIntent(intent);
  await sleep(200);

  onProgress?.({
    phase: 'rank',
    message: getLlmApiKey()
      ? '✦ Ordenando tu descubrimiento…'
      : '✦ Curando lugares…',
    step: 3,
    total: TOTAL_STEPS,
  });
  await sleep(200);

  onProgress?.({
    phase: 'route',
    message: getMapboxToken()
      ? 'Trazando ruta segura con Mapbox…'
      : 'Trazando una ruta segura…',
    step: 4,
    total: TOTAL_STEPS,
  });
  await sleep(250);

  onProgress?.({
    phase: 'validate',
    message: 'Comprobando distancia y seguridad…',
    step: 5,
    total: TOTAL_STEPS,
  });
  await sleep(150);

  try {
    const route = await generateDiscoveryRoute(intent, undefined, places);
    assertNoInventedGeometry(route, places);
    assertRouterOwnedGeometry(route);

    const err = distanceErrorPct(route.distanceM, intent.distanceKm);
    track('route_distance_error_pct', { pct: Math.round(err * 1000) / 10 });
    track('route_story_point_count', { n: route.storyPoints.length });
    track('route_photo_spot_count', { n: route.photoSpots.length });

    if (!isDistanceWithinTolerance(route.distanceM, intent.distanceKm)) {
      track('route_distance_out_of_tolerance', {
        pct: Math.round(err * 1000) / 10,
      });
    }

    await saveRoute(route);

    track('route_generate_succeeded', {
      routeId: route.id,
      distanceErrorPct: Math.round(err * 1000) / 10,
      stories: route.storyPoints.length,
      photos: route.photoSpots.length,
      fallback: route.usedFallback ? 1 : 0,
      router: route.provider.router,
      llm: route.provider.llm ?? 'none',
    });
    if (route.usedFallback) track('route_fallback_used', { reason: 'llm_error' });

    onProgress?.({
      phase: 'done',
      message: '✦ Tu Discovery Run está lista',
      route,
      fromCache: false,
      distanceErrorPct: err,
    });
    return route;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al crear la ruta';
    track('route_generate_failed', { message });
    onProgress?.({ phase: 'error', message });
    throw e;
  }
}
