import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RouteIntent } from '../types/routeIntent';
import { isDistanceKm, isRouteStyle } from '../domain/routeIntent';

const KEY = '@run4travel/last_route_intent';

function isValidIntent(value: unknown): value is RouteIntent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<RouteIntent>;
  return Boolean(
    typeof v.cityId === 'string' &&
      typeof v.cityName === 'string' &&
      v.start &&
      typeof v.start.lat === 'number' &&
      typeof v.start.lng === 'number' &&
      typeof v.distanceKm === 'number' &&
      isDistanceKm(v.distanceKm) &&
      typeof v.style === 'string' &&
      isRouteStyle(v.style) &&
      typeof v.locale === 'string' &&
      typeof v.createdAt === 'string',
  );
}

export async function saveLastRouteIntent(intent: RouteIntent): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(intent));
}

export async function loadLastRouteIntent(): Promise<RouteIntent | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidIntent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
