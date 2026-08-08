import type { RunSession, RunSummary } from '../types/run';

const PB_PACE_SEC = 340; // mock PB threshold ~5:40

export function buildRunSummary(
  session: RunSession,
  albumStatus: RunSummary['albumStatus'] = 'pending',
): RunSummary {
  const storiesListened = session.storyEvents.length;
  const photoCount = session.photos.length;
  const discoveryRunCompleted =
    session.status === 'completed' &&
    Boolean(session.cityId) &&
    storiesListened >= 1;

  const finished = session.finishedAt ? new Date(session.finishedAt) : new Date();
  const finishedAtLocal = finished.toLocaleString('es-ES', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    runId: session.id,
    routeName: session.routeName,
    cityName: session.cityName,
    cityId: session.cityId,
    finishedAtLocal,
    distanceM: session.distanceM,
    durationSec: session.durationSec,
    avgPaceSecPerKm: session.avgPaceSecPerKm,
    isPacePb:
      session.distanceM >= 3000 &&
      session.avgPaceSecPerKm > 0 &&
      session.avgPaceSecPerKm < PB_PACE_SEC,
    storiesListened,
    photoCount,
    splits: session.splitsKm.map((s) => ({ km: s.km, paceSec: s.paceSec })),
    narrationAdaptations: session.narrationAdaptations,
    albumStatus,
    discoveryRunCompleted,
  };
}

export function medalLabel(distanceM: number): string {
  const km = Math.round(distanceM / 1000);
  const bucket = [5, 10, 15, 21, 42].find((d) => km <= d + 1) ?? km;
  return `${bucket}K\nCOMPLETADA`;
}
