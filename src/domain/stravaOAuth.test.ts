import assert from 'node:assert/strict';
import {
  buildStravaActivityPayload,
  stravaActivityDescription,
} from '../domain/stravaActivity';
import {
  athleteDisplayName,
  buildStravaAuthorizeUrl,
  parseOAuthRedirect,
} from '../domain/stravaOAuth';
import type { RunSession } from '../types/run';

const url = buildStravaAuthorizeUrl({
  clientId: '12345',
  redirectUri: 'run4travel://strava/callback',
});
assert.ok(url.includes('client_id=12345'));
assert.ok(url.includes('response_type=code'));
assert.ok(url.includes(encodeURIComponent('run4travel://strava/callback')));

const ok = parseOAuthRedirect(
  'run4travel://strava/callback?code=abc123&scope=read,activity:write',
);
assert.equal(ok.code, 'abc123');
assert.equal(ok.error, undefined);

const denied = parseOAuthRedirect('run4travel://strava/callback?error=access_denied');
assert.equal(denied.error, 'access_denied');

assert.equal(
  athleteDisplayName({ id: 1, firstname: 'Ana', lastname: 'López' }),
  'Ana López',
);
assert.equal(athleteDisplayName({ id: 2, username: 'runner' }), 'runner');

const session: RunSession = {
  id: 'run_test',
  routeId: 'route_1',
  routeName: 'Modernisme Loop',
  cityName: 'Barcelona',
  cityId: 'barcelona',
  startedAt: '2026-08-08T18:00:00.000Z',
  status: 'completed',
  samples: [],
  splitsKm: [],
  distanceM: 10200,
  durationSec: 3600,
  movingTimeSec: 3500,
  avgPaceSecPerKm: 340,
  storyEvents: [{ storyPointId: 'sp1', version: 'quick', at: '2026-08-08T18:10:00.000Z' }],
  photos: [],
  narrationAdaptations: 0,
  nextStoryIndex: 1,
};

const payload = buildStravaActivityPayload(session);
assert.equal(payload.type, 'Run');
assert.equal(payload.distance, 10200);
assert.ok(payload.name.includes('Modernisme Loop'));
assert.ok(stravaActivityDescription(session).includes('1 lugar'));

console.log('stravaOAuth tests: ok');
