export type PhotoSafetyInput = {
  distanceToSpotM: number;
  speedMps: number;
  accuracyM?: number;
  nearCrossing?: boolean;
  alreadyPrompted?: boolean;
};

export type PhotoSafetyDecision =
  | { action: 'show'; reason: string }
  | { action: 'defer'; reason: string }
  | { action: 'silence'; reason: string };

const APPROACH_M = 150;
const MAX_SAFE_SPEED_MPS = 4.2; // ~4:00 /km borderline
const MAX_ACC_M = 35;

export function evaluatePhotoSafety(input: PhotoSafetyInput): PhotoSafetyDecision {
  if (input.alreadyPrompted) {
    return { action: 'silence', reason: 'already_prompted' };
  }
  if (input.distanceToSpotM > APPROACH_M) {
    return { action: 'silence', reason: 'too_far' };
  }
  if (input.nearCrossing) {
    return { action: 'defer', reason: 'crossing' };
  }
  if (input.speedMps > MAX_SAFE_SPEED_MPS) {
    return { action: 'defer', reason: 'high_speed' };
  }
  if (input.accuracyM != null && input.accuracyM > MAX_ACC_M) {
    return { action: 'defer', reason: 'poor_accuracy' };
  }
  return { action: 'show', reason: 'safe_approach' };
}
