import assert from 'node:assert/strict';
import {
  buildAlbumTemplate,
  editPhotoStoryCaption,
  generateAlbumWithAi,
  hiddenCount,
  hideAlbumCard,
  reorderAlbumCards,
  restoreHiddenCards,
  visibleCards,
} from './album';
import type { DiscoveryRoute } from '../types/discovery';
import type { RunSession } from '../types/run';

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
      storyVersions: {
        quick: 'quick',
        standard: 'standard story',
        deep: 'deep',
      },
      durationSec: { quick: 10, standard: 30, deep: 60 },
      photoSpotId: 'ps-bcn-batllo',
    },
  ],
  photoSpots: [
    {
      id: 'ps-bcn-batllo',
      placeId: 'bcn-batllo',
      lat: 41.3916,
      lng: 2.1649,
      tip: 'tip',
      radiusM: 100,
    },
  ],
  provider: { router: 'mock' },
  createdAt: new Date().toISOString(),
  cacheKey: 'k',
  usedFallback: false,
};

const session: RunSession = {
  id: 'run_album',
  routeId: route.id,
  routeName: route.name,
  cityName: 'Barcelona',
  cityId: 'barcelona',
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  status: 'completed',
  samples: [],
  splitsKm: [],
  distanceM: 5200,
  durationSec: 1800,
  movingTimeSec: 1700,
  avgPaceSecPerKm: 330,
  storyEvents: [
    { storyPointId: 'sp-bcn-batllo', version: 'standard', at: new Date().toISOString() },
  ],
  photos: [],
  narrationAdaptations: 1,
  nextStoryIndex: 1,
};

const template = buildAlbumTemplate(session, route);
assert.ok(template.cards.some((c) => c.type === 'cover'));
assert.ok(template.cards.some((c) => c.type === 'photo_story'));
const photo = template.cards.find((c) => c.type === 'photo_story');
assert.ok(photo && photo.type === 'photo_story');
assert.equal(photo.placeName, 'Casa Batlló');

const ai = generateAlbumWithAi(session, route);
assert.equal(ai.createdBy, 'ai');

let album = hideAlbumCard(template, photo.id);
assert.equal(hiddenCount(album), 1);
assert.equal(visibleCards(album).length, template.cards.length - 1);
album = restoreHiddenCards(album);
assert.equal(hiddenCount(album), 0);

album = reorderAlbumCards(album, 0, 1);
assert.notEqual(album.cards[0].id, template.cards[0].id);

album = editPhotoStoryCaption(album, photo.id, 'Nuevo texto ✦');
const edited = album.cards.find((c) => c.id === photo.id);
assert.ok(edited && edited.type === 'photo_story');
assert.equal(edited.storyExcerpt, 'Nuevo texto ✦');

console.log('album tests: ok');
