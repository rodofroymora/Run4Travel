import { createDeviceGpsStreamer, canUseDeviceGps } from './deviceGps';
import { createMockGpsStreamer } from './mockGps';
import type { ResolvedGps } from './gpsTypes';

export type CreateRunGpsOptions = {
  coords: [number, number][];
  /** Force demo streamer (web QA / no outdoor run). */
  forceDemo?: boolean;
  paceSecPerKm?: number;
};

/**
 * Prefer real GPS on native when permitted; otherwise mock along the polyline.
 * Geometry never comes from ✦ — only from router coords (demo) or the device.
 */
export async function createRunGpsStreamer(
  opts: CreateRunGpsOptions,
): Promise<ResolvedGps> {
  if (opts.forceDemo) {
    return {
      source: 'demo',
      streamer: createMockGpsStreamer(opts.coords, {
        paceSecPerKm: opts.paceSecPerKm ?? 330,
        tickMs: 500,
        // Slower demo so story trigger windows aren't skipped in one jump
        metersPerTick: 12,
        paceVarianceSec: 50,
      }),
      fallbackReason: 'force_demo',
    };
  }

  const gate = await canUseDeviceGps();
  if (!gate.ok) {
    return {
      source: 'demo',
      streamer: createMockGpsStreamer(opts.coords, {
        paceSecPerKm: opts.paceSecPerKm ?? 330,
        tickMs: 500,
        metersPerTick: 12,
        paceVarianceSec: 50,
      }),
      fallbackReason: gate.reason,
    };
  }

  return {
    source: 'device',
    streamer: createDeviceGpsStreamer(),
  };
}
