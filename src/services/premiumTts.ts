import { Platform } from 'react-native';
import { getLlmApiKey, getLlmBaseUrl } from './llmRank';
import { track } from './analytics';

export type PremiumSpeakResult = 'premium' | 'fallback' | 'failed';

type ActivePlayback = {
  stop: () => void;
};

let active: ActivePlayback | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa available on web; on RN use global
  if (typeof btoa === 'function') return btoa(binary);
  // Minimal polyfill for Hermes
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = binary.charCodeAt(i + 1);
    const c = binary.charCodeAt(i + 2);
    const n =
      (a << 16) |
      ((Number.isFinite(b) ? b : 0) << 8) |
      (Number.isFinite(c) ? c : 0);
    out +=
      chars[(n >> 18) & 63] +
      chars[(n >> 12) & 63] +
      (Number.isFinite(b) ? chars[(n >> 6) & 63] : '=') +
      (Number.isFinite(c) ? chars[n & 63] : '=');
  }
  return out;
}

/** OpenAI-compatible TTS when LLM key is present; else null. */
export async function fetchPremiumTtsMp3(text: string): Promise<ArrayBuffer | null> {
  const key = getLlmApiKey();
  if (!key) return null;
  const base = getLlmBaseUrl().replace(/\/$/, '');
  const voice = process.env.EXPO_PUBLIC_TTS_VOICE?.trim() || 'nova';
  const model = process.env.EXPO_PUBLIC_TTS_MODEL?.trim() || 'tts-1';
  try {
    const res = await fetch(`${base}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: text.slice(0, 4096),
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      track('premium_tts_failed', { status: res.status });
      return null;
    }
    return await res.arrayBuffer();
  } catch (e) {
    track('premium_tts_failed', {
      error: e instanceof Error ? e.message : 'error',
    });
    return null;
  }
}

export function stopPremiumPlayback(): void {
  try {
    active?.stop();
  } catch {
    // ignore
  }
  active = null;
}

/**
 * Play premium TTS (OpenAI) when available.
 * Web: HTMLAudioElement. Native: expo-av + cache file.
 */
export async function playPremiumTts(
  text: string,
  opts?: { onDone?: () => void; onError?: () => void },
): Promise<PremiumSpeakResult> {
  stopPremiumPlayback();
  const buf = await fetchPremiumTtsMp3(text);
  if (!buf) return 'fallback';

  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([buf], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const el = new globalThis.Audio(url);
      active = {
        stop: () => {
          el.pause();
          el.src = '';
          URL.revokeObjectURL(url);
        },
      };
      await new Promise<void>((resolve, reject) => {
        el.onended = () => {
          URL.revokeObjectURL(url);
          active = null;
          opts?.onDone?.();
          resolve();
        };
        el.onerror = () => {
          URL.revokeObjectURL(url);
          active = null;
          reject(new Error('audio error'));
        };
        void el.play().catch(reject);
      });
      track('premium_tts_played', { platform: 'web', chars: text.length });
      return 'premium';
    }

    const FileSystem = await import('expo-file-system/legacy');
    const av = await import('expo-av');
    const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!base) return 'fallback';
    const path = `${base}r4t-tts-${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(path, arrayBufferToBase64(buf), {
      encoding: FileSystem.EncodingType.Base64,
    });
    await av.Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    const { sound } = await av.Audio.Sound.createAsync({ uri: path }, { shouldPlay: true });
    active = {
      stop: () => {
        void sound.stopAsync();
        void sound.unloadAsync();
      },
    };
    await new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          void sound.unloadAsync();
          active = null;
          opts?.onDone?.();
          resolve();
        }
      });
    });
    track('premium_tts_played', { platform: Platform.OS, chars: text.length });
    return 'premium';
  } catch (e) {
    track('premium_tts_failed', {
      error: e instanceof Error ? e.message : 'play_error',
    });
    opts?.onError?.();
    return 'failed';
  }
}
