import type { Place } from '../types/discovery';
import type { City, StartSuggestion } from '../types/routeIntent';
import { haversineM } from '../domain/geo';
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
  if (t.includes('cafe') || t.includes('coffee')) return 'cafe';
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
    case 'cafe':
      return ['cafes', 'hidden_gems', 'highlights'];
    default:
      return ['highlights', 'architecture', 'scenic', 'historic'];
  }
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function placeFromCoords(
  cityId: string,
  name: string,
  lat: number,
  lng: number,
  category: string,
  relevance: number,
): Place {
  return {
    id: `${cityId}-${slugify(name)}`.slice(0, 64),
    name,
    lat,
    lng,
    category,
    relevance,
    safeForRunning: true,
    styles: stylesFor(category),
  };
}

async function fetchMapboxPois(
  city: City,
  limit: number,
  cafes?: boolean,
): Promise<Place[]> {
  const token = getMapboxToken();
  if (!token) return [];

  const queries = cafes
    ? ['cafe', 'coffee', `cafe ${city.name}`, `cafeteria ${city.name}`]
    : [
        'museum',
        'park',
        'monument',
        'cathedral',
        'church',
        'plaza',
        `zocalo ${city.name}`,
        `catedral ${city.name}`,
        `museo ${city.name}`,
        `parque ${city.name}`,
      ];

  const seen = new Set<string>();
  const places: Place[] = [];
  const maxDistM = 9000;
  const bbox = [
    city.bounds.minLng,
    city.bounds.minLat,
    city.bounds.maxLng,
    city.bounds.maxLat,
  ].join(',');

  await Promise.all(
    queries.map(async (q) => {
      const qs = new URLSearchParams({
        proximity: `${city.center.lng},${city.center.lat}`,
        bbox,
        types: 'poi',
        limit: '6',
        language: 'es',
        access_token: token,
      });
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${qs}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8_000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return;
        const data = (await res.json()) as {
          features?: {
            id?: string;
            text?: string;
            place_name?: string;
            center?: [number, number];
            properties?: { category?: string };
          }[];
        };
        for (const f of data.features ?? []) {
          if (!f.center) continue;
          const [lng, lat] = f.center;
          const dist = haversineM(city.center, { lat, lng });
          if (dist > maxDistM) continue;
          const name = (f.text ?? f.place_name?.split(',')[0] ?? '').trim();
          if (!name) continue;
          const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const catHint = `${f.properties?.category ?? ''} ${q}`.toLowerCase();
          const category = cafes
            ? 'cafe'
            : catHint.includes('park')
              ? 'park'
              : catHint.includes('museum')
                ? 'landmark'
                : 'landmark';
          places.push(placeFromCoords(city.id, name, lat, lng, category, 0.85));
        }
      } catch {
        // ignore
      }
    }),
  );

  return places.slice(0, limit);
}

