import type { RunSession } from '../types/run';

export function stravaActivityName(session: RunSession): string {
  return `Run4Travel · ${session.routeName} · ${session.cityName}`;
}

export function stravaActivityDescription(session: RunSession): string {
  const n = session.storyEvents.length;
  const photos = session.photos.length;
  const stories =
    n > 0
      ? `${n} ${n === 1 ? 'lugar descubierto' : 'lugares descubiertos'}`
      : 'ruta Discovery';
  const shots = photos > 0 ? ` · ${photos} foto${photos === 1 ? '' : 's'}` : '';
  return `Discovery Run · ${stories}${shots} con Run4Travel ✦`;
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

/** Build GPX 1.1 from GPS samples for Strava upload (real track). */
export function buildRunGpx(session: RunSession): string {
  const name = stravaActivityName(session);
  const desc = stravaActivityDescription(session);
  const samples =
    session.samples.length > 0
      ? session.samples
      : [
          {
            t: Date.parse(session.startedAt) || Date.now(),
            lat: 0,
            lng: 0,
          },
        ];

  const trkpts = samples
    .map((s) => {
      const iso = new Date(s.t).toISOString();
      const elev = s.alt != null ? `<ele>${s.alt}</ele>` : '';
      return `<trkpt lat="${s.lat}" lon="${s.lng}">${elev}<time>${iso}</time></trkpt>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Run4Travel" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escapeXml(name)}</name><desc>${escapeXml(desc)}</desc></metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <type>running</type>
    <trkseg>${trkpts}</trkseg>
  </trk>
</gpx>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
