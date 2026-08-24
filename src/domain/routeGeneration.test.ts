import assert from 'node:assert/strict';
import { PLACE_CATALOG_VERSION, getPlacesForCity } from '../data/places';
import {
  assertNoInventedGeometry,
  assertRouterOwnedGeometry,
  cacheKeyForIntent,
  distanceErrorPct,
  generateDiscoveryRoute,
  heuristicRankPlaceIds,
  isDistanceIdeal,
  isDistanceWithinTolerance,
  mockLlmSelectPlaces,
} from './routeGeneration';
import { mockSafeRouter } from '../services/routing';
import type { RouteIntent } from '../types/routeIntent';

async function main() {
  const intent: RouteIntent = {
    cityId: 'barcelona',
    cityName: 'Barcelona',
    start: { lat: 41.3916, lng: 2.1649, label: 'Casa Batlló' },
    distanceKm: 10,
    style: 'architecture',
    locale: 'es-ES',
    createdAt: new Date().toISOString(),
  };

  const catalog = getPlacesForCity('barcelona', intent.start);
  assert.ok(catalog.length >= 12, 'expanded Barcelona catalog');

  const ranked = heuristicRankPlaceIds(catalog, 'architecture', 5);
  assert.equal(ranked.length, 5);
  for (const id of ranked) {
    assert.ok(catalog.some((p) => p.id === id));
  }

  const llm = mockLlmSelectPlaces(catalog, 'architecture', 6);
  assert.ok(llm.placeIds.every((id) => catalog.some((p) => p.id === id)));
  assert.equal(llm.usedFallback, false);

  const fallback = mockLlmSelectPlaces(catalog, 'architecture', 6, true);
  assert.equal(fallback.usedFallback, true);

  const route = await generateDiscoveryRoute(intent, mockSafeRouter);
  assertNoInventedGeometry(route, catalog);
  assertRouterOwnedGeometry(route);
  assert.ok(route.geometry.coordinates.length >= 2);
  assert.ok(route.storyPoints.length > 0);
  assert.ok(route.photoSpots.length > 0);
  assert.ok(route.cacheKey.includes(PLACE_CATALOG_VERSION));
  assert.equal(route.cacheKey, cacheKeyForIntent(intent));
  assert.equal(route.provider.router, 'mock-osrm-safe');

  for (const sp of route.storyPoints) {
    assert.ok(catalog.some((p) => p.id === sp.placeId));
  }
  for (const ps of route.photoSpots) {
    const place = catalog.find((p) => p.id === ps.placeId);
    assert.ok(place);
    assert.equal(ps.lat, place!.lat);
    assert.equal(ps.lng, place!.lng);
  }

  const err = distanceErrorPct(route.distanceM, intent.distanceKm);
  assert.ok(
    isDistanceWithinTolerance(route.distanceM, intent.distanceKm),
    `distance error too high: ${(err * 100).toFixed(1)}% (actual ${route.distanceM}m)`,
  );

  for (const km of [5, 10, 15] as const) {
    const r = await generateDiscoveryRoute(
      { ...intent, distanceKm: km },
      mockSafeRouter,
    );
    assertNoInventedGeometry(r, catalog);
    assert.ok(
      isDistanceWithinTolerance(r.distanceM, km),
      `${km}k out of tolerance: ${distanceErrorPct(r.distanceM, km)}`,
    );
  }

  const cdmxIntent: RouteIntent = {
    ...intent,
    cityId: 'cdmx',
    cityName: 'Ciudad de México',
    start: { lat: 19.4326, lng: -99.1332, label: 'Zócalo' },
    style: 'historic',
    distanceKm: 10,
  };
  const cdmxCatalog = getPlacesForCity('cdmx', cdmxIntent.start);
  assert.ok(cdmxCatalog.length >= 10);
  const cdmxRoute = await generateDiscoveryRoute(cdmxIntent, mockSafeRouter);
  assertNoInventedGeometry(cdmxRoute, cdmxCatalog);
  assert.ok(isDistanceWithinTolerance(cdmxRoute.distanceM, 10));

  assert.equal(typeof isDistanceIdeal(route.distanceM, 10), 'boolean');

  const cafeRoute = await generateDiscoveryRoute(
    { ...intent, style: 'cafes' },
    mockSafeRouter,
  );
  assertNoInventedGeometry(cafeRoute, catalog);
  assert.ok((cafeRoute.partnerOffers?.length ?? 0) > 0);
  assert.ok(cafeRoute.name.toLowerCase().includes('coffee') || cafeRoute.intent.style === 'cafes');

  console.log('routeGeneration tests: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
