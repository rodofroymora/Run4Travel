import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { SHARE_ASPECT, buildShareSvg, suggestedCaption } from '../domain/shareFormats';
import type { ShareAsset, ShareFormat } from '../types/share';
import { track } from './analytics';

export { buildShareSvg } from '../domain/shareFormats';

export type ExportProgress =
  | { phase: 'compose'; message: string; progress: number }
  | { phase: 'render'; message: string; progress: number }
  | { phase: 'watermark'; message: string; progress: number }
  | { phase: 'done'; message: string; progress: number; asset: ShareAsset }
  | { phase: 'error'; message: string };

export function buildShareAsset(
  format: ShareFormat,
  meta: { cityName: string; routeName: string; runId: string },
  uri?: string,
): ShareAsset {
  const spec = SHARE_ASPECT[format];
  track('share_format_selected', { format });
  return {
    format,
    uri: uri ?? `pending://share/${meta.runId}/${format}.svg`,
    width: spec.width,
    height: spec.height,
    transparent: spec.transparent,
    caption: suggestedCaption(meta.cityName, meta.routeName),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function writeShareFile(
  format: ShareFormat,
  meta: { cityName: string; routeName: string; runId: string },
): Promise<string> {
  const svg = buildShareSvg(format, meta);
  const fileName = `r4t-${meta.runId}-${format}.svg`;

  if (Platform.OS === 'web') {
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }

  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) throw new Error('No file system directory');
  const uri = `${base}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, svg, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return uri;
}

export async function exportShareAsset(
  format: ShareFormat,
  meta: { cityName: string; routeName: string; runId: string },
  onProgress?: (p: ExportProgress) => void,
): Promise<ShareAsset> {
  try {
    onProgress?.({ phase: 'compose', message: 'Componiendo layout…', progress: 0.2 });
    await sleep(120);
    onProgress?.({ phase: 'render', message: 'Renderizando SVG…', progress: 0.55 });
    const uri = await writeShareFile(format, meta);
    onProgress?.({
      phase: 'watermark',
      message: 'Añadiendo watermark Run4Travel…',
      progress: 0.85,
    });
    await sleep(80);
    const asset = buildShareAsset(format, meta, uri);
    onProgress?.({ phase: 'done', message: 'Listo para compartir', progress: 1, asset });
    return asset;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al exportar';
    onProgress?.({ phase: 'error', message });
    track('share_failed', { format, error: message });
    throw e;
  }
}

function downloadDataUriWeb(uri: string, fileName: string): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = uri;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function shareOrSaveAsset(
  asset: ShareAsset,
  mode: 'share' | 'save',
): Promise<'ok' | 'failed'> {
  try {
    const fileName = `run4travel-${asset.format}.svg`;

    if (Platform.OS === 'web') {
      if (mode === 'save') {
        downloadDataUriWeb(asset.uri, fileName);
        track('share_saved_gallery', { format: asset.format, platform: 'web' });
        return 'ok';
      }
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'Run4Travel',
            text: asset.caption ?? '✦ Discovery Run',
            url: asset.uri.startsWith('data:') ? undefined : asset.uri,
          });
          track('share_completed', { format: asset.format, platform: 'web' });
          return 'ok';
        } catch {
          // fall through
        }
      }
      await Share.share({
        message: `${asset.caption ?? ''}\n${asset.uri.startsWith('data:') ? '' : asset.uri}`.trim(),
        title: 'Run4Travel',
      });
      track('share_completed', { format: asset.format, platform: 'web-share' });
      return 'ok';
    }

    if (mode === 'save') {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        track('share_failed', { format: asset.format, error: 'media_permission' });
        return 'failed';
      }
      await MediaLibrary.saveToLibraryAsync(asset.uri);
      track('share_saved_gallery', { format: asset.format });
      return 'ok';
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(asset.uri, {
        mimeType: 'image/svg+xml',
        dialogTitle: 'Compartir Discovery Run',
        UTI: 'public.svg-image',
      });
    } else {
      await Share.share({
        url: asset.uri,
        message: asset.caption,
        title: 'Run4Travel',
      });
    }
    track('share_completed', { format: asset.format });
    return 'ok';
  } catch (e) {
    track('share_failed', {
      format: asset.format,
      error: e instanceof Error ? e.message : 'error',
    });
    return 'failed';
  }
}

/** @deprecated use shareOrSaveAsset */
export const shareOrSaveStub = shareOrSaveAsset;
