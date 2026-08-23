import type { ShareFormat } from '../types/share';

export const SHARE_ASPECT: Record<
  ShareFormat,
  { width: number; height: number; label: string; transparent: boolean }
> = {
  story_9x16: { width: 1080, height: 1920, label: 'Stories 9:16', transparent: false },
  carousel_4x5: { width: 1080, height: 1350, label: 'Carousel 4:5', transparent: false },
  square_1x1: { width: 1080, height: 1080, label: 'Square 1:1', transparent: false },
  route_overlay: { width: 1080, height: 1080, label: 'Ruta transparente', transparent: true },
};

export function aspectRatio(format: ShareFormat): number {
  const { width, height } = SHARE_ASPECT[format];
  return width / height;
}

export function suggestedCaption(cityName: string, routeName: string): string {
  return `✦ ${routeName} · ${cityName}\nCorre la ciudad. Escucha su historia.`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Client-side SVG card — used by export pipeline. */
export function buildShareSvg(
  format: ShareFormat,
  meta: { cityName: string; routeName: string; runId: string },
): string {
  const spec = SHARE_ASPECT[format];
  const { width: w, height: h } = spec;
  const transparent = spec.transparent;
  const bg = transparent ? 'none' : '#2b1d12';
  const title = escapeXml(meta.routeName);
  const city = escapeXml(meta.cityName);
  const routePath = `M ${w * 0.12} ${h * 0.62} C ${w * 0.28} ${h * 0.48}, ${w * 0.4} ${h * 0.72}, ${w * 0.55} ${h * 0.55} S ${w * 0.78} ${h * 0.4}, ${w * 0.88} ${h * 0.5}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${transparent ? '' : `<rect width="100%" height="100%" fill="${bg}"/>`}
  ${transparent ? '' : `<text x="${w * 0.08}" y="${h * 0.12}" fill="#e8c547" font-family="system-ui,sans-serif" font-size="${Math.round(w * 0.035)}" font-weight="600">✦ Discovery Run</text>`}
  ${transparent ? '' : `<text x="${w * 0.08}" y="${h * 0.2}" fill="#fff8ef" font-family="system-ui,sans-serif" font-size="${Math.round(w * 0.07)}" font-weight="700">${title}</text>`}
  ${transparent ? '' : `<text x="${w * 0.08}" y="${h * 0.26}" fill="rgba(255,248,239,0.7)" font-family="system-ui,sans-serif" font-size="${Math.round(w * 0.035)}">${city}</text>`}
  <path d="${routePath}" fill="none" stroke="#e2603c" stroke-width="${Math.max(8, w * 0.012)}" stroke-linecap="round"/>
  <path d="${routePath}" fill="none" stroke="#2a9d8f" stroke-width="${Math.max(4, w * 0.006)}" stroke-linecap="round" opacity="0.55" transform="translate(0 ${h * 0.02})"/>
  ${transparent ? '' : `<text x="${w * 0.08}" y="${h * 0.92}" fill="rgba(255,248,239,0.45)" font-family="system-ui,sans-serif" font-size="${Math.round(w * 0.028)}">Run4Travel</text>`}
</svg>`;
}
