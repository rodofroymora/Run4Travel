import type { StoryVersionKey } from './discovery';

export type GpsSample = {
  t: number;
  lat: number;
  lng: number;
  alt?: number;
  speed?: number;
  acc?: number;
};

export type RunPhoto = {
  id: string;
  runId: string;
  photoSpotId?: string;
  storyPointId?: string;
  uri: string;
  remoteUrl?: string;
  lat?: number;
  lng?: number;
  takenAt: string;
  source: 'camera' | 'library' | 'stub';
};

export type RunSession = {
  id: string;
  routeId: string;
  routeName: string;
  cityName: string;
  cityId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'active' | 'paused' | 'completed' | 'discarded';
  samples: GpsSample[];
  splitsKm: { km: number; paceSec: number; elevM?: number }[];
  distanceM: number;
  durationSec: number;
  movingTimeSec: number;
  avgPaceSecPerKm: number;
  storyEvents: { storyPointId: string; version: StoryVersionKey; at: string }[];
  photos: RunPhoto[];
  narrationAdaptations: number;
  nextStoryIndex: number;
  unlockedOfferIds?: string[];
};

export type RunSummary = {
  runId: string;
  routeName: string;
  cityName: string;
  cityId: string;
  finishedAtLocal: string;
  distanceM: number;
  durationSec: number;
  avgPaceSecPerKm: number;
  isPacePb: boolean;
  storiesListened: number;
  photoCount: number;
  splits: { km: number; paceSec: number }[];
  narrationAdaptations: number;
  albumStatus: 'pending' | 'ready' | 'failed';
  discoveryRunCompleted: boolean;
};
