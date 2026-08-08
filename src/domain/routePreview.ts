import type { DiscoveryRoute, PhotoSpot, StoryPoint } from '../types/discovery';

export type PreviewMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: 'story' | 'photo';
  index?: number;
  label?: string;
};

const CATEGORY_ES: Record<string, string> = {
  architecture: 'Arquitectura',
  park: 'Parque',
  waterfront: 'Frente marítimo',
  neighborhood: 'Barrio',
  historic: 'Histórico',
  viewpoint: 'Mirador',
  landmark: 'Icono',
};

export function categoryLabelEs(category: string): string {
  return CATEGORY_ES[category] ?? category;
}

/** Markers de preview: Story Points (+ Photo Spots si visibles). */
export function buildPreviewMarkers(input: {
  storyPoints: StoryPoint[];
  photoSpots: PhotoSpot[];
  resolvePlace: (placeId: string) => { lat: number; lng: number; name?: string } | undefined;
  showPhotos: boolean;
}): PreviewMarker[] {
  const story: PreviewMarker[] = [];
  input.storyPoints.forEach((sp, index) => {
    const place = input.resolvePlace(sp.placeId);
    if (!place) return;
    story.push({
      id: sp.id,
      lat: place.lat,
      lng: place.lng,
      kind: 'story',
      index: index + 1,
      label: place.name,
    });
  });

  const photos: PreviewMarker[] = input.showPhotos
    ? input.photoSpots.map((ps) => ({
        id: ps.id,
        lat: ps.lat,
        lng: ps.lng,
        kind: 'photo' as const,
      }))
    : [];

  return [...story, ...photos];
}

/** Estimación de tamaño del pack (MB). SPEC-003: mostrar si > 20MB. */
export function estimateOfflinePackMb(route: DiscoveryRoute): number {
  const n = route.storyPoints.length;
  const geometryMb = 0.4;
  const storiesMb = 0.15 * n;
  const audioMb = 1.8 * n;
  const tilesMb = 12 + Math.min(n, 8) * 0.8;
  return Math.round((geometryMb + storiesMb + audioMb + tilesMb) * 10) / 10;
}

export const PACK_STEP_LABELS: Record<
  'geometry' | 'storiesText' | 'audio' | 'mapTiles',
  string
> = {
  geometry: 'Geometría de ruta',
  storiesText: 'Historias (texto)',
  audio: 'Audio de Story Points',
  mapTiles: 'Mapa mínimo offline',
};
