import assert from 'node:assert/strict';
import {
  computeAvgPaceSecPerKm,
  computePartialSplit,
  computeSplitsKm,
  currentPaceSecPerKm,
  distanceFromSamples,
  paceBand,
  splitsToChartBars,
} from './runMetrics';
import type { GpsSample } from '../types/run';

function samplesAlong(
  points: { lat: number; lng: number; t: number }[],
): GpsSample[] {
  return points.map((p) => ({ ...p, speed: 3, acc: 8 }));
}

// ~1km east steps from Barcelona using ~0.012 deg lng ≈ 1km at this lat
const start = { lat: 41.39, lng: 2.16 };
const kmLng = 0.012;

const pts: { lat: number; lng: number; t: number }[] = [{ ...start, t: 0 }];
for (let km = 1; km <= 3; km++) {
  // 10 samples per km, 33s each → 330s/km
  for (let s = 1; s <= 10; s++) {
    pts.push({
      lat: start.lat,
      lng: start.lng + kmLng * (km - 1 + s / 10),
      t: (km - 1) * 330_000 + s * 33_000,
    });
  }
}

const samples = samplesAlong(pts);
const dist = distanceFromSamples(samples);
assert.ok(dist > 2800 && dist < 3200, `dist ${dist}`);

const splits = computeSplitsKm(samples);
assert.ok(splits.length >= 2, `splits ${splits.length}`);
for (const s of splits) {
  assert.ok(s.paceSec > 200 && s.paceSec < 500, `pace ${s.paceSec}`);
}

const avg = computeAvgPaceSecPerKm(dist, (samples[samples.length - 1].t - samples[0].t) / 1000);
assert.ok(avg > 200);

const cur = currentPaceSecPerKm(samples, 60);
assert.ok(cur > 0);

const partial = computePartialSplit(samples);
// may or may not have partial depending on exact km boundary
assert.equal(typeof paceBand(300), 'string');
assert.equal(paceBand(300), 'fast');
assert.equal(paceBand(340), 'steady');
assert.equal(paceBand(400), 'easy');

const bars = splitsToChartBars(splits, { partial });
assert.ok(bars.length >= splits.length);
assert.ok(bars.every((b) => b.h >= 12));

console.log('runMetrics tests: ok');
