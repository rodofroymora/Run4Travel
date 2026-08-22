import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RunSession } from '../types/run';

const KEY = '@r4t/run_sessions';
const ACTIVE_KEY = '@r4t/active_run';

async function readAll(): Promise<Record<string, RunSession>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, RunSession>) : {};
  } catch {
    return {};
  }
}

export async function saveRunSession(session: RunSession): Promise<void> {
  const all = await readAll();
  all[session.id] = session;
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  if (session.status === 'active' || session.status === 'paused') {
    await AsyncStorage.setItem(ACTIVE_KEY, session.id);
  } else {
    await AsyncStorage.removeItem(ACTIVE_KEY);
  }
}

export async function getRunSession(id: string): Promise<RunSession | null> {
  const all = await readAll();
  return all[id] ?? null;
}

export async function listRunSessions(): Promise<RunSession[]> {
  const all = await readAll();
  return Object.values(all).sort((a, b) =>
    (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt),
  );
}

export async function listCompletedRuns(): Promise<RunSession[]> {
  const all = await listRunSessions();
  return all.filter((s) => s.status === 'completed');
}

export async function getActiveRunSession(): Promise<RunSession | null> {
  const id = await AsyncStorage.getItem(ACTIVE_KEY);
  if (!id) return null;
  return getRunSession(id);
}