async function fetchOverpassPois(city: City, limit: number, cafes?: boolean): Promise<Place[]> {
  const { lat, lng } = city.center;
  const radiusM = 4500;
  const query = cafes
    ? `
[out:json][timeout:15];
(
  node["amenity"="cafe"](around:${radiusM},${lat},${lng});
  node["amenity"="coffee_shop"](around:${radiusM},${lat},${lng});
  node["cuisine"="coffee_shop"](around:${radiusM},${lat},${lng});
);
out body ${limit};
`.trim()
    : `
[out:json][timeout:15];
(
  node["tourism"~"museum|attraction|viewpoint|gallery|artwork"](around:${radiusM},${lat},${lng});
  node["historic"~"monument|memorial|castle|ruins|church|cathedral"](around:${radiusM},${lat},${lng});
  node["amenity"="place_of_worship"](around:${radiusM},${lat},${lng});
  node["leisure"="park"](around:${radiusM},${lat},${lng});
  way["leisure"="park"](around:${radiusM},${lat},${lng});
  way["tourism"~"museum|attraction"](around:${radiusM},${lat},${lng});
);
out center ${Math.max(limit * 2, 24)};
`.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16_000);
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    const places: Place[] = [];
    const seen = new Set<string>();
    for (const el of data.elements ?? []) {
      const plat = el.lat ?? el.center?.lat;
      const plng = el.lon ?? el.center?.lon;
      const name = el.tags?.name?.trim();
      if (plat == null || plng == null || !name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const tourism = el.tags?.tourism ?? '';
      const leisure = el.tags?.leisure ?? '';
      const historic = el.tags?.historic ?? '';
      const amenity = el.tags?.amenity ?? '';
      let category = 'landmark';
      if (cafes || amenity === 'cafe' || amenity === 'coffee_shop') category = 'cafe';
      else if (leisure === 'park') category = 'park';
      else if (tourism === 'viewpoint') category = 'viewpoint';
      else if (historic || amenity === 'place_of_worship') category = 'historic';
      places.push(placeFromCoords(city.id, name, plat, plng, category, 0.8));
      if (places.length >= limit) break;
    }
    return places;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Natural-language Nominatim (tag filters like tourism=attraction return 0). */
async function fetchNominatimPois(
  city: City,
  limit: number,
  cafes?: boolean,
): Promise<Place[]> {
  const seeds = cafes
    ? [`cafe ${city.name}`, `cafetería ${city.name}`]
    : [
        `zócalo ${city.name}`,
        `catedral ${city.name}`,
        `museo ${city.name}`,
        `parque ${city.name}`,
        `plaza ${city.name}`,
        `iglesia ${city.name}`,
      ];

  const seen = new Set<string>();
  const places: Place[] = [];

  for (const q of seeds) {
    if (places.length >= limit) break;
    try {
      const items = await nominatimSearch({
        q,
        limit: '5',
        countrycodes: 'mx,es,it,fr,us,gb,pt,ar,co,cl,pe',
      });
      for (const item of items) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        // Drop far-away false positives (e.g. other cities with same name)
        const dLat = Math.abs(lat - city.center.lat);
        const dLng = Math.abs(lng - city.center.lng);
        if (dLat > 0.12 || dLng > 0.12) continue;
        const name = (item.name || item.display_name.split(',')[0] || '').trim();
        if (!name || name.length < 2) continue;
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        places.push(
          placeFromCoords(
            city.id,
            name,
            lat,
            lng,
            cafes ? 'cafe' : categoryFor(item),
            Math.min(0.95, 0.55 + (item.importance ?? 0.2)),
          ),
        );
        if (places.length >= limit) break;
      }
    } catch {
      // continue
    }
  }
  return places;
}

function dedupePlaces(places: Place[]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of places) {
    const key = `${p.name.toLowerCase()}_${p.lat.toFixed(3)}_${p.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * Real POIs near a city (Mapbox → Overpass/OSM → Nominatim NL).
 * Never invents place names — if APIs fail, caller may use synthetic last resort.
 */
export async function fetchDynamicPlaces(
  city: City,
  limit = 16,
  opts?: { cafes?: boolean },
): Promise<Place[]> {
  const cafes = Boolean(opts?.cafes);

  const fromMapbox = await fetchMapboxPois(city, limit, cafes);
  if (fromMapbox.length >= 6) {
    track('places_dynamic_fetched', {
      cityId: city.id,
      n: fromMapbox.length,
      provider: 'mapbox',
    });
    return fromMapbox.slice(0, limit);
  }

  const fromOverpass = await fetchOverpassPois(city, limit, cafes);
  let merged = dedupePlaces([...fromMapbox, ...fromOverpass]);
  if (merged.length >= 4) {
    track('places_dynamic_fetched', {
      cityId: city.id,
      n: merged.length,
      provider: 'overpass',
    });
    return merged.slice(0, limit);
  }

  const fromNominatim = await fetchNominatimPois(city, limit, cafes);
  merged = dedupePlaces([...merged, ...fromNominatim]);
  track('places_dynamic_fetched', {
    cityId: city.id,
    n: merged.length,
    provider: merged.length ? 'nominatim' : 'none',
  });
  return merged.slice(0, limit);
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
