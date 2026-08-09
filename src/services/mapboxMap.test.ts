import assert from 'node:assert/strict';
import { routeBounds, simplifyCoordinates } from '../services/mapboxMap';

const long: [number, number][] = Array.from({ length: 250 }, (_, i) => [
  2.1 + i * 0.001,
  41.3 + i * 0.0005,
]);
const simple = simplifyCoordinates(long, 50);
assert.ok(simple.length <= 51);
assert.deepEqual(simple[0], long[0]);
assert.deepEqual(simple[simple.length - 1], long[long.length - 1]);

const b = routeBounds([
  [2.1, 41.3],
  [2.2, 41.4],
  [2.15, 41.35],
]);
assert.ok(b);
assert.equal(b!.minLng, 2.1);
assert.equal(b!.maxLng, 2.2);
assert.equal(b!.minLat, 41.3);
assert.equal(b!.maxLat, 41.4);

assert.equal(routeBounds([]), null);
assert.equal(simplifyCoordinates(long.slice(0, 3), 100).length, 3);

console.log('mapboxMap tests: ok');
