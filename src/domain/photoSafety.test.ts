import assert from 'node:assert/strict';
import { evaluatePhotoSafety } from './photoSafety';

assert.equal(
  evaluatePhotoSafety({
    distanceToSpotM: 80,
    speedMps: 2.5,
    accuracyM: 10,
  }).action,
  'show',
);

assert.equal(
  evaluatePhotoSafety({
    distanceToSpotM: 80,
    speedMps: 5.5,
  }).action,
  'defer',
);

assert.equal(
  evaluatePhotoSafety({
    distanceToSpotM: 80,
    speedMps: 2.5,
    nearCrossing: true,
  }).action,
  'defer',
);

assert.equal(
  evaluatePhotoSafety({
    distanceToSpotM: 200,
    speedMps: 2.5,
  }).action,
  'silence',
);

console.log('photoSafety tests: ok');
