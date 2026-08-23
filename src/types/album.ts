export type AlbumLayout = 'editorial' | 'mosaic' | 'minimal';

export type PhotoCrop = {
  zoom: number; // 1–2
  offsetX: number; // -0.5–0.5
  offsetY: number;
};

export type AlbumCard =
  | { id: string; type: 'cover'; title: string; subtitle?: string; imageUri?: string; hidden?: boolean }
  | { id: string; type: 'city_distance'; city: string; distanceLabel: string; hidden?: boolean }
  | { id: string; type: 'route_map'; routeId: string; imageUri?: string; hidden?: boolean }
  | {
      id: string;
      type: 'photo_story';
      photoId?: string;
      placeName: string;
      storyExcerpt: string;
      crop?: PhotoCrop;
      hidden?: boolean;
    }
  | {
      id: string;
      type: 'stats';
      distanceM: number;
      durationSec: number;
      paceSec: number;
      places: number;
      hidden?: boolean;
    }
  | { id: string; type: 'final'; imageUri?: string; caption?: string; hidden?: boolean };

export type TravelAlbum = {
  id: string;
  runId: string;
  cards: AlbumCard[];
  theme: { bg: string; accent: string; layout: AlbumLayout };
  createdBy: 'ai' | 'user' | 'template';
  updatedAt: string;
};

export const ALBUM_LAYOUTS: { id: AlbumLayout; label: string }[] = [
  { id: 'editorial', label: 'Editorial' },
  { id: 'mosaic', label: 'Mosaico' },
  { id: 'minimal', label: 'Minimal' },
];

export const ALBUM_ACCENTS: { id: string; label: string; color: string }[] = [
  { id: 'terracotta', label: 'Terracota', color: '#e2603c' },
  { id: 'sea', label: 'Mar', color: '#2a9d8f' },
  { id: 'gold', label: 'Oro', color: '#e8c547' },
];
