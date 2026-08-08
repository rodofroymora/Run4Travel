import type { AlbumCard, TravelAlbum } from '../types/album';
import type { DiscoveryRoute } from '../types/discovery';
import type { RunSession } from '../types/run';
import { formatDistanceKm } from './geo';

function id(prefix: string, i: number): string {
  return `${prefix}_${i}`;
}

/** Plantilla determinística local (fallback sin red / sin IA). */
export function buildAlbumTemplate(
  session: RunSession,
  route: DiscoveryRoute,
): TravelAlbum {
  const cards: AlbumCard[] = [
    {
      id: id('cover', 0),
      type: 'cover',
      title: route.name,
      subtitle: `${session.cityName} · Discovery Run`,
    },
    {
      id: id('city', 1),
      type: 'city_distance',
      city: session.cityName,
      distanceLabel: formatDistanceKm(session.distanceM),
    },
    {
      id: id('map', 2),
      type: 'route_map',
      routeId: route.id,
    },
  ];

  const places = route.storyPoints.slice(0, 6);
  places.forEach((sp, i) => {
    const placeName =
      route.photoSpots.find((p) => p.placeId === sp.placeId)?.placeId ?? sp.placeId;
    const catalogName =
      // resolve from story short text or place id
      sp.shortDescription.replace(/^✦\s*/, '').split(':')[0] || placeName;
    const photo = session.photos.find((p) => p.storyPointId === sp.id || p.photoSpotId === sp.photoSpotId);
    cards.push({
      id: id('ps', 3 + i),
      type: 'photo_story',
      photoId: photo?.id,
      placeName: catalogName.trim(),
      storyExcerpt: sp.storyVersions.quick,
    });
  });

  cards.push({
    id: id('stats', 20),
    type: 'stats',
    distanceM: session.distanceM,
    durationSec: session.durationSec,
    paceSec: session.avgPaceSecPerKm,
    places: session.storyEvents.length || route.storyPoints.length,
  });

  cards.push({
    id: id('final', 21),
    type: 'final',
    caption: 'Run the city. Hear its story. Capture the journey.',
  });

  return {
    id: `album_${session.id}`,
    runId: session.id,
    cards,
    theme: { bg: '#2b1d12', accent: '#e2603c', layout: 'editorial' },
    createdBy: 'template',
    updatedAt: new Date().toISOString(),
  };
}

/** Mock “AI”: reordena/copy editorial sobre la plantilla; no inventa lugares. */
export function generateAlbumWithAi(
  session: RunSession,
  route: DiscoveryRoute,
): TravelAlbum {
  const base = buildAlbumTemplate(session, route);
  const cover = base.cards.find((c) => c.type === 'cover');
  if (cover && cover.type === 'cover') {
    cover.subtitle = `✦ ${session.cityName} a tu ritmo`;
  }
  return {
    ...base,
    createdBy: 'ai',
    updatedAt: new Date().toISOString(),
  };
}

export function reorderAlbumCards(album: TravelAlbum, from: number, to: number): TravelAlbum {
  const cards = [...album.cards];
  if (from < 0 || from >= cards.length || to < 0 || to >= cards.length) return album;
  const [item] = cards.splice(from, 1);
  cards.splice(to, 0, item);
  return { ...album, cards, createdBy: 'user', updatedAt: new Date().toISOString() };
}

export function hideAlbumCard(album: TravelAlbum, cardId: string): TravelAlbum {
  return {
    ...album,
    cards: album.cards.map((c) => (c.id === cardId ? { ...c, hidden: true } : c)),
    createdBy: 'user',
    updatedAt: new Date().toISOString(),
  };
}

export function editPhotoStoryCaption(
  album: TravelAlbum,
  cardId: string,
  storyExcerpt: string,
): TravelAlbum {
  return {
    ...album,
    cards: album.cards.map((c) =>
      c.id === cardId && c.type === 'photo_story' ? { ...c, storyExcerpt } : c,
    ),
    createdBy: 'user',
    updatedAt: new Date().toISOString(),
  };
}

export function visibleCards(album: TravelAlbum): AlbumCard[] {
  return album.cards.filter((c) => !c.hidden);
}
