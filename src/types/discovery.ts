import type { RouteIntent } from './routeIntent';

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  photoUrl?: string;
  relevance: number;
  safeForRunning: boolean;
  styles: string[];
};

export type StoryVersionKey = 'quick' | 'standard' | 'deep';

export type StoryPoint = {
  id: string;
  placeId: string;
  shortDescription: string;
  storyVersions: Record<StoryVersionKey, string>;
  audio?: Partial<Record<StoryVersionKey, string>>;
  durationSec: Record<StoryVersionKey, number>;
  photoSpotId?: string;
};

export type PhotoSpot = {
  id: string;
  placeId: string;
  lat: number;
  lng: number;
  tip: string;
  radiusM: number;
};

export type DiscoveryRoute = {
  id: string;
  name: string;
  intent: RouteIntent;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  distanceM: number;
  elevGainM?: number;
  estimatedMovingTimeSec: number;
  storyPoints: StoryPoint[];
  photoSpots: PhotoSpot[];
  provider: { router: string; llm?: string };
  createdAt: string;
  cacheKey: string;
  usedFallback: boolean;
};

export type OfflinePackStatus = {
  routeId: string;
  geometry: boolean;
  storiesText: boolean;
  audio: boolean;
  mapTiles: boolean;
  ready: boolean;
  progress: number;
};
