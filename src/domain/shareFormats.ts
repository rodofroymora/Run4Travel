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
  return `✦ ${routeName} · ${cityName}\nRun the city. Hear its story.`;
}
