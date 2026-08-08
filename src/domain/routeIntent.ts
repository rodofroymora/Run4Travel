import {
  DISTANCE_KM,
  ROUTE_STYLES,
  type City,
  type DistanceKm,
  type GeoPoint,
  type RouteIntent,
  type RouteStyle,
} from '../types/routeIntent';

export type RouteIntentDraft = {
  city?: City;
  start?: GeoPoint;
  distanceKm?: DistanceKm;
  style?: RouteStyle;
  locale?: string;
};

export function isDistanceKm(value: number): value is DistanceKm {
  return (DISTANCE_KM as readonly number[]).includes(value);
}

export function isRouteStyle(value: string): value is RouteStyle {
  return (ROUTE_STYLES as readonly string[]).includes(value);
}

export function isPointInCityBounds(point: GeoPoint, city: City): boolean {
  const { bounds } = city;
  return (
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat &&
    point.lng >= bounds.minLng &&
    point.lng <= bounds.maxLng
  );
}

/** Snap suave al centro si el punto cae fuera de bounds. */
export function snapStartToCity(point: GeoPoint, city: City): GeoPoint {
  if (isPointInCityBounds(point, city)) return point;
  return {
    lat: city.center.lat,
    lng: city.center.lng,
    label: point.label ?? `${city.name} · centro`,
  };
}

export function isRouteIntentComplete(
  draft: RouteIntentDraft,
): draft is Required<Pick<RouteIntentDraft, 'city' | 'start' | 'distanceKm' | 'style'>> &
  RouteIntentDraft {
  return Boolean(draft.city && draft.start && draft.distanceKm && draft.style);
}

export function buildRouteIntent(draft: RouteIntentDraft): RouteIntent | null {
  if (!isRouteIntentComplete(draft) || !draft.city || !draft.start) return null;
  if (!draft.city.supported) return null;
  if (!isDistanceKm(draft.distanceKm)) return null;
  if (!isRouteStyle(draft.style)) return null;

  const start = snapStartToCity(draft.start, draft.city);

  return {
    cityId: draft.city.id,
    cityName: draft.city.name,
    start,
    distanceKm: draft.distanceKm,
    style: draft.style,
    locale: draft.locale ?? draft.city.locales[0] ?? 'es-ES',
    createdAt: new Date().toISOString(),
  };
}

export function distanceLabel(km: DistanceKm): string {
  return `${km}K`;
}
