import assert from 'node:assert/strict';
import { getCityById, searchCities } from '../services/citiesApi';
import {
  buildRouteIntent,
  isDistanceKm,
  isPointInCityBounds,
  isRouteIntentComplete,
  isRouteStyle,
  snapStartToCity,
} from './routeIntent';

assert.equal(isDistanceKm(10), true);
assert.equal(isDistanceKm(7), false);
assert.equal(isRouteStyle('architecture'), true);
assert.equal(isRouteStyle('sprint'), false);

const barcelona = getCityById('barcelona');
if (!barcelona) throw new Error('barcelona missing');

const inside = { lat: 41.39, lng: 2.16, label: 'Casa Batlló' };
assert.equal(isPointInCityBounds(inside, barcelona), true);

const outside = { lat: 40.4, lng: 3.7, label: 'Madrid' };
assert.equal(isPointInCityBounds(outside, barcelona), false);
const snapped = snapStartToCity(outside, barcelona);
assert.equal(snapped.lat, barcelona.center.lat);
assert.equal(snapped.lng, barcelona.center.lng);

assert.equal(isRouteIntentComplete({ style: 'highlights' }), false);

const intent = buildRouteIntent({
  city: barcelona,
  start: inside,
  distanceKm: 10,
  style: 'architecture',
  locale: 'es-ES',
});
if (!intent) throw new Error('intent should build');
assert.equal(intent.cityId, 'barcelona');
assert.equal(intent.distanceKm, 10);
assert.equal(intent.style, 'architecture');

const unsupported = getCityById('tokyo');
if (!unsupported) throw new Error('tokyo missing');
assert.equal(
  buildRouteIntent({
    city: unsupported,
    start: { ...unsupported.center },
    distanceKm: 5,
    style: 'highlights',
  }),
  null,
);

const results = searchCities('barce');
assert.ok(results.some((c) => c.id === 'barcelona'));

console.log('routeIntent tests: ok');
