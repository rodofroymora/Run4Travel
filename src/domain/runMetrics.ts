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

export type KmSplit = { km: number; paceSec: number; elevM?: number };

/**
 * Full-kilometer splits from GPS samples.
 * Pace is elapsed moving time for that km (based on sample timestamps).
 */
export function computeSplitsKm(samples: GpsSample[]): KmSplit[] {
  if (samples.length < 2) return [];
  const splits: KmSplit[] = [];
  let acc = 0;
  let kmIndex = 1;
  let splitStartT = samples[0].t;

  for (let i = 1; i < samples.length; i++) {
    const d = haversineM(samples[i - 1], samples[i]);
    acc += d;
    while (acc >= 1000) {
      const elapsed = (samples[i].t - splitStartT) / 1000;
      splits.push({
        km: kmIndex,
        paceSec: Math.max(1, Math.round(elapsed)),
      });
      acc -= 1000;
      kmIndex += 1;
      splitStartT = samples[i].t;
    }
  }
  return splits;
}

/** In-progress partial km (0–1 progress + projected pace). */
export function computePartialSplit(
  samples: GpsSample[],
): { km: number; progress: number; paceSec: number } | null {
  if (samples.length < 2) return null;
  const full = computeSplitsKm(samples);
  const totalDist = distanceFromSamples(samples);
  const completedM = full.length * 1000;
  const partialM = totalDist - completedM;
  if (partialM < 40) return null;

  let covered = 0;
  let splitStartT = samples[0].t;
  let kmIndex = 1;
  for (let i = 1; i < samples.length; i++) {
    covered += haversineM(samples[i - 1], samples[i]);
    while (covered >= 1000) {
      covered -= 1000;
      kmIndex += 1;
      splitStartT = samples[i].t;
    }
  }
  const elapsed = (samples[samples.length - 1].t - splitStartT) / 1000;
  const projected = elapsed / (partialM / 1000);
  return {
    km: kmIndex,
    progress: Math.min(0.99, partialM / 1000),
    paceSec: Math.max(1, Math.round(projected)),
  };
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

/** Pace band for Batlló chart colors (UI maps band → color). */
export type PaceBand = 'fast' | 'steady' | 'easy';

export function paceBand(paceSec: number): PaceBand {
  if (paceSec < 320) return 'fast';
  if (paceSec < 360) return 'steady';
  return 'easy';
}

export function paceToBarHeight(paceSec: number, maxH = 64): number {
  const clamped = Math.min(420, Math.max(240, paceSec));
  return Math.min(maxH, Math.max(16, maxH - (clamped - 240) / 3.5));
}

export type ChartBar = {
  h: number;
  band: PaceBand;
  label?: string;
  paceSec?: number;
  partial?: boolean;
};

/** Build chart bars from completed (+ optional partial) splits. */
export function splitsToChartBars(
  splits: { km: number; paceSec: number }[],
  opts?: { partial?: { km: number; progress: number; paceSec: number } | null; maxBars?: number },
): ChartBar[] {
  const maxBars = opts?.maxBars ?? 12;
  const bars: ChartBar[] = splits.slice(0, maxBars).map((s) => ({
    h: paceToBarHeight(s.paceSec),
    band: paceBand(s.paceSec),
    label: `${s.km}`,
    paceSec: s.paceSec,
  }));

  const partial = opts?.partial;
  if (partial && bars.length < maxBars) {
    bars.push({
      h: Math.max(12, paceToBarHeight(partial.paceSec) * partial.progress),
      band: paceBand(partial.paceSec),
      label: `${partial.km}`,
      paceSec: partial.paceSec,
      partial: true,
    });
  }
  return bars;
}
