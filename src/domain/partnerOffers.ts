import { catalogOfferForPlace } from '../data/cafes';
import type { Place, StoryPoint } from '../types/discovery';
import type { PartnerOffer } from '../types/partner';
import type { RouteStyle } from '../types/routeIntent';

function slugCode(placeId: string): string {
  const raw = placeId.replace(/[^a-z0-9]+/gi, '').slice(-6).toUpperCase();
  return `R4T-${raw || 'CAFE'}`;
}

export function demoOfferForCafe(place: Place, cityId: string): PartnerOffer {
  return {
    id: `off-demo-${place.id}`,
    placeId: place.id,
    venueName: place.name,
    cityId,
    discountPct: 10,
    code: slugCode(place.id),
    perk: '10% demo en tu café (Run4Travel)',
    terms: 'Código de demostración. No válido en caja real hasta haber partner oficial.',
    demo: true,
  };
}

/** Attach partner (or demo) offers to café waypoints on a cafes-style route. */
export function offersForSelectedPlaces(
  places: Place[],
  cityId: string,
  style: RouteStyle,
): PartnerOffer[] {
  const cafes = places.filter((p) => p.category === 'cafe' || p.styles.includes('cafes'));
  if (style !== 'cafes' && cafes.length === 0) return [];

  const source = style === 'cafes' ? cafes : cafes;
  const offers: PartnerOffer[] = [];
  for (const p of source) {
    offers.push(catalogOfferForPlace(p.id) ?? demoOfferForCafe(p, cityId));
  }
  return offers;
}

export function maxDiscountPct(offers: PartnerOffer[]): number {
  if (!offers.length) return 0;
  return Math.max(...offers.map((o) => o.discountPct));
}

/** Unlock offers whose café had a story played (visited). Fallback: all on café routes. */
export function unlockOffers(args: {
  offers: PartnerOffer[];
  storyPoints: StoryPoint[];
  heardStoryPointIds: string[];
  cafeRoute: boolean;
}): PartnerOffer[] {
  if (!args.offers.length) return [];
  const heardPlaces = new Set(
    args.storyPoints
      .filter((sp) => args.heardStoryPointIds.includes(sp.id))
      .map((sp) => sp.placeId),
  );
  const visited = args.offers.filter((o) => heardPlaces.has(o.placeId));
  if (visited.length) return visited;
  if (args.cafeRoute) return args.offers;
  return [];
}
