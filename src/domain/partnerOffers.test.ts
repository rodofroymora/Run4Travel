import assert from 'node:assert/strict';
import { cafePlacesForCity } from '../data/cafes';
import {
  maxDiscountPct,
  offersForSelectedPlaces,
  unlockOffers,
} from './partnerOffers';
import { isRouteStyle } from './routeIntent';
import { parseAlbumCopyJson, parseStoriesJson } from '../services/llmCopy';

assert.equal(isRouteStyle('cafes'), true);

const bcnCafes = cafePlacesForCity('barcelona');
assert.ok(bcnCafes.length >= 3);
assert.ok(bcnCafes.every((p) => p.category === 'cafe'));

const offers = offersForSelectedPlaces(bcnCafes, 'barcelona', 'cafes');
assert.equal(offers.length, bcnCafes.length);
assert.ok(offers.every((o) => o.discountPct >= 10));
assert.ok(maxDiscountPct(offers) >= 15);
assert.ok(offers.every((o) => o.code.startsWith('R4T-')));

const storyPoints = bcnCafes.slice(0, 2).map((p) => ({
  id: `sp-${p.id}`,
  placeId: p.id,
  shortDescription: p.name,
  storyVersions: { quick: 'q', standard: 's', deep: 'd' },
  durationSec: { quick: 10, standard: 20, deep: 40 },
}));

const unlocked = unlockOffers({
  offers,
  storyPoints,
  heardStoryPointIds: [storyPoints[0]!.id],
  cafeRoute: true,
});
assert.equal(unlocked.length, 1);
assert.equal(unlocked[0]!.placeId, bcnCafes[0]!.id);

const allOnCafeRoute = unlockOffers({
  offers,
  storyPoints,
  heardStoryPointIds: [],
  cafeRoute: true,
});
assert.equal(allOnCafeRoute.length, offers.length);

const none = unlockOffers({
  offers,
  storyPoints,
  heardStoryPointIds: [],
  cafeRoute: false,
});
assert.equal(none.length, 0);

const stories = parseStoriesJson(
  JSON.stringify({
    stories: {
      [bcnCafes[0]!.id]: {
        quick: 'Un espresso en la acera, luz de la mañana sobre el Passatge.',
        standard:
          'Nomad huele a tueste claro. Corre por la acera y deja el código para el final.',
        deep: 'El laboratorio es ritual: molino, agua, silencio. La ciudad se cuela por la puerta.',
      },
      fake: { quick: 'nope', standard: 'still nope but longer text here maybe', deep: 'x' },
    },
  }),
  new Set(bcnCafes.map((p) => p.id)),
);
assert.ok(stories[bcnCafes[0]!.id]);
assert.equal(stories.fake, undefined);

const album = parseAlbumCopyJson(
  JSON.stringify({
    coverSubtitle: '✦ Barcelona a tu ritmo',
    finalCaption: 'Cafés y kilómetros.',
    excerpts: { [bcnCafes[0]!.id]: 'Espresso al terminar.', hack: 'no' },
  }),
  new Set(bcnCafes.map((p) => p.id)),
);
assert.ok(album);
assert.equal(album!.excerpts.hack, undefined);
assert.ok(album!.excerpts[bcnCafes[0]!.id]);

console.log('partnerOffers tests: ok');
