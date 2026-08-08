import { getPlacesForCity } from '../data/places';
import {
  assertNoInventedGeometry,
  cacheKeyForIntent,
  distanceErrorPct,
  generateDiscoveryRoute,
} from '../domain/routeGeneration';
import type { DiscoveryRoute } from '../types/discovery';
import type { RouteIntent } from '../types/routeIntent';
import { track } from './analytics';
import { getCachedRoute, saveRoute } from './routeCache';

export type GenerateProgress =
  | { phase: 'cache'; message: string }
  | { phase: 'places'; message: string }
  | { phase: 'rank'; message: string }
  | { phase: 'route'; message: string }
  | { phase: 'done'; message: string; route: DiscoveryRoute }
  | { phase: 'error'; message: string };

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

  const key = cacheKeyForIntent(intent);
  onProgress?.({ phase: 'cache', message: `Explorando ${intent.cityName}…` });
  await sleep(400);

  const cached = await getCachedRoute(key);
  if (cached) {
    track('route_generate_cache_hit', { routeId: cached.id });
    onProgress?.({ phase: 'done', message: 'Ruta lista desde caché', route: cached });
    track('route_generate_succeeded', { routeId: cached.id, cache: 1 });
    return cached;
  }

  onProgress?.({ phase: 'places', message: 'Eligiendo lugares con alma…' });
  await sleep(500);

  onProgress?.({ phase: 'rank', message: '✦ Ordenando tu descubrimiento…' });
  await sleep(450);

  onProgress?.({ phase: 'route', message: 'Trazando una ruta segura…' });
  await sleep(500);

  try {
    const route = generateDiscoveryRoute(intent);
    const catalog = getPlacesForCity(intent.cityId, intent.start);
    assertNoInventedGeometry(route, catalog);
    await saveRoute(route);

    track('route_generate_succeeded', {
      routeId: route.id,
      distanceErrorPct: Math.round(distanceErrorPct(route.distanceM, intent.distanceKm) * 1000) / 10,
      stories: route.storyPoints.length,
      photos: route.photoSpots.length,
      fallback: route.usedFallback ? 1 : 0,
    });
    if (route.usedFallback) track('route_fallback_used', { reason: 'llm_error' });

    onProgress?.({ phase: 'done', message: '✦ Tu Discovery Run está lista', route });
    return route;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al crear la ruta';
    track('route_generate_failed', { message });
    onProgress?.({ phase: 'error', message });
    throw e;
  }
}
