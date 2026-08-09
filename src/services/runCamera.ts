import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { track } from './analytics';

export type CaptureResult =
  | { ok: true; uri: string; source: 'camera' | 'library' }
  | { ok: false; reason: string };

/**
 * Capture a run photo via camera, falling back to library if camera unavailable.
 */
export async function captureRunPhoto(): Promise<CaptureResult> {
  if (Platform.OS === 'web') {
    // Web: prefer library / file picker (camera support varies)
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (lib.status !== 'granted') {
      track('photo_capture_failed', { reason: 'library_permission' });
      return { ok: false, reason: 'library_permission' };
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      exif: false,
    });
    if (picked.canceled || !picked.assets[0]?.uri) {
      return { ok: false, reason: 'cancelled' };
    }
    track('photo_capture_succeeded', { source: 'library' });
    return { ok: true, uri: picked.assets[0].uri, source: 'library' };
  }

  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (cam.status === 'granted') {
    const shot = await ImagePicker.launchCameraAsync({
      quality: 0.75,
      exif: false,
    });
    if (!shot.canceled && shot.assets[0]?.uri) {
      track('photo_capture_succeeded', { source: 'camera' });
      return { ok: true, uri: shot.assets[0].uri, source: 'camera' };
    }
    if (shot.canceled) {
      return { ok: false, reason: 'cancelled' };
    }
  }

  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (lib.status !== 'granted') {
    track('photo_capture_failed', { reason: 'permission' });
    return { ok: false, reason: 'permission' };
  }
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.75,
    exif: false,
  });
  if (picked.canceled || !picked.assets[0]?.uri) {
    return { ok: false, reason: 'cancelled' };
  }
  track('photo_capture_succeeded', { source: 'library' });
  return { ok: true, uri: picked.assets[0].uri, source: 'library' };
}
