import type { RunSession } from '../types/run';

export function stravaActivityName(session: RunSession): string {
  return `Run4Travel · ${session.routeName} · ${session.cityName}`;
}

export function stravaActivityDescription(session: RunSession): string {
  const n = session.storyEvents.length;
  return n > 0
    ? `Discovery Run · ${n} ${n === 1 ? 'lugar descubierto' : 'lugares descubiertos'} con Run4Travel ✦`
    : 'Discovery Run con Run4Travel ✦';
}

export function buildStravaActivityPayload(session: RunSession): {
  name: string;
  type: string;
  sport_type: string;
  start_date_local: string;
  elapsed_time: number;
  description: string;
  distance: number;
} {
  const start = session.startedAt.includes('T')
    ? session.startedAt.replace(/\.\d{3}Z$/, '').replace(/Z$/, '')
    : session.startedAt;
  return {
    name: stravaActivityName(session),
    type: 'Run',
    sport_type: 'Run',
    start_date_local: start.slice(0, 19),
    elapsed_time: Math.max(1, session.movingTimeSec || session.durationSec || 1),
    description: stravaActivityDescription(session),
    distance: Math.round(session.distanceM),
  };
}
