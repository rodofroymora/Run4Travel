import { Platform } from 'react-native';
import { track } from './analytics';

type DuckState = 'idle' | 'ducked';

let state: DuckState = 'idle';

/**
 * Duck ambient music while a story plays via expo-av audio session.
 * Lazy-import expo-av so web boot does not depend on the native module.
 */
export async function duckMusic(): Promise<boolean> {
  try {
    if (Platform.OS !== 'web') {
      const { Audio, InterruptionModeAndroid, InterruptionModeIOS } = await import('expo-av');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
    }
    state = 'ducked';
    track('music_duck_succeeded', { platform: Platform.OS });
    return true;
  } catch {
    track('music_duck_failed', { platform: Platform.OS });
    state = 'ducked';
    return false;
  }
}

export async function resumeMusic(): Promise<void> {
  if (state !== 'ducked') return;
  try {
    if (Platform.OS !== 'web') {
      const { Audio, InterruptionModeAndroid, InterruptionModeIOS } = await import('expo-av');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
    }
  } catch {
    // ignore
  }
  state = 'idle';
  track('music_resume', { platform: Platform.OS });
}

export function getMusicDuckState(): DuckState {
  return state;
}
