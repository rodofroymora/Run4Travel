import type { Place } from '../types/discovery';
import type { TravelAlbum } from '../types/album';
import type { RouteStyle } from '../types/routeIntent';
import { getLlmApiKey, getLlmBaseUrl, getLlmModel } from './llmRank';
import { track } from './analytics';

async function completeJson(
  system: string,
  user: string,
  temperature = 0.5,
): Promise<string | null> {
  const key = getLlmApiKey();
  if (!key) return null;
  const res = await fetch(`${getLlmBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getLlmModel(),
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? null;
}

function extractJsonObject(raw: string): unknown | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export type StoryDraft = {
  quick: string;
  standard: string;
  deep: string;
};

export function parseStoriesJson(
  raw: string,
  allowedIds: Set<string>,
): Record<string, StoryDraft> {
  const parsed = extractJsonObject(raw) as { stories?: unknown } | null;
  const out: Record<string, StoryDraft> = {};
  if (!parsed || typeof parsed.stories !== 'object' || !parsed.stories) return out;
  for (const [id, val] of Object.entries(parsed.stories as Record<string, unknown>)) {
    if (!allowedIds.has(id) || !val || typeof val !== 'object') continue;
    const rec = val as Record<string, unknown>;
    const quick = typeof rec.quick === 'string' ? rec.quick.trim() : '';
    const standard = typeof rec.standard === 'string' ? rec.standard.trim() : '';
    const deep = typeof rec.deep === 'string' ? rec.deep.trim() : '';
    // Podcast segments need real spoken length
    if (quick.length < 80 || standard.length < 160) continue;
    out[id] = {
      quick: quick.slice(0, 520),
      standard: standard.slice(0, 1100),
      deep: (deep || standard).slice(0, 2200),
    };
  }
  return out;
}

export async function fetchLlmStories(args: {
  cityName: string;
  style: RouteStyle;
  locale: string;
  places: Place[];
}): Promise<Record<string, StoryDraft> | null> {
  if (!getLlmApiKey() || args.places.length === 0) return null;
  const allowedIds = new Set(args.places.map((p) => p.id));
  const compact = args.places.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
  }));
  const system = `You are ✦, host of a running podcast guide for Run4Travel.
Write SPOKEN podcast scripts the runner hears in headphones while jogging past each place.
Language: Spanish (locale ${args.locale}). Second person to the runner ("mientras pasas…", "mira a tu izquierda…").
Return ONLY JSON: {"stories":{"placeId":{"quick":"","standard":"","deep":""}}}.
Lengths (spoken, not tweets):
- quick: ~45–60 seconds (220–380 characters) — teaser episode
- standard: ~90–120 seconds (500–850 characters) — main podcast hit
- deep: ~2–3 minutes (900–1800 characters) — extended cut
Voice: warm radio host, sensory, cultural, safe sidewalks. Start with a brief host cue like "✦ …".
Use only provided ids. Never invent coordinates, streets, or places. Never say "LLM". No stage directions in brackets.`;
  try {
    const raw = await completeJson(
      system,
      `City: ${args.cityName}\nStyle: ${args.style}\nPodcast stops: ${JSON.stringify(compact)}`,
      0.6,
    );
    if (!raw) return null;
    const stories = parseStoriesJson(raw, allowedIds);
    if (Object.keys(stories).length === 0) throw new Error('empty stories');
    track('story_llm_succeeded', { n: Object.keys(stories).length, format: 'podcast' });
    return stories;
  } catch (e) {
    track('story_llm_failed', {
      error: e instanceof Error ? e.message : 'error',
    });
    return null;
  }
}

export type AlbumCopyDraft = {
  coverSubtitle?: string;
  finalCaption?: string;
  excerpts: Record<string, string>;
};

export function parseAlbumCopyJson(
  raw: string,
  allowedPlaceIds: Set<string>,
): AlbumCopyDraft | null {
  const parsed = extractJsonObject(raw) as {
    coverSubtitle?: unknown;
    finalCaption?: unknown;
    excerpts?: unknown;
  } | null;
  if (!parsed) return null;
  const excerpts: Record<string, string> = {};
  if (parsed.excerpts && typeof parsed.excerpts === 'object') {
    for (const [id, text] of Object.entries(parsed.excerpts as Record<string, unknown>)) {
      if (!allowedPlaceIds.has(id) || typeof text !== 'string') continue;
      const clean = text.trim().slice(0, 280);
      if (clean) excerpts[id] = clean;
    }
  }
  return {
    coverSubtitle:
      typeof parsed.coverSubtitle === 'string'
        ? parsed.coverSubtitle.trim().slice(0, 90)
        : undefined,
    finalCaption:
      typeof parsed.finalCaption === 'string'
        ? parsed.finalCaption.trim().slice(0, 220)
        : undefined,
    excerpts,
  };
}

export function applyAlbumCopyByPlaceId(
  album: TravelAlbum,
  draft: AlbumCopyDraft,
  placeNameToId: Record<string, string>,
): TravelAlbum {
  const idToExcerpt = draft.excerpts;
  const cards = album.cards.map((c) => {
    if (c.type === 'cover' && draft.coverSubtitle) {
      return { ...c, subtitle: draft.coverSubtitle };
    }
    if (c.type === 'final' && draft.finalCaption) {
      return { ...c, caption: draft.finalCaption };
    }
    if (c.type === 'photo_story') {
      const pid = placeNameToId[c.placeName];
      const excerpt = (pid && idToExcerpt[pid]) || idToExcerpt[c.placeName];
      return excerpt ? { ...c, storyExcerpt: excerpt } : c;
    }
    return c;
  });
  return { ...album, cards, createdBy: 'ai', updatedAt: new Date().toISOString() };
}

export async function fetchLlmAlbumCopy(args: {
  cityName: string;
  routeName: string;
  distanceLabel: string;
  places: { id: string; name: string }[];
}): Promise<AlbumCopyDraft | null> {
  if (!getLlmApiKey() || args.places.length === 0) return null;
  const allowed = new Set(args.places.map((p) => p.id));
  const system = `You are ✦, editorial director of a Run4Travel album. Spanish, tactile, not sports-report.
Return ONLY JSON: {"coverSubtitle":"","finalCaption":"","excerpts":{"placeId":"caption"}}.
Only use provided place ids. Never invent places. No "LLM".`;
  try {
    const raw = await completeJson(
      system,
      `City: ${args.cityName}\nRoute: ${args.routeName}\nDistance: ${args.distanceLabel}\nPlaces: ${JSON.stringify(args.places)}`,
      0.6,
    );
    if (!raw) return null;
    const draft = parseAlbumCopyJson(raw, allowed);
    if (!draft) throw new Error('album parse');
    track('album_llm_succeeded', { n: Object.keys(draft.excerpts).length });
    return draft;
  } catch (e) {
    track('album_llm_failed', {
      error: e instanceof Error ? e.message : 'error',
    });
    return null;
  }
}
