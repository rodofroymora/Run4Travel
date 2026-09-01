import { getMapboxToken } from './routing';

export type MapMarker = {
  id: string;
  lng: number;
  lat: number;
  kind: 'story' | 'photo' | 'user';
  index?: number;
};

/** Downsample long polylines for Static / GL overlays.
 * Always keeps endpoints and any coordinate nearest to each `preserve` point
 * (story markers) so the drawn line still visits every stop.
 */
export function simplifyCoordinates(
  coords: [number, number][],
  maxPoints = 100,
  preserve?: [number, number][],
): [number, number][] {
  if (coords.length <= maxPoints) return coords;

  const mustKeep = new Set<number>([0, coords.length - 1]);
  for (const p of preserve ?? []) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i]!;
      const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2;
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    mustKeep.add(bestI);
  }

  const step = Math.ceil(coords.length / maxPoints);
  for (let i = 0; i < coords.length; i += step) {
    mustKeep.add(i);
  }

  const indices = [...mustKeep].sort((a, b) => a - b);
  return indices.map((i) => coords[i]!);
}

export function routeBounds(coords: [number, number][]): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} | null {
  if (!coords.length) return null;
  let minLng = coords[0]![0];
  let maxLng = coords[0]![0];
  let minLat = coords[0]![1];
  let maxLat = coords[0]![1];
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Mapbox Static Images URL with GeoJSON path + markers.
 * Falls back to null without token.
 */
export function buildMapboxStaticUrl(args: {
  coordinates: [number, number][];
  markers?: MapMarker[];
  width?: number;
  height?: number;
}): string | null {
  const token = getMapboxToken();
  if (!token) return null;
  const markers = args.markers ?? [];
  const preserve = markers.map((m) => [m.lng, m.lat] as [number, number]);
  const coords = simplifyCoordinates(args.coordinates, 80, preserve);
  if (coords.length < 2) return null;

  const width = Math.min(1280, Math.max(200, Math.round(args.width ?? 640)));
  const height = Math.min(1280, Math.max(200, Math.round(args.height ?? 360)));

  const line = {
    type: 'Feature' as const,
    properties: { stroke: '#e2603c', 'stroke-width': 4 },
    geometry: { type: 'LineString' as const, coordinates: coords },
  };

  const points = (args.markers ?? []).slice(0, 20).map((m) => ({
    type: 'Feature' as const,
    properties: {
      'marker-color':
        m.kind === 'photo' ? '#f3c33f' : m.kind === 'user' ? '#2a9d8f' : '#3d5a80',
      'marker-size': 'small',
    },
    geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
  }));

  const geojson = {
    type: 'FeatureCollection' as const,
    features: [line, ...points],
  };

  const overlay = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${overlay}/auto/` +
    `${width}x${height}@2x?padding=40&access_token=${encodeURIComponent(token)}`
  );
}

export function buildMapboxGlHtml(args: {
  coordinates: [number, number][];
  markers?: MapMarker[];
  selectedMarkerId?: string | null;
  /** Center on user marker and keep a tight zoom (active run). */
  followUser?: boolean;
}): string | null {
  const token = getMapboxToken();
  if (!token) return null;
  const markers = args.markers ?? [];
  const preserve = markers.map((m) => [m.lng, m.lat] as [number, number]);
  const coords = simplifyCoordinates(args.coordinates, 120, preserve);
  if (coords.length < 2) return null;

  const user = markers.find((m) => m.kind === 'user');
  const payload = JSON.stringify({
    token,
    coordinates: coords,
    markers,
    selectedId: args.selectedMarkerId ?? null,
    followUser: Boolean(args.followUser && user),
    follow: user ? [user.lng, user.lat] : null,
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"><\/script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #2b1d12; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const DATA = ${payload};
  mapboxgl.accessToken = DATA.token;
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    interactive: true,
    attributionControl: true,
  });
  map.on('load', () => {
    map.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: DATA.coordinates } }
    });
    map.addLayer({
      id: 'route-halo',
      type: 'line',
      source: 'route',
      paint: { 'line-color': '#e2603c', 'line-width': 8, 'line-opacity': 0.25 }
    });
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#e2603c', 'line-width': 3.5 }
    });
    const bounds = new mapboxgl.LngLatBounds(DATA.coordinates[0], DATA.coordinates[0]);
    DATA.coordinates.forEach((c) => bounds.extend(c));
    DATA.markers.forEach((m) => {
      const el = document.createElement('div');
      const selected = m.id === DATA.selectedId;
      const size = selected ? 16 : 12;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.borderRadius = m.kind === 'photo' ? '2px' : '50%';
      el.style.transform = m.kind === 'photo' ? 'rotate(45deg)' : 'none';
      el.style.background = m.kind === 'photo' ? '#f3c33f' : m.kind === 'user' ? '#2a9d8f' : '#3d5a80';
      el.style.border = '2px solid #ffffff';
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
      new mapboxgl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
      bounds.extend([m.lng, m.lat]);
    });
    if (DATA.followUser && DATA.follow) {
      map.jumpTo({ center: DATA.follow, zoom: 15.2 });
    } else {
      map.fitBounds(bounds, { padding: 36, maxZoom: 15, duration: 0 });
    }
  });
<\/script>
</body>
</html>`;
}
