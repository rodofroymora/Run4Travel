import assert from 'node:assert/strict';
import { parseRankJson } from '../services/llmRank';
import { buildShareSvg } from './shareFormats';
import { buildRunGpx } from './stravaActivity';
import {
  setAlbumTheme,
  setCoverFromCard,
  setPhotoCrop,
  generateAlbumWithAi,
} from './album';
import type { DiscoveryRoute } from '../types/discovery';
import type { RunSession } from '../types/run';

function main() {
  const allowed = new Set(['a', 'b', 'c']);
  const ok = parseRankJson(
    '{"placeIds":["b","a","hack"],"blurbs":{"b":"hola","x":"no"},"routeTitle":"Loop"}',
    allowed,
    3,
  );
  assert.ok(ok);
  assert.deepEqual(ok!.placeIds, ['b', 'a']);
  assert.equal(ok!.blurbs.b, 'hola');
  assert.equal(ok!.blurbs.x, undefined);
  assert.equal(ok!.routeTitle, 'Loop');
  assert.equal(parseRankJson('not json', allowed, 3), null);
  assert.equal(parseRankJson('{"placeIds":["hack"]}', allowed, 3), null);

  const svg = buildShareSvg('story_9x16', {
    cityName: 'Barcelona',
    routeName: 'Modernisme Loop',
    runId: 'run1',
  });
  assert.ok(svg.includes('width="1080"'));
  assert.ok(svg.includes('Modernisme Loop'));
  assert.ok(svg.includes('Run4Travel'));
  const overlay = buildShareSvg('route_overlay', {
    cityName: 'Barcelona',
    routeName: 'Modernisme Loop',
    runId: 'run1',
  });
  assert.ok(overlay.includes('stroke="#e2603c"'));
  assert.ok(!overlay.includes('Discovery Run'));

  const session: RunSession = {
    id: 'run_gpx',
    routeId: 'r1',
    routeName: 'Loop',
    cityName: 'Barcelona',
    cityId: 'barcelona',
    startedAt: '2026-01-01T10:00:00.000Z',
    status: 'completed',
    samples: [
      { t: 1_000, lat: 41.39, lng: 2.16 },
      { t: 2_000, lat: 41.391, lng: 2.161 },
    ],
    splitsKm: [],
    distanceM: 1000,
    durationSec: 300,
    movingTimeSec: 300,
    avgPaceSecPerKm: 300,
    storyEvents: [{ storyPointId: 'sp1', version: 'quick', at: '2026-01-01T10:01:00.000Z' }],
    photos: [],
    narrationAdaptations: 0,
    nextStoryIndex: 1,
  };
  const gpx = buildRunGpx(session);
  assert.ok(gpx.includes('<trkpt lat="41.39"'));
  assert.ok(gpx.includes('Run4Travel'));

  const route: DiscoveryRoute = {
    id: 'route_album',
    name: 'Modernisme Loop',
    intent: {
      cityId: 'barcelona',
      cityName: 'Barcelona',
      start: { lat: 41.3916, lng: 2.1649 },
      distanceKm: 10,
      style: 'architecture',
      locale: 'es-ES',
      createdAt: new Date().toISOString(),
    },
    geometry: { type: 'LineString', coordinates: [[2.16, 41.39], [2.17, 41.4]] },
    distanceM: 10000,
    estimatedMovingTimeSec: 3400,
    storyPoints: [
      {
        id: 'sp-bcn-batllo',
        placeId: 'bcn-batllo',
        shortDescription: 'Casa Batlló',
        storyVersions: { quick: 'q', standard: 'standard story', deep: 'd' },
        durationSec: { quick: 10, standard: 30, deep: 60 },
        photoSpotId: 'ps-bcn-batllo',
      },
    ],
    photoSpots: [],
    provider: { router: 'mock' },
    createdAt: new Date().toISOString(),
    cacheKey: 'k',
    usedFallback: false,
  };
  let album = generateAlbumWithAi(session, route);
  album = setAlbumTheme(album, { layout: 'mosaic', accent: '#2a9d8f' });
  assert.equal(album.theme.layout, 'mosaic');
  assert.equal(album.theme.accent, '#2a9d8f');
  const photo = album.cards.find((c) => c.type === 'photo_story');
  assert.ok(photo);
  album = setPhotoCrop(album, photo!.id, { zoom: 1.5, offsetX: 0.2, offsetY: -0.1 });
  const cropped = album.cards.find((c) => c.id === photo!.id);
  assert.ok(cropped && cropped.type === 'photo_story');
  assert.equal(cropped.crop?.zoom, 1.5);
  album = setCoverFromCard(album, photo!.id);
  const cover = album.cards.find((c) => c.type === 'cover');
  assert.ok(cover && cover.type === 'cover');
  assert.equal(cover.title, (photo as { placeName: string }).placeName);

  console.log('hardening extras ok');
}

main();
