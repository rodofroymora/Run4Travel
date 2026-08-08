import { lineDistanceM, pointAlongLine } from '../domain/geo';
import type { GpsSample } from '../types/run';

export type MockGpsOptions = {
  /** Baseline pace used for sample timestamps (realistic metrics). */
  paceSecPerKm?: number;
  tickMs?: number;
  startDistanceM?: number;
  /**
   * Wall-clock distance advanced per tick (demo acceleration).
   * Default ~18m @ 500ms ≈ finish a 5K in ~2–3 min wall time while
   * timestamps still reflect `paceSecPerKm` (+ variation).
   */
  metersPerTick?: number;
  /** Pace oscillation amplitude in sec/km for varied splits. */
  paceVarianceSec?: number;
};

/**
 * Simula GPS a lo largo de la polyline (demo offline-first).
 * Distancia en pared avanza rápido; timestamps reflejan ritmo realista → splits creíbles.
 */
export function createMockGpsStreamer(
  coords: [number, number][],
  opts?: MockGpsOptions,
) {
  const basePace = opts?.paceSecPerKm ?? 340;
  const tickMs = opts?.tickMs ?? 500;
  const metersPerTick = opts?.metersPerTick ?? 18;
  const paceVariance = opts?.paceVarianceSec ?? 45;
  const totalM = lineDistanceM(coords);

  let distanceAlong = opts?.startDistanceM ?? 0;
  let simElapsedMs = 0;
  const startedAt = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;
  let tick = 0;

  function paceAt(distanceM: number): number {
    // Gentle wave + slight fade so chart has Green→Yellow→Terracotta variety
    const phase = (distanceM / 1000) * Math.PI;
    const wave = Math.sin(phase) * paceVariance;
    const drift = (distanceM / Math.max(totalM, 1)) * 25;
    return Math.max(250, basePace + wave + drift);
  }

  return {
    start(onSample: (s: GpsSample) => void) {
      if (timer) return;
      timer = setInterval(() => {
        const pace = paceAt(distanceAlong);
        distanceAlong += metersPerTick;
        const distKm = metersPerTick / 1000;
        simElapsedMs += distKm * pace * 1000;
        tick += 1;

        const pt = pointAlongLine(coords, Math.min(distanceAlong, totalM));
        const speedMps = 1000 / pace;
        onSample({
          t: startedAt + simElapsedMs,
          lat: pt.lat,
          lng: pt.lng,
          speed: speedMps,
          acc: 6 + (tick % 5),
          alt: 20 + Math.sin(distanceAlong / 400) * 12,
        });
      }, tickMs);
    },
    pause() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    resume(onSample: (s: GpsSample) => void) {
      this.start(onSample);
    },
    stop() {
      this.pause();
    },
    getDistanceAlong() {
      return distanceAlong;
    },
  };
}
