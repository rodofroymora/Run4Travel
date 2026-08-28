/** SPEC-001 — Route intent types */

export const DISTANCE_KM = [5, 10, 15, 21, 42] as const;
export type DistanceKm = (typeof DISTANCE_KM)[number];

export const ROUTE_STYLES = [
  'highlights',
  'historic',
  'scenic',
  'parks',
  'architecture',
  'hidden_gems',
  'waterfront',
  'cafes',
] as const;

export type RouteStyle = (typeof ROUTE_STYLES)[number];

export const ROUTE_STYLE_LABELS: Record<RouteStyle, string> = {
  highlights: 'Highlights',
  historic: 'Historic',
  scenic: 'Scenic',
  parks: 'Parks',
  architecture: 'Architecture',
  hidden_gems: 'Hidden Gems',
  waterfront: 'Waterfront',
  cafes: 'Cafés',
};

export type GeoPoint = {
  lat: number;
  lng: number;
  label?: string;
};

export type RouteIntent = {
  cityId: string;
  cityName: string;
  start: GeoPoint;
  distanceKm: DistanceKm;
  style: RouteStyle;
  locale: string;
  createdAt: string;
};

export type City = {
  id: string;
  name: string;
  country: string;
  center: { lat: number; lng: number };
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  supported: boolean;
  locales: string[];
};

export type StartSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: 'landmark' | 'hotel' | 'plaza' | 'station' | 'zone';
};
