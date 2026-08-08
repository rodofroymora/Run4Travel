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
  theme: { bg: string; accent: string; layout: string };
  createdBy: 'ai' | 'user' | 'template';
  updatedAt: string;
};
