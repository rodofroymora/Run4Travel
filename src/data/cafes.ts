import type { Place } from '../types/discovery';
import type { PartnerOffer } from '../types/partner';

type CafeSeed = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  cityId: string;
  discountPct: number;
  perk: string;
};

const SEEDS: CafeSeed[] = [
  {
    id: 'bcn-nomad-passeig',
    name: 'Nomad Coffee Lab',
    lat: 41.3909,
    lng: 2.1772,
    cityId: 'barcelona',
    discountPct: 15,
    perk: '15% en espresso y filter',
  },
  {
    id: 'bcn-satan',
    name: "Satan's Coffee Lab",
    lat: 41.3826,
    lng: 2.1814,
    cityId: 'barcelona',
    discountPct: 10,
    perk: '10% en café de especialidad',
  },
  {
    id: 'bcn-federal-parlament',
    name: 'Federal Café Parlament',
    lat: 41.3768,
    lng: 2.1624,
    cityId: 'barcelona',
    discountPct: 12,
    perk: '12% en brunch si llegas a pie',
  },
  {
    id: 'bcn-syra-gracia',
    name: 'Syra Coffee Gràcia',
    lat: 41.4031,
    lng: 2.1574,
    cityId: 'barcelona',
    discountPct: 10,
    perk: '10% en tostados de temporada',
  },
  {
    id: 'cdmx-quintal',
    name: 'Quintal Roma',
    lat: 19.4194,
    lng: -99.1608,
    cityId: 'cdmx',
    discountPct: 15,
    perk: '15% en café de finca',
  },
  {
    id: 'cdmx-cardinal',
    name: 'Cardinal',
    lat: 19.4206,
    lng: -99.1589,
    cityId: 'cdmx',
    discountPct: 10,
    perk: '10% en pour-over',
  },
  {
    id: 'cdmx-avellaneda',
    name: 'Café Avellaneda',
    lat: 19.3551,
    lng: -99.1629,
    cityId: 'cdmx',
    discountPct: 12,
    perk: '12% en espresso',
  },
];

function toPlace(s: CafeSeed): Place {
  return {
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    category: 'cafe',
    relevance: 0.84,
    safeForRunning: true,
    styles: ['cafes', 'hidden_gems', 'highlights'],
  };
}

export function cafePlacesForCity(cityId: string): Place[] {
  return SEEDS.filter((s) => s.cityId === cityId).map(toPlace);
}

function codeFor(seed: CafeSeed): string {
  const slug = seed.id.split('-').slice(-1)[0]!.slice(0, 8).toUpperCase();
  return `R4T-${slug}`;
}

export function catalogOfferForPlace(placeId: string): PartnerOffer | undefined {
  const seed = SEEDS.find((s) => s.id === placeId);
  if (!seed) return undefined;
  return {
    id: `off-${seed.id}`,
    placeId: seed.id,
    venueName: seed.name,
    cityId: seed.cityId,
    discountPct: seed.discountPct,
    code: codeFor(seed),
    perk: seed.perk,
    terms: 'Muestra el código al pedir. Un uso por Discovery Run. No acumulable.',
    demo: true,
  };
}
