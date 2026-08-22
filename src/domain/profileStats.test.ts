import assert from 'node:assert/strict';
import { aggregateProfileStats } from './profileStats';
import type { RunSession } from '../types/run';

const base = (partial: Partial<RunSession>): RunSession => ({
  id: 'r1',
  routeId: 'rt',
  routeName: 'Loop',
  cityName: 'Barcelona',
  cityId: 'barcelona',
  startedAt: '2026-01-01T08:00:00.000Z',
  finishedAt: '2026-01-01T09:00:00.000Z',
  status: 'completed',
  samples: [],
  splitsKm: [],
  distanceM: 10000,
  durationSec: 3600,
  movingTimeSec: 3500,
  avgPaceSecPerKm: 350,
  storyEvents: [{ storyPointId: 's1', version: 'quick', at: '2026-01-01T08:10:00.000Z' }],
  photos: [],
  narrationAdaptations: 0,
  nextStoryIndex: 1,
  ...partial,
});

const stats = aggregateProfileStats([
  base({ id: 'a' }),
  base({
    id: 'b',
    cityId: 'roma',
    cityName: 'Roma',
    distanceM: 5000,
    storyEvents: [],
    photos: [
      {
        id: 'p1',
        runId: 'b',
        uri: 'file://x',
        takenAt: '2026-01-02T08:00:00.000Z',
        source: 'camera',
      },
    ],
  }),
  base({ id: 'c', status: 'discarded', distanceM: 99999 }),
]);

assert.equal(stats.completedRuns, 2);
assert.equal(stats.totalDistanceKm, 15);
assert.equal(stats.totalStories, 1);
assert.equal(stats.totalPhotos, 1);
assert.equal(stats.cities, 2);

console.log('profileStats tests: ok');
