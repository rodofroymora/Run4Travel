import assert from 'node:assert/strict';
import { locationToGpsSample } from './gpsSample';

const sample = locationToGpsSample(
  {
    coords: {
      latitude: 41.39,
      longitude: 2.16,
      altitude: 12,
      accuracy: 8,
      speed: 2.5,
    },
    timestamp: 1_700_000_000_000,
  },
  1_700_000_000_111,
);

assert.equal(sample.lat, 41.39);
assert.equal(sample.lng, 2.16);
assert.equal(sample.alt, 12);
assert.equal(sample.acc, 8);
assert.equal(sample.speed, 2.5);
assert.equal(sample.t, 1_700_000_000_000);

const noSpeed = locationToGpsSample({
  coords: {
    latitude: 19.4,
    longitude: -99.1,
    altitude: null,
    accuracy: 25,
    speed: -1,
  },
  timestamp: 0,
});

assert.equal(noSpeed.speed, undefined);
assert.equal(noSpeed.alt, undefined);
assert.ok(noSpeed.t > 0);

console.log('gpsSample tests: ok');
