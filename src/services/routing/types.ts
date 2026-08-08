/**
 * Router contract — Mapbox/OSRM can plug in later.
 * Geometry comes only from the router (never from ✦ / LLM).
 */

export type LatLng = { lat: number; lng: number };

export type RouteDirectionsRequest = {
  start: LatLng;
  waypoints: LatLng[];
  targetDistanceM: number;
  preferSafe: boolean;
};

export type RouteDirectionsResult = {
  coordinates: [number, number][]; // [lng, lat]
  distanceM: number;
  provider: string;
};

export interface RouteRouter {
  buildDirections(req: RouteDirectionsRequest): Promise<RouteDirectionsResult> | RouteDirectionsResult;
}
