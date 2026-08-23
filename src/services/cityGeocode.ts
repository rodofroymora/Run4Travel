import type { Place } from '../types/discovery';
import type { City, StartSuggestion } from '../types/routeIntent';
import { getMapboxToken } from './routing';
import { track } from './analytics';

const NOMINATIM_UA = 'Run4Travel/1.0 (discovery-run; https://github.com/rodofroymora/Run4Travel)';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

type NominatimItem = {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  importance?: number;
  boundingbox?: [string, string, string, string];
  name?: string;
};

async function nominatimSearch(params: Record<string, string>): Promise<NominatimItem[]> {
  const qs = new URLSearchParams({ format: 'json', ...params });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
    headers: { 'User-Agent': NOMINATIM_UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  return (await res.json()) as NominatimItem[];
}

function boundsFromBox(
  box: [string, string, string, string] | undefined,
  lat: number,
  lng: number,
): City['bounds'] {
  if (box && box.length === 4) {
    const south = parseFloat(box[0]);
    const north = parseFloat(box[1]);
    const west = parseFloat(box[2]);
    const east = parseFloat(box[3]);
    if ([south, north, west, east].every((n) => Number.isFinite(n))) {
      return { minLat: south, maxLat: north, minLng: west, maxLng: east };
    }
  }
  const d = 0.08;
  return { minLat: lat - d, maxLat: lat + d, minLng: lng - d, maxLng: lng + d };
}

/** Resolve any city name to a runnable City (geocoder). */
export async function geocodeCity(query: string): Promise<City | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  try {
    const token = getMapboxToken();
    if (token) {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?types=place&limit=1&access_token=${token}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          features?: {
            id: string;
            text: string;
            place_name: string;
            center: [number, number];
            bbox?: [number, number, number, number];
            context?: { id: string; text: string }[];
          }[];
        };
        const f = data.features?.[0];
        if (f) {
          const [lng, lat] = f.center;
          const country =
            f.context?.find((c) => c.id.startsWith('country'))?.text ?? '';
          const bounds = f.bbox
            ? {
                minLng: f.bbox[0],
                minLat: f.bbox[1],
                maxLng: f.bbox[2],
                maxLat: f.bbox[3],
              }
            : boundsFromBox(undefined, lat, lng);
          track('city_geocoded', { provider: 'mapbox', q });
          return {
            id: `dyn-${slugify(f.text)}`,
            name: f.text,
            country,
            center: { lat, lng },
            bounds,
            supported: true,
            locales: ['es-ES', 'en-US'],
          };
        }
      }
    }

    const items = await nominatimSearch({
      q,
      limit: '1',
      addressdetails: '1',
    });
    const hit = items[0];
    if (!hit) return null;
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const name = hit.name || hit.display_name.split(',')[0]!.trim();
    const country = hit.display_name.split(',').slice(-1)[0]?.trim() ?? '';
    track('city_geocoded', { provider: 'nominatim', q });
    return {
      id: `dyn-${slugify(name)}`,
      name,
      country,
      center: { lat, lng },
      bounds: boundsFromBox(hit.boundingbox, lat, lng),
      supported: true,
      locales: ['es-ES', 'en-US'],
    };
  } catch (e) {
    track('city_geocode_failed', {
      q,
      error: e instanceof Error ? e.message : 'error',
    });
    return null;
  }
}

function categoryFor(item: NominatimItem): string {
  const t = `${item.class ?? ''}:${item.type ?? ''}`;
  if (t.includes('park') || t.includes('garden')) return 'park';
  if (t.includes('museum') || t.includes('attraction')) return 'landmark';
  if (t.includes('place_of_worship') || t.includes('cathedral')) return 'historic';
  if (t.includes('water') || t.includes('beach') || t.includes('harbour')) return 'waterfront';
  return 'landmark';
}

function stylesFor(category: string): string[] {
  switch (category) {
    case 'park':
      return ['parks', 'scenic', 'highlights'];
    case 'waterfront':
      return ['waterfront', 'scenic', 'highlights'];
    case 'historic':
      return ['historic', 'architecture', 'highlights'];
    default:
      return ['highlights', 'architecture', 'scenic', 'historic'];
  }
}

/** Fetch real POIs near a city center (Nominatim). Coords always from geocoder. */
export async function fetchDynamicPlaces(
  city: City,
  limit = 16,
): Promise<Place[]> {
  const viewbox = [
    city.bounds.minLng,
    city.bounds.maxLat,
    city.bounds.maxLng,
    city.bounds.minLat,
  ].join(',');

  const queries = [
    'tourism=attraction',
    'tourism=museum',
    'leisure=park',
    'historic=monument',
  ];

  const seen = new Set<string>();
  const places: Place[] = [];

  for (const q of queries) {
    if (places.length >= limit) break;
    try {
      const items = await nominatimSearch({
        q: `${q} ${city.name}`,
        limit: '8',
        viewbox,
        bounded: '1',
      });
      for (const item of items) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const name = (item.name || item.display_name.split(',')[0] || '').trim();
        if (!name || name.length < 2) continue;
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const category = categoryFor(item);
        const id = `${city.id}-${slugify(name)}`.slice(0, 64);
        places.push({
          id,
          name,
          lat,
          lng,
          category,
          relevance: Math.min(0.95, 0.55 + (item.importance ?? 0.2)),
          safeForRunning: true,
          styles: stylesFor(category),
        });
        if (places.length >= limit) break;
      }
    } catch {
      // continue other queries
    }
  }

  track('places_dynamic_fetched', { cityId: city.id, n: places.length });
  return places;
}

export function startSuggestionsFromPlaces(places: Place[]): StartSuggestion[] {
  return places.slice(0, 5).map((p, i) => ({
    id: p.id,
    label: p.name,
    lat: p.lat,
    lng: p.lng,
    kind: i === 0 ? 'landmark' : i === 1 ? 'plaza' : 'landmark',
  }));
}
