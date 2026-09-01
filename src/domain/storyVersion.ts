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
 * Capado: podcasts largos no exigen 400 m de lead (el demo GPS se los salta).
 */
export function startBeforeArrivalM(
  versionDurationSec: number,
  paceSecPerKm: number,
  climaxRatio = 0.55,
): number {
  const pace = paceSecPerKm > 0 ? paceSecPerKm : 360;
  const speedMps = 1000 / pace;
  const leadSec = versionDurationSec * climaxRatio;
  const raw = Math.round(leadSec * speedMps);
  // Reliable window for demo + sidewalk snap: never thinner than 120 m, never > 260 m
  return Math.max(120, Math.min(260, raw || 120));
}

export function shouldTriggerStory(
  distanceToPointM: number,
  startAtDistanceM: number,
): boolean {
  const radius = Math.max(120, Math.min(startAtDistanceM, 280));
  return distanceToPointM <= radius;
}

/** Along-route trigger: runner is near the polyline vertex closest to the place. */
export function shouldTriggerAlongRoute(
  distanceAlongM: number,
  placeAlongM: number,
  windowM = 140,
): boolean {
  return Math.abs(distanceAlongM - placeAlongM) <= windowM;
}
