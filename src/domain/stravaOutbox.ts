import type { OutboxJob } from '../types/strava';

export function idempotencyKeyForRun(runId: string): string {
  return `strava:${runId}`;
}

export function createOutboxJob(runId: string, now = new Date()): OutboxJob {
  return {
    id: `job_${runId}`,
    type: 'strava_upload',
    runId,
    idempotencyKey: idempotencyKeyForRun(runId),
    attempts: 0,
    nextAt: now.toISOString(),
    status: 'pending',
  };
}

/** Evita duplicar el mismo runId en la cola. */
export function enqueueIdempotent(
  jobs: OutboxJob[],
  runId: string,
  now = new Date(),
): { jobs: OutboxJob[]; created: boolean; job: OutboxJob } {
  const existing = jobs.find(
    (j) => j.runId === runId && j.status !== 'cancelled',
  );
  if (existing) {
    return { jobs, created: false, job: existing };
  }
  const job = createOutboxJob(runId, now);
  return { jobs: [...jobs, job], created: true, job };
}

export function markSucceeded(
  jobs: OutboxJob[],
  runId: string,
  stravaActivityId: string,
): OutboxJob[] {
  return jobs.map((j) =>
    j.runId === runId
      ? { ...j, status: 'succeeded' as const, stravaActivityId, lastError: undefined }
      : j,
  );
}

export function markFailed(
  jobs: OutboxJob[],
  runId: string,
  error: string,
  backoffMs = 60_000,
  now = new Date(),
): OutboxJob[] {
  return jobs.map((j) => {
    if (j.runId !== runId) return j;
    const attempts = j.attempts + 1;
    return {
      ...j,
      attempts,
      status: 'failed' as const,
      lastError: error,
      nextAt: new Date(now.getTime() + backoffMs * attempts).toISOString(),
    };
  });
}

export function jobsReadyToFlush(jobs: OutboxJob[], now = new Date()): OutboxJob[] {
  const t = now.getTime();
  return jobs.filter(
    (j) =>
      (j.status === 'pending' || j.status === 'failed') &&
      new Date(j.nextAt).getTime() <= t,
  );
}
