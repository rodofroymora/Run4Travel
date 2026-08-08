import assert from 'node:assert/strict';
import {
  enqueueIdempotent,
  idempotencyKeyForRun,
  jobsReadyToFlush,
  markFailed,
  markSucceeded,
} from './stravaOutbox';

const key = idempotencyKeyForRun('run_abc');
assert.equal(key, 'strava:run_abc');

const now = new Date('2026-01-01T12:00:00.000Z');
const first = enqueueIdempotent([], 'run_abc', now);
assert.equal(first.created, true);
assert.equal(first.job.idempotencyKey, key);

const second = enqueueIdempotent(first.jobs, 'run_abc', now);
assert.equal(second.created, false);
assert.equal(second.jobs.length, 1);

let jobs = markSucceeded(first.jobs, 'run_abc', 'strava_1');
assert.equal(jobs[0].status, 'succeeded');
assert.equal(jobs[0].stravaActivityId, 'strava_1');

jobs = enqueueIdempotent([], 'run_fail', now).jobs;
jobs = markFailed(jobs, 'run_fail', 'offline', 60_000, now);
assert.equal(jobs[0].status, 'failed');
assert.equal(jobs[0].attempts, 1);

const later = new Date(now.getTime() + 120_000);
const ready = jobsReadyToFlush(jobs, later);
assert.equal(ready.length, 1);

console.log('stravaOutbox tests: ok');
