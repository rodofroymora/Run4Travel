import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildStravaActivityPayload } from '../domain/stravaActivity';
import {
  enqueueIdempotent,
  jobsReadyToFlush,
  markFailed,
  markSucceeded,
} from '../domain/stravaOutbox';
import type { RunSession } from '../types/run';
import type { OutboxJob, StravaConnection } from '../types/strava';
import { track } from './analytics';
import {
  getStravaClientId,
  getStravaClientSecret,
  refreshStravaToken,
} from './stravaAuth';

export {
  buildStravaActivityPayload,
  stravaActivityDescription,
  stravaActivityName,
} from '../domain/stravaActivity';

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
    if (!raw) return null;
    const conn = JSON.parse(raw) as StravaConnection;
    // Back-compat for older stub connections
    if (!conn.mode) conn.mode = conn.accessToken ? 'oauth' : 'mock';
    return conn;
  } catch {
    return null;
  }
}

export async function saveStravaConnection(
  conn: StravaConnection,
): Promise<StravaConnection> {
  await AsyncStorage.setItem(CONN_KEY, JSON.stringify(conn));
  track('strava_connect_succeeded', {
    athleteId: conn.athleteId,
    mode: conn.mode,
  });
  return conn;
}

/** @deprecated use saveStravaConnection after beginStravaOAuth */
export async function connectStravaStub(athleteName = 'Marta'): Promise<StravaConnection> {
  return saveStravaConnection({
    athleteId: `ath_${Date.now().toString(36)}`,
    athleteName,
    connectedAt: new Date().toISOString(),
    autoSync: true,
    mode: 'mock',
  });
}

export async function setStravaAutoSync(autoSync: boolean): Promise<StravaConnection | null> {
  const conn = await getStravaConnection();
  if (!conn) return null;
  const next = { ...conn, autoSync };
  await AsyncStorage.setItem(CONN_KEY, JSON.stringify(next));
  return next;
}

export async function disconnectStrava(): Promise<void> {
  await AsyncStorage.removeItem(CONN_KEY);
  track('strava_disconnected', {});
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

async function ensureAccessToken(conn: StravaConnection): Promise<string> {
  if (!conn.accessToken) {
    throw new Error('no_access_token');
  }
  const expiresMs = conn.expiresAt ? Date.parse(conn.expiresAt) : 0;
  const needsRefresh = expiresMs > 0 && expiresMs < Date.now() + 60_000;
  if (!needsRefresh) return conn.accessToken;

  const clientId = getStravaClientId();
  const clientSecret = getStravaClientSecret();
  if (!clientId || !clientSecret || !conn.refreshToken) {
    return conn.accessToken;
  }

  const refreshed = await refreshStravaToken({
    clientId,
    clientSecret,
    refreshToken: conn.refreshToken,
  });
  const next: StravaConnection = {
    ...conn,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: new Date(refreshed.expires_at * 1000).toISOString(),
  };
  await AsyncStorage.setItem(CONN_KEY, JSON.stringify(next));
  return next.accessToken!;
}

async function realUpload(session: RunSession, conn: StravaConnection): Promise<string> {
  const token = await ensureAccessToken(conn);
  const payload = buildStravaActivityPayload(session);
  const body = new URLSearchParams({
    name: payload.name,
    type: payload.type,
    sport_type: payload.sport_type,
    start_date_local: payload.start_date_local,
    elapsed_time: String(payload.elapsed_time),
    description: payload.description,
    distance: String(payload.distance),
  });

  const res = await fetch('https://www.strava.com/api/v3/activities', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Strava upload HTTP ${res.status}${text ? `: ${text.slice(0, 160)}` : ''}`);
  }
  const data = (await res.json()) as { id?: number };
  if (!data.id) throw new Error('Strava upload sin id');
  return String(data.id);
}

/** Upload mock idempotente: misma runId → mismo activityId. */
async function mockUpload(session: RunSession, idempotencyKey: string): Promise<string> {
  if (!online) throw new Error('offline');
  if (failNextUpload) {
    failNextUpload = false;
    throw new Error('strava_unavailable');
  }
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
  const conn = await getStravaConnection();

  for (const job of ready) {
    if (job.status === 'succeeded') {
      succeeded += 1;
      continue;
    }
    const session = await getSession(job.runId);
    if (!session || session.status !== 'completed') continue;

    try {
      let activityId: string;
      if (conn?.mode === 'oauth' && conn.accessToken) {
        if (!online) throw new Error('offline');
        activityId = await realUpload(session, conn);
      } else {
        activityId = await mockUpload(session, job.idempotencyKey);
      }
      jobs = markSucceeded(jobs, job.runId, activityId);
      succeeded += 1;
      track('strava_sync_succeeded', {
        runId: job.runId,
        activityId,
        mode: conn?.mode ?? 'mock',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error';
      jobs = markFailed(jobs, job.runId, msg);
      track('strava_sync_failed', { runId: job.runId, error: msg });
    }
  }

  await writeOutbox(jobs);
  return { flushed: ready.length, succeeded };
}

export function outboxStatusLabel(status: OutboxJob['status']): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'succeeded':
      return 'Sincronizado';
    case 'failed':
      return 'Falló · reintento';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}
