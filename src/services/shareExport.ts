import { SHARE_ASPECT, suggestedCaption } from '../domain/shareFormats';
import type { ShareAsset, ShareFormat } from '../types/share';
import { track } from './analytics';

export type ExportProgress =
  | { phase: 'compose'; message: string; progress: number }
  | { phase: 'render'; message: string; progress: number }
  | { phase: 'watermark'; message: string; progress: number }
  | { phase: 'done'; message: string; progress: number; asset: ShareAsset }
  | { phase: 'error'; message: string };

/** Stub de export: genera un descriptor de asset (sin render nativo pesado). */
export function buildShareAsset(
  format: ShareFormat,
  meta: { cityName: string; routeName: string; runId: string },
): ShareAsset {
  const spec = SHARE_ASPECT[format];
  track('share_format_selected', { format });
  return {
    format,
    uri: `stub://share/${meta.runId}/${format}.png`,
    width: spec.width,
    height: spec.height,
    transparent: spec.transparent,
    caption: suggestedCaption(meta.cityName, meta.routeName),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Simula pipeline de export (compose → render → watermark).
 * TODO: sustituir por captura de vista / Skia cuando haya assets reales.
 */
export async function exportShareAsset(
  format: ShareFormat,
  meta: { cityName: string; routeName: string; runId: string },
  onProgress?: (p: ExportProgress) => void,
): Promise<ShareAsset> {
  onProgress?.({ phase: 'compose', message: 'Componiendo layout…', progress: 0.2 });
  await sleep(220);
  onProgress?.({ phase: 'render', message: 'Renderizando frames…', progress: 0.55 });
  await sleep(280);
  onProgress?.({
    phase: 'watermark',
    message: 'Añadiendo watermark Run4Travel…',
    progress: 0.85,
  });
  await sleep(180);
  const asset = buildShareAsset(format, meta);
  onProgress?.({ phase: 'done', message: 'Listo para compartir', progress: 1, asset });
  return asset;
}

export async function shareOrSaveStub(
  asset: ShareAsset,
  mode: 'share' | 'save',
): Promise<'ok' | 'failed'> {
  await sleep(250);
  if (mode === 'save') {
    track('share_saved_gallery', { format: asset.format });
  } else {
    track('share_completed', { format: asset.format });
  }
  return 'ok';
}
