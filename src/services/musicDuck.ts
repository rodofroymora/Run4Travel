import { track } from './analytics';

type DuckState = 'idle' | 'ducked';

let state: DuckState = 'idle';

/** Stub Spotify / music ducking — best-effort, never blocks the run. */
export async function duckMusic(): Promise<boolean> {
  try {
    state = 'ducked';
    track('music_duck_succeeded');
    return true;
  } catch {
    track('music_duck_failed');
    return false;
  }
}

export async function resumeMusic(): Promise<void> {
  if (state === 'ducked') {
    state = 'idle';
  }
}

export function getMusicDuckState(): DuckState {
  return state;
}
