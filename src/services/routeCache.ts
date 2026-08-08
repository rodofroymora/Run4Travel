import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveryRoute } from '../types/discovery';

const KEY = '@r4t/routes';

type CacheMap = Record<string, DiscoveryRoute>;

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
  return all[cacheKey] ?? null;
}

export async function getRouteById(id: string): Promise<DiscoveryRoute | null> {
  const all = await readAll();
  return Object.values(all).find((r) => r.id === id) ?? null;
}

export async function saveRoute(route: DiscoveryRoute): Promise<void> {
  const all = await readAll();
  all[route.cacheKey] = route;
  all[`id:${route.id}`] = route;
  await writeAll(all);
}
