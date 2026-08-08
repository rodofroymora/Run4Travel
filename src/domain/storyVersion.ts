import type { StoryPoint, StoryVersionKey } from '../types/discovery';

export type VersionSelectInput = {
  distanceToPointM: number;
  paceSecPerKm: number;
  durations: StoryPoint['durationSec'];
};

/**
 * Elige quick/standard/deep según ETA y duración del audio.
 * Ritmo alto → quick; mucho margen → deep.
 */
export function selectStoryVersion(input: VersionSelectInput): {
  version: StoryVersionKey;
  reason: string;
} {
  const pace = input.paceSecPerKm > 0 ? input.paceSecPerKm : 360;
  const speedMps = 1000 / pace;
  const etaSec = input.distanceToPointM / Math.max(speedMps, 0.5);

  if (pace < 270 || etaSec < input.durations.quick * 0.8) {
    return { version: 'quick', reason: 'high_pace_or_short_eta' };
  }
  if (etaSec >= input.durations.deep * 1.1 && pace > 330) {
    return { version: 'deep', reason: 'ample_eta' };
  }
  if (etaSec >= input.durations.standard * 0.9) {
    return { version: 'standard', reason: 'balanced_eta' };
  }
  return { version: 'quick', reason: 'tight_eta' };
}

/**
 * Distancia antes del punto para empezar el audio y alinear el climax.
 * Negativo = metros antes de llegar.
 */
export function startBeforeArrivalM(
  versionDurationSec: number,
  paceSecPerKm: number,
  climaxRatio = 0.65,
): number {
  const pace = paceSecPerKm > 0 ? paceSecPerKm : 360;
  const speedMps = 1000 / pace;
  const leadSec = versionDurationSec * climaxRatio;
  return Math.round(leadSec * speedMps);
}

export function shouldTriggerStory(
  distanceToPointM: number,
  startAtDistanceM: number,
): boolean {
  return distanceToPointM <= startAtDistanceM && distanceToPointM >= -40;
}
