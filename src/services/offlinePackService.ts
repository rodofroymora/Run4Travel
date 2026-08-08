import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEmptyPack, withProgress } from '../domain/offlinePack';
import type { OfflinePackStatus } from '../types/discovery';
import { track } from './analytics';

const KEY = '@r4t/offline_packs';

async function readAll(): Promise<Record<string, OfflinePackStatus>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, OfflinePackStatus>) : {};
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, OfflinePackStatus>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function getOfflinePack(routeId: string): Promise<OfflinePackStatus | null> {
  const all = await readAll();
  return all[routeId] ?? null;
}

export async function downloadOfflinePack(
  routeId: string,
  onProgress?: (pack: OfflinePackStatus) => void,
): Promise<OfflinePackStatus> {
  track('offline_pack_download_started', { routeId });
  let pack = createEmptyPack(routeId);
  onProgress?.(pack);

  const steps: (keyof OfflinePackStatus)[] = [
    'geometry',
    'storiesText',
    'audio',
    'mapTiles',
  ];

  for (const step of steps) {
    await new Promise((r) => setTimeout(r, 280));
    pack = withProgress(pack, { [step]: true } as Partial<OfflinePackStatus>);
    onProgress?.(pack);
  }

  const all = await readAll();
  all[routeId] = pack;
  await writeAll(all);
  track('offline_pack_download_completed', { routeId });
  return pack;
}
