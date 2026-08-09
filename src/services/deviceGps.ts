import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { locationToGpsSample } from '../domain/gpsSample';
import type { GpsSample } from '../types/run';
import type { GpsStreamer } from './gpsTypes';

export { locationToGpsSample } from '../domain/gpsSample';

/**
 * Real device GPS via expo-location (foreground).
 * Does not invent path — only emits what the OS reports.
 */
export function createDeviceGpsStreamer(): GpsStreamer {
  let subscription: Location.LocationSubscription | null = null;
  let lastCallback: ((s: GpsSample) => void) | null = null;

  return {
    start(onSample) {
      if (subscription) return;
      lastCallback = onSample;
      void Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 3,
          mayShowUserSettingsDialog: true,
        },
        (loc) => {
          if (!lastCallback) return;
          lastCallback(locationToGpsSample(loc));
        },
      ).then((sub) => {
        subscription = sub;
      });
    },
    pause() {
      subscription?.remove();
      subscription = null;
    },
    resume(onSample) {
      this.start(onSample);
    },
    stop() {
      this.pause();
      lastCallback = null;
    },
  };
}

export async function canUseDeviceGps(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'web_uses_demo' };
  }
  const services = await Location.hasServicesEnabledAsync();
  if (!services) {
    return { ok: false, reason: 'location_services_off' };
  }
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.status === 'granted') {
    return { ok: true };
  }
  const asked = await Location.requestForegroundPermissionsAsync();
  if (asked.status === 'granted') {
    return { ok: true };
  }
  return { ok: false, reason: 'permission_denied' };
}
