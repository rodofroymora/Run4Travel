import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueueIdempotent,
  jobsReadyToFlush,
  markFailed,
  markSucceeded,
} from '../domain/stravaOutbox';
import type { RunSession } from '../types/run';
import type { OutboxJob, StravaConnection } from '../types/strava';
import { track } from './analytics';

const CONN_KEY = '@r4t/strava_connection';
const OUTBOX_KEY = '@r4t/strava_outbox';

let online = true;
let failNextUpload = false;

export function setMockNetworkOnline(value: boolean): void {
  online = value;
}

export function setFailNextStravaUpload(value: boolean): void {
  failNextUpload = value;
}

export async function getStravaConnection(): Promise<StravaConnection | null> {
  try {
    const raw = await AsyncStorage.getItem(CONN_KEY);
    return raw ? (JSON.parse(raw) as StravaConnection) : null;
  } catch {
    return null;
  }
}

export async function connectStravaStub(athleteName = 'Marta'): Promise<StravaConnection> {
  const conn: StravaConnection = {
    athleteId: `ath_${Date.now().toString(36)}`,
    athleteName,
    connectedAt: new Date().toISOString(),
    autoSync: true,
  };
  await AsyncStorage.setItem(CONN_KEY, JSON.stringify(conn));
  track('strava_connect_succeeded', { athleteId: conn.athleteId });
  return conn;
}

export async function disconnectStrava(): Promise<void> {
  await AsyncStorage.removeItem(CONN_KEY);
}

async function readOutbox(): Promise<OutboxJob[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxJob[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(jobs: OutboxJob[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(jobs));
}

export async function getOutbox(): Promise<OutboxJob[]> {
  return readOutbox();
}

export async function queueStravaUpload(session: RunSession): Promise<OutboxJob> {
  const jobs = await readOutbox();
  const { jobs: next, job, created } = enqueueIdempotent(jobs, session.id);
  await writeOutbox(next);
  if (created) track('strava_sync_queued', { runId: session.id });
  return job;
}

/** Upload mock idempotente: misma runId → mismo activityId. */
async function mockUpload(session: RunSession, idempotencyKey: string): Promise<string> {
  if (!online) throw new Error('offline');
  if (failNextUpload) {
    failNextUpload = false;
    throw new Error('strava_unavailable');
  }
  // Hash estable del runId
  const activityId = `strava_${idempotencyKey.replace(/[^a-z0-9]/gi, '_')}`;
  await new Promise((r) => setTimeout(r, 400));
  void session;
  return activityId;
}

export async function flushStravaOutbox(
  getSession: (runId: string) => Promise<RunSession | null>,
): Promise<{ flushed: number; succeeded: number }> {
  let jobs = await readOutbox();
  const ready = jobsReadyToFlush(jobs);
  let succeeded = 0;

  for (const job of ready) {
    if (job.status === 'succeeded') {
      succeeded += 1;
      continue;
    }
    const session = await getSession(job.runId);
    if (!session || session.status !== 'completed') continue;

    try {
      const activityId = await mockUpload(session, job.idempotencyKey);
      jobs = markSucceeded(jobs, job.runId, activityId);
      succeeded += 1;
      track('strava_sync_succeeded', { runId: job.runId, activityId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error';
      jobs = markFailed(jobs, job.runId, msg);
      track('strava_sync_failed', { runId: job.runId, error: msg });
    }
  }

  await writeOutbox(jobs);
  return { flushed: ready.length, succeeded };
}

export function stravaActivityName(session: RunSession): string {
  return `Run4Travel · ${session.routeName} · ${session.cityName}`;
}
