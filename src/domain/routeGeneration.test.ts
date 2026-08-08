import assert from 'node:assert/strict';
import { getPlacesForCity } from '../data/places';
import {
  assertNoInventedGeometry,
  distanceErrorPct,
  generateDiscoveryRoute,
  heuristicRankPlaceIds,
  isDistanceWithinTolerance,
  mockLlmSelectPlaces,
} from './routeGeneration';
import type { RouteIntent } from '../types/routeIntent';

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
assert.ok(catalog.length >= 6);

const ranked = heuristicRankPlaceIds(catalog, 'architecture', 5);
assert.equal(ranked.length, 5);
for (const id of ranked) {
  assert.ok(catalog.some((p) => p.id === id));
}

const llm = mockLlmSelectPlaces(catalog, 'architecture', 6);
assert.ok(llm.placeIds.every((id) => catalog.some((p) => p.id === id)));

const route = generateDiscoveryRoute(intent);
assertNoInventedGeometry(route, catalog);
assert.ok(route.geometry.coordinates.length >= 2);
assert.ok(route.storyPoints.length > 0);
assert.ok(route.photoSpots.length > 0);

// Photo/story placeIds must be catalog-only
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
assert.ok(err <= 0.2, `distance error too high: ${err}`);
assert.equal(typeof isDistanceWithinTolerance(route.distanceM, 10), 'boolean');

console.log('routeGeneration tests: ok');
