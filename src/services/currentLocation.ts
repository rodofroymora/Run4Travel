import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type Coords = { lat: number; lng: number };

/**
 * One-shot position for route intent.
 * Web: browser Geolocation first (expo-location often hangs).
 */
export async function getCurrentCoords(timeoutMs = 10_000): Promise<Coords | null> {
  if (Platform.OS === 'web') {
    const fromBrowser = await getBrowserCoords(timeoutMs);
    if (fromBrowser) return fromBrowser;
  }

  try {
    const last = await Location.getLastKnownPositionAsync({
      maxAge: 120_000,
      requiredAccuracy: 1000,
    });
    if (last) {
      return { lat: last.coords.latitude, lng: last.coords.longitude };
    }
  } catch {
    // continue
  }

  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (!pos) return null;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

function getBrowserCoords(timeoutMs: number): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: Math.max(2000, timeoutMs - 500),
        maximumAge: 120_000,
      },
    );
  });
}
