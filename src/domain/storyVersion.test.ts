import assert from 'node:assert/strict';
import {
  selectStoryVersion,
  shouldTriggerAlongRoute,
  shouldTriggerStory,
  startBeforeArrivalM,
} from './storyVersion';

const durations = { quick: 18, standard: 42, deep: 90 };

const quick = selectStoryVersion({
  distanceToPointM: 40,
  paceSecPerKm: 250,
  durations,
});
assert.equal(quick.version, 'quick');

const deep = selectStoryVersion({
  distanceToPointM: 400,
  paceSecPerKm: 380,
  durations,
});
assert.equal(deep.version, 'deep');

const standard = selectStoryVersion({
  distanceToPointM: 120,
  paceSecPerKm: 340,
  durations,
});
assert.ok(['standard', 'quick', 'deep'].includes(standard.version));

const lead = startBeforeArrivalM(42, 340);
assert.ok(lead >= 120);
assert.ok(lead <= 260);
assert.ok(shouldTriggerStory(lead - 5, lead));
assert.equal(shouldTriggerStory(lead + 80, lead), false);

assert.ok(shouldTriggerAlongRoute(500, 520, 140));
assert.equal(shouldTriggerAlongRoute(500, 800, 140), false);

console.log('storyVersion tests: ok');
