import { MapboxSafeRouter } from './mapboxSafeRouter';
import { mockSafeRouter } from './mockSafeRouter';
import type {
  RouteDirectionsRequest,
  RouteDirectionsResult,
  RouteRouter,
} from './types';

export type { RouteDirectionsRequest, RouteDirectionsResult, RouteRouter } from './types';
export { mockSafeRouter, MockSafeRouter } from './mockSafeRouter';
export { MapboxSafeRouter, buildWaypointCandidates, orderNearest } from './mapboxSafeRouter';

export function getMapboxToken(): string | undefined {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();
  return token || undefined;
}

/** Prefer Mapbox when token is set; otherwise deterministic mock. */
export function getRouteRouter(): RouteRouter {
  const token = getMapboxToken();
  if (token) {
    return new FallbackRouter(new MapboxSafeRouter(token), mockSafeRouter);
  }
  return mockSafeRouter;
}

/**
 * If Mapbox fails (network, quota, bad token), fall back to mock geometry
 * so the Golden Path stays demoable offline.
 */
class FallbackRouter implements RouteRouter {
  constructor(
    private readonly primary: RouteRouter,
    private readonly fallback: RouteRouter,
  ) {}

  async buildDirections(
    req: RouteDirectionsRequest,
  ): Promise<RouteDirectionsResult> {
    try {
      return await Promise.resolve(this.primary.buildDirections(req));
    } catch (err) {
      console.warn(
        '[routing] Mapbox failed; using mock-osrm-safe',
        err instanceof Error ? err.message : err,
      );
      const result = await Promise.resolve(this.fallback.buildDirections(req));
      return {
        ...result,
        provider: `${result.provider}+mapbox-fallback`,
      };
    }
  }
}
