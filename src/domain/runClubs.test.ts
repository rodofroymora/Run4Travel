import assert from 'node:assert/strict';
import { createClub, joinClub } from './runClubs';

const base = createClub({
  cityId: 'barcelona',
  cityName: 'Barcelona',
  title: 'Barcelona Sunrise Run',
  whenLabel: 'Domingo · 07:00',
  distanceKm: 8,
  paceRange: '5:15–5:45/km',
  meetingPoint: 'Plaça de Catalunya',
});

assert.equal(base.runners, 1);
assert.equal(base.joined, true);

const joined = joinClub({ ...base, joined: false, runners: 6 });
assert.equal(joined.runners, 7);
assert.equal(joined.joined, true);

const again = joinClub(joined);
assert.equal(again.runners, 7);

console.log('runClubs tests: ok');
