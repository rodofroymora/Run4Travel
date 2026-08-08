import assert from 'node:assert/strict';
import {
  buildPreviewMarkers,
  categoryLabelEs,
  estimateOfflinePackMb,
} from './routePreview';
import type { DiscoveryRoute, PhotoSpot, StoryPoint } from '../types/discovery';

const stories: StoryPoint[] = [
  {
    id: 'sp-a',
    placeId: 'a',
    shortDescription: 'A',
    storyVersions: { quick: '', standard: '', deep: '' },
    durationSec: { quick: 10, standard: 40, deep: 80 },
  },
  {
    id: 'sp-b',
    placeId: 'b',
    shortDescription: 'B',
    storyVersions: { quick: '', standard: '', deep: '' },
    durationSec: { quick: 10, standard: 40, deep: 80 },
  },
];

const photos: PhotoSpot[] = [
  { id: 'ps-a', placeId: 'a', lat: 41.39, lng: 2.16, tip: '', radiusM: 100 },
  { id: 'ps-b', placeId: 'b', lat: 41.4, lng: 2.17, tip: '', radiusM: 100 },
];

const resolve = (id: string) =>
  id === 'a'
    ? { lat: 41.39, lng: 2.16, name: 'Casa A' }
    : id === 'b'
      ? { lat: 41.4, lng: 2.17, name: 'Casa B' }
      : undefined;

const withPhotos = buildPreviewMarkers({
  storyPoints: stories,
  photoSpots: photos,
  resolvePlace: resolve,
  showPhotos: true,
});
assert.equal(withPhotos.length, stories.length + photos.length);
assert.equal(withPhotos.filter((m) => m.kind === 'story').length, 2);
assert.equal(withPhotos.filter((m) => m.kind === 'photo').length, 2);

const storiesOnly = buildPreviewMarkers({
  storyPoints: stories,
  photoSpots: photos,
  resolvePlace: resolve,
  showPhotos: false,
});
assert.equal(storiesOnly.length, stories.length);
assert.ok(storiesOnly.every((m) => m.kind === 'story'));

assert.equal(categoryLabelEs('architecture'), 'Arquitectura');
assert.equal(categoryLabelEs('custom'), 'custom');

const route = {
  storyPoints: stories,
  photoSpots: photos,
} as DiscoveryRoute;
const mb = estimateOfflinePackMb(route);
assert.ok(mb > 0);

console.log('routePreview tests: ok');
