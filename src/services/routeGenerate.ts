import { getPlacesForCity } from '../data/places';
import {
  assertNoInventedGeometry,
  assertRouterOwnedGeometry,
  cacheKeyForIntent,
  distanceErrorPct,
  generateDiscoveryRoute,
  isDistanceWithinTolerance,
} from '../domain/routeGeneration';
import type { DiscoveryRoute } from '../types/discovery';
import type { RouteIntent } from '../types/routeIntent';
import { track } from './analytics';
import { clearExpiredRoutes, getCachedRoute, saveRoute } from './routeCache';

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

export async function generateRoute(
  intent: RouteIntent,
  onProgress?: (p: GenerateProgress) => void,
): Promise<DiscoveryRoute> {
  track('route_generate_started', {
    cityId: intent.cityId,
    distanceKm: intent.distanceKm,
    style: intent.style,
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
    message: 'Eligiendo lugares con alma…',
    step: 2,
    total: TOTAL_STEPS,
  });
  await sleep(450);

  onProgress?.({
    phase: 'rank',
    message: '✦ Ordenando tu descubrimiento…',
    step: 3,
    total: TOTAL_STEPS,
  });
  await sleep(400);

  onProgress?.({
    phase: 'route',
    message: 'Trazando una ruta segura…',
    step: 4,
    total: TOTAL_STEPS,
  });
  await sleep(450);

  onProgress?.({
    phase: 'validate',
    message: 'Comprobando distancia y seguridad…',
    step: 5,
    total: TOTAL_STEPS,
  });
  await sleep(250);

  try {
    const route = generateDiscoveryRoute(intent);
    const catalog = getPlacesForCity(intent.cityId, intent.start);
    assertNoInventedGeometry(route, catalog);
    assertRouterOwnedGeometry(route);

    const err = distanceErrorPct(route.distanceM, intent.distanceKm);
    track('route_distance_error_pct', { pct: Math.round(err * 1000) / 10 });
    track('route_story_point_count', { n: route.storyPoints.length });
    track('route_photo_spot_count', { n: route.photoSpots.length });

    if (!isDistanceWithinTolerance(route.distanceM, intent.distanceKm)) {
      // Soft warn for analytics; still return best effort for demo
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
