import assert from 'node:assert/strict';
import { getMapboxToken, getRouteRouter, mockSafeRouter } from './index';

assert.equal(typeof getMapboxToken(), 'undefined');
assert.equal(getRouteRouter(), mockSafeRouter);

const directions = mockSafeRouter.buildDirections({
  start: { lat: 41.39, lng: 2.16 },
  waypoints: [
    { lat: 41.4, lng: 2.17 },
    { lat: 41.385, lng: 2.15 },
  ],
  targetDistanceM: 5000,
  preferSafe: true,
});
assert.ok(directions.coordinates.length >= 2);
assert.equal(directions.provider, 'mock-osrm-safe');
assert.ok(directions.distanceM > 0);

console.log('routing tests: ok');
