import type { GpsSample } from '../types/run';
import { haversineM } from './geo';

export function distanceFromSamples(samples: GpsSample[]): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    total += haversineM(samples[i - 1], samples[i]);
  }
  return total;
}

export function computeAvgPaceSecPerKm(distanceM: number, movingTimeSec: number): number {
  if (distanceM < 1 || movingTimeSec <= 0) return 0;
  return movingTimeSec / (distanceM / 1000);
}

export function computeSplitsKm(
  samples: GpsSample[],
): { km: number; paceSec: number }[] {
  if (samples.length < 2) return [];
  const splits: { km: number; paceSec: number }[] = [];
  let acc = 0;
  let kmIndex = 1;
  let splitStartT = samples[0].t;

  for (let i = 1; i < samples.length; i++) {
    const d = haversineM(samples[i - 1], samples[i]);
    acc += d;
    while (acc >= 1000) {
      const elapsed = (samples[i].t - splitStartT) / 1000;
      splits.push({ km: kmIndex, paceSec: Math.round(elapsed) });
      acc -= 1000;
      kmIndex += 1;
      splitStartT = samples[i].t;
    }
  }
  return splits;
}

export function currentPaceSecPerKm(samples: GpsSample[], windowSec = 30): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const cutoff = last.t - windowSec * 1000;
  let i = samples.length - 2;
  while (i > 0 && samples[i].t > cutoff) i -= 1;
  const window = samples.slice(i);
  const dist = distanceFromSamples(window);
  const time = (window[window.length - 1].t - window[0].t) / 1000;
  return computeAvgPaceSecPerKm(dist, time);
}
