import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { track } from './analytics';
import { playPremiumTts, stopPremiumPlayback, unlockSpeechAudio } from './premiumTts';

export type SpeakStoryOptions = {
  text: string;
  locale?: string;
  cacheKey?: string;
  /** Prefer OpenAI TTS when key present (podcast quality). */
  preferPremium?: boolean;
  onDone?: () => void;
  onError?: () => void;
};

export type AudioCacheEntry = {
  key: string;
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
  return Math.max(20, Math.round(text.length / 13));
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

async function speakDeviceTts(opts: SpeakStoryOptions): Promise<'spoken' | 'skipped'> {
  const text = opts.text.trim();
  const locale = opts.locale ?? 'es-ES';
  try {
    const available = await Speech.getAvailableVoicesAsync().catch(() => []);
    if (Platform.OS !== 'web' && available.length === 0) {
      track('story_tts_skipped', { reason: 'no_voices' });
      opts.onDone?.();
      return 'skipped';
    }
    track('story_tts_started', { chars: text.length, engine: 'device' });
    await new Promise<void>((resolve) => {
      Speech.stop();
      Speech.speak(text, {
        language: locale,
        rate: Platform.OS === 'ios' ? 0.92 : 0.88,
        pitch: 1.0,
        onDone: () => {
          track('story_tts_completed', { engine: 'device' });
          opts.onDone?.();
          resolve();
        },
        onStopped: () => {
          opts.onDone?.();
          resolve();
        },
        onError: () => {
          track('story_tts_failed', { engine: 'device' });
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

/**
 * Podcast playback: premium OpenAI TTS when possible, else device speech.
 */
export async function speakStory(opts: SpeakStoryOptions): Promise<'spoken' | 'skipped'> {
  const text = opts.text.trim();
  if (!text) {
    opts.onDone?.();
    return 'skipped';
  }

  unlockSpeechAudio();

  const locale = opts.locale ?? 'es-ES';
  const key = opts.cacheKey ?? `ad-hoc+${locale}+${hashScript(text)}`;
  const existing = await getStoryAudioCacheEntry(key);
  if (existing) track('story_cache_hit', { key });
  else await warmStoryAudioCache([{ key, text }]);

  const preferPremium = opts.preferPremium !== false;
  if (preferPremium) {
    const result = await playPremiumTts(text, {
      onDone: opts.onDone,
      onError: opts.onError,
    });
    if (result === 'premium') {
      track('story_tts_started', { chars: text.length, engine: 'premium' });
      track('story_tts_completed', { engine: 'premium' });
      return 'spoken';
    }
  }

  return speakDeviceTts(opts);
}

export function stopStorySpeech(): void {
  stopPremiumPlayback();
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}

export { unlockSpeechAudio };
