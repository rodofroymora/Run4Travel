import type { GpsSample } from '../types/run';

/** Minimal location shape — avoids importing expo-location in pure tests. */
export type LocationLike = {
  timestamp?: number;
  coords: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy?: number | null;
    speed?: number | null;
  };
};

export function locationToGpsSample(
  loc: LocationLike,
  now = Date.now(),
): GpsSample {
  const { coords } = loc;
  return {
    t: loc.timestamp || now,
    lat: coords.latitude,
    lng: coords.longitude,
    alt: coords.altitude ?? undefined,
    speed:
      coords.speed != null && coords.speed >= 0 ? coords.speed : undefined,
    acc: coords.accuracy ?? undefined,
  };
}
