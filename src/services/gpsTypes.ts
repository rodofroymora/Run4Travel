import type { GpsSample } from '../types/run';

export type GpsStreamer = {
  start(onSample: (s: GpsSample) => void): void;
  pause(): void;
  resume(onSample: (s: GpsSample) => void): void;
  stop(): void;
};

export type GpsSource = 'device' | 'demo';

export type ResolvedGps = {
  source: GpsSource;
  streamer: GpsStreamer;
  /** Human-readable reason when falling back to demo. */
  fallbackReason?: string;
};
