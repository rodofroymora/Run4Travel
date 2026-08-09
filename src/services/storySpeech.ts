import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { track } from './analytics';

export type SpeakStoryOptions = {
  text: string;
  locale?: string;
  onDone?: () => void;
  onError?: () => void;
};

/**
 * On-device TTS for story playback (offline-capable).
 * Falls back to silent "done" on platforms where speech is unavailable.
 */
export async function speakStory(opts: SpeakStoryOptions): Promise<'spoken' | 'skipped'> {
  const text = opts.text.trim();
  if (!text) {
    opts.onDone?.();
    return 'skipped';
  }

  try {
    const available = await Speech.getAvailableVoicesAsync().catch(() => []);
    // Web often supports speak even with empty voices list
    if (Platform.OS !== 'web' && available.length === 0) {
      track('story_tts_skipped', { reason: 'no_voices' });
      opts.onDone?.();
      return 'skipped';
    }

    track('story_tts_started', { chars: text.length });
    await new Promise<void>((resolve) => {
      Speech.stop();
      Speech.speak(text, {
        language: opts.locale ?? 'es-ES',
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
