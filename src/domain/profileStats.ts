import type { RunSession } from '../types/run';

export type ProfileStats = {
  completedRuns: number;
  totalDistanceKm: number;
  totalStories: number;
  totalPhotos: number;
  cities: number;
  lastCityName?: string;
};

export function aggregateProfileStats(sessions: RunSession[]): ProfileStats {
  const completed = sessions.filter((s) => s.status === 'completed');
  const cityIds = new Set(completed.map((s) => s.cityId).filter(Boolean));
  const totalDistanceM = completed.reduce((sum, s) => sum + (s.distanceM || 0), 0);
  const totalStories = completed.reduce((sum, s) => sum + s.storyEvents.length, 0);
  const totalPhotos = completed.reduce((sum, s) => sum + s.photos.length, 0);
  const last = completed[0];

  return {
    completedRuns: completed.length,
    totalDistanceKm: Math.round((totalDistanceM / 1000) * 10) / 10,
    totalStories,
    totalPhotos,
    cities: cityIds.size,
    lastCityName: last?.cityName,
  };
}
