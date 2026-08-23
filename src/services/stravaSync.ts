import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { buildRunGpx, buildStravaActivityPayload } from '../domain/stravaActivity';
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
  buildRunGpx,
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

async function waitForStravaUpload(
  token: string,
  uploadId: number,
  attempts = 8,
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`https://www.strava.com/api/v3/uploads/${uploadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Strava upload status HTTP ${res.status}: ${text.slice(0, 120)}`);
    }
    const data = (await res.json()) as {
      id?: number;
      activity_id?: number | null;
      status?: string;
      error?: string | null;
    };
    if (data.error) throw new Error(`Strava upload error: ${data.error}`);
    if (data.activity_id) return String(data.activity_id);
    await new Promise((r) => setTimeout(r, 700 + i * 200));
  }
  // Upload accepted but activity not ready yet — still treat upload id as success key
  return `upload_${uploadId}`;
}

/** Prefer GPX upload (GPS track); fall back to manual activity create. */
async function realUpload(session: RunSession, conn: StravaConnection): Promise<string> {
  const token = await ensureAccessToken(conn);
  const payload = buildStravaActivityPayload(session);

  if (session.samples.length >= 2) {
    const gpx = buildRunGpx(session);
    const form = new FormData();
    form.append('data_type', 'gpx');
    form.append('name', payload.name);
    form.append('description', payload.description);
    form.append('activity_type', 'run');
    form.append('external_id', session.id);
    const fileName = `${session.id}.gpx`;
    if (Platform.OS === 'web' && typeof Blob !== 'undefined') {
      form.append('file', new Blob([gpx], { type: 'application/gpx+xml' }), fileName);
    } else {
      const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (base) {
        const uri = `${base}${fileName}`;
        await FileSystem.writeAsStringAsync(uri, gpx, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        form.append('file', {
          uri,
          name: fileName,
          type: 'application/gpx+xml',
        } as unknown as Blob);
      } else {
        form.append('file', new Blob([gpx], { type: 'application/gpx+xml' }), fileName);
      }
    }

    const up = await fetch('https://www.strava.com/api/v3/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (up.status === 401 || up.status === 403) {
      throw new Error(`Strava upload auth HTTP ${up.status}`);
    }

    if (up.ok) {
      const data = (await up.json()) as { id?: number; activity_id?: number };
      if (data.activity_id) return String(data.activity_id);
      if (data.id) return waitForStravaUpload(token, data.id);
    }
    // Duplicate external_id often returns 409 — treat as success-ish below
    if (up.status === 409) {
      return `strava_dup_${session.id}`;
    }
  }

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
