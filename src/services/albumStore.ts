import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildAlbumTemplate, generateAlbumWithAi } from '../domain/album';
import { formatDistanceKm } from '../domain/geo';
import type { TravelAlbum } from '../types/album';
import type { DiscoveryRoute } from '../types/discovery';
import type { RunSession } from '../types/run';
import { track } from './analytics';
import { applyAlbumCopyByPlaceId, fetchLlmAlbumCopy } from './llmCopy';
import { getLlmApiKey } from './llmRank';

const KEY = '@r4t/albums';

async function readAll(): Promise<Record<string, TravelAlbum>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, TravelAlbum>) : {};
  } catch {
    return {};
  }
}

export async function getAlbumByRunId(runId: string): Promise<TravelAlbum | null> {
  const all = await readAll();
  return Object.values(all).find((a) => a.runId === runId) ?? null;
}

export async function saveAlbum(album: TravelAlbum): Promise<void> {
  const all = await readAll();
  all[album.id] = album;
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function generateAlbumForRun(
  session: RunSession,
  route: DiscoveryRoute,
  preferAi = true,
): Promise<TravelAlbum> {
  track('album_generate_started', { runId: session.id });
  await new Promise((r) => setTimeout(r, 400));

  try {
    let album = preferAi
      ? generateAlbumWithAi(session, route)
      : buildAlbumTemplate(session, route);

    if (preferAi && getLlmApiKey()) {
      const places = route.storyPoints.map((sp) => ({
        id: sp.placeId,
        name: sp.placeName ?? sp.placeId,
      }));
      const draft = await fetchLlmAlbumCopy({
        cityName: session.cityName,
        routeName: session.routeName,
        distanceLabel: formatDistanceKm(session.distanceM),
        places,
      });
      if (draft) {
        const nameToId: Record<string, string> = {};
        for (const p of places) nameToId[p.name] = p.id;
        album = applyAlbumCopyByPlaceId(album, draft, nameToId);
      }
    }

    if (!preferAi) track('album_fallback_used', { runId: session.id });
    await saveAlbum(album);
    track('album_generate_succeeded', { albumId: album.id, by: album.createdBy });
    return album;
  } catch {
    const album = buildAlbumTemplate(session, route);
    track('album_fallback_used', { runId: session.id });
    track('album_generate_failed', { runId: session.id });
    await saveAlbum(album);
    return album;
  }
}
