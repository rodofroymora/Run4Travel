import { CITIES, START_SUGGESTIONS } from '../data/cities';
import { resolveCatalogKey } from '../data/places';
import type { City, StartSuggestion } from '../types/routeIntent';
import {
  fetchDynamicPlaces,
  geocodeCity,
  startSuggestionsFromPlaces,
} from './cityGeocode';
import { suggestCitiesWithLlm } from './llmRank';

const dynamicCityCache = new Map<string, City>();

/** Mock `GET /cities?q=` + dynamic geocode hits already resolved. */
export function searchCities(query: string): City[] {
  const q = query.trim().toLowerCase();
  const staticHits = !q
    ? CITIES.filter((c) => c.supported)
    : CITIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          c.id.includes(q),
      );
  const dyn = [...dynamicCityCache.values()].filter(
    (c) =>
      !staticHits.some((s) => s.id === c.id) &&
      (!q ||
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)),
  );
  return [...staticHits, ...dyn];
}

/** Mock `GET /cities/:id` */
export function getCityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id) ?? dynamicCityCache.get(id);
}

export function rememberDynamicCity(city: City): City {
  dynamicCityCache.set(city.id, city);
  return city;
}

/** Resolve free-text city via geocoder (SPEC-014). Prefer curated catalog match. */
export async function resolveCityQuery(query: string): Promise<City | null> {
  const q = query.trim().toLowerCase();
  const local = CITIES.find(
    (c) =>
      c.supported &&
      (c.name.toLowerCase() === q ||
        c.name.toLowerCase().includes(q) ||
        c.id === q),
  );
  if (local) return local;

  const fromSearch = searchCities(query).find((c) => c.supported);
  if (fromSearch && !fromSearch.id.startsWith('dyn-')) return fromSearch;

  const geo = await geocodeCity(query);
  if (!geo) return null;

  const catalogKey = resolveCatalogKey(geo.id, geo.name);
  const curated = CITIES.find((c) => c.id === catalogKey && c.supported);
  if (curated) return curated;

  return rememberDynamicCity(geo);
}

/** ✦ city suggestions — names only; resolve with resolveCityQuery. */
export async function suggestDiscoveryCities(
  hint?: string,
): Promise<{ names: string[]; usedFallback: boolean }> {
  return suggestCitiesWithLlm(hint);
}

function curatedStartsFor(city: City): StartSuggestion[] {
  const key = resolveCatalogKey(city.id, city.name);
  return START_SUGGESTIONS[key] ?? START_SUGGESTIONS[city.id] ?? [];
}

/** Mock `GET /cities/:id/start-suggestions` */
export function getStartSuggestions(cityId: string): StartSuggestion[] {
  const key = resolveCatalogKey(cityId);
  return START_SUGGESTIONS[key] ?? START_SUGGESTIONS[cityId] ?? [];
}

export async function getStartSuggestionsAsync(
  city: City,
): Promise<StartSuggestion[]> {
  const curated = curatedStartsFor(city);
  if (curated.length) return curated;
  try {
    const places = await fetchDynamicPlaces(city, 8);
    if (places.length) {
      return [
        {
          id: `${city.id}-center`,
          label: `Centro · ${city.name}`,
          lat: city.center.lat,
          lng: city.center.lng,
          kind: 'zone',
        },
        ...startSuggestionsFromPlaces(places),
      ];
    }
  } catch {
    // fall through
  }
  return [
    {
      id: `${city.id}-center`,
      label: `Centro · ${city.name}`,
      lat: city.center.lat,
      lng: city.center.lng,
      kind: 'zone',
    },
  ];
}
