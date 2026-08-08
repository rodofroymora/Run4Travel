import { SHARE_ASPECT, suggestedCaption } from '../domain/shareFormats';
import type { ShareAsset, ShareFormat } from '../types/share';
import { track } from './analytics';

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

export async function shareOrSaveStub(
  asset: ShareAsset,
  mode: 'share' | 'save',
): Promise<'ok' | 'failed'> {
  await new Promise((r) => setTimeout(r, 300));
  if (mode === 'save') {
    track('share_saved_gallery', { format: asset.format });
  } else {
    track('share_completed', { format: asset.format });
  }
  return 'ok';
}
