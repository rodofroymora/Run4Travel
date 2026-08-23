import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEmptyPack, withProgress } from '../domain/offlinePack';
import type { DiscoveryRoute, OfflinePackStatus } from '../types/discovery';
import { track } from './analytics';
import { storyCacheKey, warmStoryAudioCache } from './storySpeech';

const KEY = '@r4t/offline_packs';

export type PackStepKey = 'geometry' | 'storiesText' | 'audio' | 'mapTiles';

export type DownloadOfflinePackOptions = {
  /** Cancela la descarga (p.ej. pérdida de red). Pack parcial se persiste; ready sigue false. */
  signal?: { aborted: boolean };
  /** Falla tras completar este paso (tests / demo de gate). */
  failAfterStep?: PackStepKey;
  onProgress?: (pack: OfflinePackStatus) => void;
  /** When provided, warms on-device TTS cache during audio step. */
  route?: DiscoveryRoute;
};

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

async function persistPack(pack: OfflinePackStatus): Promise<void> {
  const all = await readAll();
  all[pack.routeId] = pack;
  await writeAll(all);
}

export async function getOfflinePack(routeId: string): Promise<OfflinePackStatus | null> {
  const all = await readAll();
  return all[routeId] ?? null;
}

export async function downloadOfflinePack(
  routeId: string,
  onProgressOrOpts?: ((pack: OfflinePackStatus) => void) | DownloadOfflinePackOptions,
): Promise<OfflinePackStatus> {
  const opts: DownloadOfflinePackOptions =
    typeof onProgressOrOpts === 'function'
      ? { onProgress: onProgressOrOpts }
      : onProgressOrOpts ?? {};

  track('offline_pack_download_started', { routeId });
  let pack = createEmptyPack(routeId);
  opts.onProgress?.(pack);
  await persistPack(pack);

  const steps: PackStepKey[] = ['geometry', 'storiesText', 'audio', 'mapTiles'];

  for (const step of steps) {
    if (opts.signal?.aborted) {
      track('offline_pack_download_failed', { routeId, reason: 'aborted' });
      throw new Error('Descarga cancelada: sin red o interrumpida');
    }
    await new Promise((r) => setTimeout(r, 280));

    if (step === 'audio' && opts.route) {
      const locale = opts.route.intent.locale || 'es-ES';
      const entries = opts.route.storyPoints.flatMap((sp) =>
        (['quick', 'standard', 'deep'] as const).map((version) => ({
          key: storyCacheKey(sp.placeId, version, locale, sp.storyVersions[version]),
          text: sp.storyVersions[version],
          durationSec: sp.durationSec[version],
        })),
      );
      await warmStoryAudioCache(entries);
    }

    if (opts.signal?.aborted) {
      track('offline_pack_download_failed', { routeId, reason: 'aborted' });
      throw new Error('Descarga cancelada: sin red o interrumpida');
    }
    pack = withProgress(pack, { [step]: true } as Partial<OfflinePackStatus>);
    opts.onProgress?.(pack);
    await persistPack(pack);

    if (opts.failAfterStep === step) {
      track('offline_pack_download_failed', { routeId, reason: 'network' });
      throw new Error('Sin conexión: no se pudo completar el pack offline');
    }
  }

  track('offline_pack_download_completed', { routeId });
  return pack;
}
