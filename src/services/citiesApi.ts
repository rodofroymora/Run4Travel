import { CITIES, START_SUGGESTIONS } from '../data/cities';
import type { City, StartSuggestion } from '../types/routeIntent';

/** Mock `GET /cities?q=` */
export function searchCities(query: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.filter((c) => c.supported);
  return CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.id.includes(q),
  );
}

/** Mock `GET /cities/:id` */
export function getCityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

/** Mock `GET /cities/:id/start-suggestions` */
export function getStartSuggestions(cityId: string): StartSuggestion[] {
  return START_SUGGESTIONS[cityId] ?? [];
}
