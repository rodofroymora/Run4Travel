import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { track } from './analytics';

export type SpeakStoryOptions = {
  text: string;
  locale?: string;
  cacheKey?: string;
  onDone?: () => void;
  onError?: () => void;
};

export type AudioCacheEntry = {
  key: string;
  /** On-device TTS: mark text+locale as warmed (no CDN file yet). */
  uri: string;
  durationSec: number;
  createdAt: string;
  scriptHash: string;
};

const CACHE_KEY = '@r4t/story_audio_cache';

function hashScript(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(h).toString(36)}`;
}

function estimateDurationSec(text: string): number {
  // ~14 chars/sec Spanish narration
  return Math.max(4, Math.round(text.length / 14));
}

async function readCache(): Promise<Record<string, AudioCacheEntry>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AudioCacheEntry>) : {};
  } catch {
    return {};
  }
}

async function writeCache(map: Record<string, AudioCacheEntry>): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
}

export function storyCacheKey(
  placeId: string,
  version: string,
  locale: string,
  text: string,
): string {
  return `${placeId}+${version}+${locale}+${hashScript(text)}`;
}

export async function getStoryAudioCacheEntry(
  key: string,
): Promise<AudioCacheEntry | null> {
  const map = await readCache();
  return map[key] ?? null;
}

/** Prefetch / warm cache entries for offline pack (Generate → Cache → Reuse). */
export async function warmStoryAudioCache(
  entries: { key: string; text: string; durationSec?: number }[],
): Promise<number> {
  const map = await readCache();
  let added = 0;
  const now = new Date().toISOString();
  for (const e of entries) {
    if (map[e.key]) {
      track('story_cache_hit', { key: e.key, phase: 'warm' });
      continue;
    }
    map[e.key] = {
      key: e.key,
      uri: `tts://on-device/${e.key}`,
      durationSec: e.durationSec ?? estimateDurationSec(e.text),
      createdAt: now,
      scriptHash: hashScript(e.text),
    };
    added += 1;
  }
  await writeCache(map);
  return added;
}

/**
 * On-device TTS for story playback (offline-capable).
 * Cache marks scripts as warmed so offline pack can report audio readiness.
 */
export async function speakStory(opts: SpeakStoryOptions): Promise<'spoken' | 'skipped'> {
  const text = opts.text.trim();
  if (!text) {
    opts.onDone?.();
    return 'skipped';
  }

  const locale = opts.locale ?? 'es-ES';
  const key = opts.cacheKey ?? `ad-hoc+${locale}+${hashScript(text)}`;
  const existing = await getStoryAudioCacheEntry(key);
  if (existing) {
    track('story_cache_hit', { key });
  } else {
    await warmStoryAudioCache([{ key, text }]);
  }

  try {
    const available = await Speech.getAvailableVoicesAsync().catch(() => []);
    if (Platform.OS !== 'web' && available.length === 0) {
      track('story_tts_skipped', { reason: 'no_voices' });
      opts.onDone?.();
      return 'skipped';
    }

    track('story_tts_started', { chars: text.length, cached: existing ? 1 : 0 });
    await new Promise<void>((resolve) => {
      Speech.stop();
      Speech.speak(text, {
        language: locale,
        rate: 0.94,
        onDone: () => {
          track('story_tts_completed', {});
          opts.onDone?.();
          resolve();
        },
        onStopped: () => {
          opts.onDone?.();
          resolve();
        },
        onError: () => {
          track('story_tts_failed', {});
          opts.onError?.();
          opts.onDone?.();
          resolve();
        },
      });
    });
    return 'spoken';
  } catch {
    track('story_tts_failed', { reason: 'exception' });
    opts.onError?.();
    opts.onDone?.();
    return 'skipped';
  }
}

export function stopStorySpeech(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
