import assert from 'node:assert/strict';
import { buildRunSummary, medalLabel } from './runSummary';
import type { RunSession } from '../types/run';

const base: RunSession = {
  id: 'run_test',
  routeId: 'route_1',
  routeName: 'Modernisme Loop',
  cityName: 'Barcelona',
  cityId: 'barcelona',
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  status: 'completed',
  samples: [],
  splitsKm: [
    { km: 1, paceSec: 310 },
    { km: 2, paceSec: 340 },
    { km: 3, paceSec: 370 },
  ],
  distanceM: 5200,
  durationSec: 1800,
  movingTimeSec: 1750,
  avgPaceSecPerKm: 330,
  storyEvents: [{ storyPointId: 'sp-1', version: 'standard', at: new Date().toISOString() }],
  photos: [],
  narrationAdaptations: 2,
  nextStoryIndex: 1,
};

const summary = buildRunSummary(base, 'ready');
assert.equal(summary.storiesListened, 1);
assert.equal(summary.splits.length, 3);
assert.equal(summary.albumStatus, 'ready');
assert.equal(summary.discoveryRunCompleted, true);
assert.equal(summary.isPacePb, true);
assert.ok(medalLabel(5200).includes('5K'));

const noStory = buildRunSummary({ ...base, storyEvents: [] }, 'pending');
assert.equal(noStory.discoveryRunCompleted, false);

console.log('runSummary tests: ok');
