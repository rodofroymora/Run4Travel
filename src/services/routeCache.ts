import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveryRoute } from '../types/discovery';

const KEY = '@r4t/routes';
/** SPEC-002: reusar ~7 días si start cercano (misma cache key). */
export const ROUTE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEntry = {
  route: DiscoveryRoute;
  savedAt: string;
};

type CacheMap = Record<string, CacheEntry | DiscoveryRoute>;

function isEntry(v: CacheEntry | DiscoveryRoute): v is CacheEntry {
  return Boolean(v && typeof v === 'object' && 'route' in v && 'savedAt' in v);
}

function unwrap(v: CacheEntry | DiscoveryRoute | undefined): DiscoveryRoute | null {
  if (!v) return null;
  return isEntry(v) ? v.route : v;
}

function savedAtOf(v: CacheEntry | DiscoveryRoute | undefined): number {
  if (!v) return 0;
  if (isEntry(v)) return Date.parse(v.savedAt) || 0;
  return Date.parse(v.createdAt) || 0;
}

function isFresh(v: CacheEntry | DiscoveryRoute | undefined, now = Date.now()): boolean {
  const t = savedAtOf(v);
  if (!t) return false;
  return now - t <= ROUTE_CACHE_TTL_MS;
}

async function readAll(): Promise<CacheMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheMap;
  } catch {
    return {};
  }
}

async function writeAll(map: CacheMap): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function getCachedRoute(cacheKey: string): Promise<DiscoveryRoute | null> {
  const all = await readAll();
  const entry = all[cacheKey];
  if (!isFresh(entry)) return null;
  return unwrap(entry);
}

export async function getRouteById(id: string): Promise<DiscoveryRoute | null> {
  const all = await readAll();
  const byId = all[`id:${id}`];
  if (isFresh(byId)) return unwrap(byId);
  for (const v of Object.values(all)) {
    const route = unwrap(v);
    if (route?.id === id && isFresh(v)) return route;
  }
  return null;
}

export async function saveRoute(route: DiscoveryRoute): Promise<void> {
  const all = await readAll();
  const entry: CacheEntry = { route, savedAt: new Date().toISOString() };
  all[route.cacheKey] = entry;
  all[`id:${route.id}`] = entry;
  await writeAll(all);
}

export async function clearExpiredRoutes(now = Date.now()): Promise<number> {
  const all = await readAll();
  let removed = 0;
  for (const key of Object.keys(all)) {
    if (!isFresh(all[key], now)) {
      delete all[key];
      removed += 1;
    }
  }
  if (removed) await writeAll(all);
  return removed;
}
