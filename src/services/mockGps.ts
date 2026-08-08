import { pointAlongLine } from '../domain/geo';
import type { GpsSample } from '../types/run';

/**
 * Simula GPS a lo largo de la polyline a un ritmo constante (demo offline-first).
 */
export function createMockGpsStreamer(
  coords: [number, number][],
  opts?: { paceSecPerKm?: number; tickMs?: number; startDistanceM?: number },
) {
  const paceSecPerKm = opts?.paceSecPerKm ?? 340;
  const tickMs = opts?.tickMs ?? 1000;
  const speedMps = 1000 / paceSecPerKm;
  let distanceAlong = opts?.startDistanceM ?? 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    start(onSample: (s: GpsSample) => void) {
      if (timer) return;
      timer = setInterval(() => {
        distanceAlong += speedMps * (tickMs / 1000);
        const pt = pointAlongLine(coords, distanceAlong);
        onSample({
          t: Date.now(),
          lat: pt.lat,
          lng: pt.lng,
          speed: speedMps,
          acc: 8,
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
