import type { Place } from '../types/discovery';
import type { RouteStyle } from '../types/routeIntent';
import { track } from './analytics';

export type LlmRankParsed = {
  placeIds: string[];
  blurbs: Record<string, string>;
  routeTitle?: string;
};

export function getLlmApiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_LLM_API_KEY?.trim();
  return key || undefined;
}

export function getLlmBaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_LLM_BASE_URL?.trim() ||
    'https://api.openai.com/v1'
  );
}

export function getLlmModel(): string {
  return process.env.EXPO_PUBLIC_LLM_MODEL?.trim() || 'gpt-4.1-mini';
}

type LlmJson = {
  placeIds?: unknown;
  blurbs?: unknown;
  routeTitle?: unknown;
};

/** Pure parser — rejects IDs not in the allowed set (no invented places). */
export function parseRankJson(
  raw: string,
  allowedIds: Set<string>,
  maxCount: number,
): LlmRankParsed | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: LlmJson;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as LlmJson;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.placeIds)) return null;
  const placeIds: string[] = [];
  for (const id of parsed.placeIds) {
    if (typeof id !== 'string') continue;
    if (!allowedIds.has(id)) continue;
    if (placeIds.includes(id)) continue;
    placeIds.push(id);
    if (placeIds.length >= maxCount) break;
  }
  if (placeIds.length < 2) return null;

  const blurbs: Record<string, string> = {};
  if (parsed.blurbs && typeof parsed.blurbs === 'object') {
    for (const [id, text] of Object.entries(parsed.blurbs as Record<string, unknown>)) {
      if (!allowedIds.has(id) || typeof text !== 'string') continue;
      const clean = text.trim().slice(0, 280);
      if (clean) blurbs[id] = clean;
    }
  }
  const routeTitle =
    typeof parsed.routeTitle === 'string'
      ? parsed.routeTitle.trim().slice(0, 64)
      : undefined;
  return { placeIds, blurbs, routeTitle };
}

/**
 * Calls remote ✦ for rank/order/blurbs. Returns null on missing key / failure.
 * Never invents coordinates — only IDs from `places`.
 */
export async function fetchLlmPlaceRank(args: {
  places: Place[];
  style: RouteStyle;
  maxCount: number;
  cityName: string;
  distanceKm: number;
  startLabel?: string;
}): Promise<(LlmRankParsed & { provider: string }) | null> {
  const key = getLlmApiKey();
  if (!key || args.places.length < 2) return null;

  const allowedIds = new Set(args.places.map((p) => p.id));
  const compact = args.places.slice(0, 40).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    relevance: Math.round(p.relevance * 100) / 100,
    styles: p.styles,
  }));

  const startHint = args.startLabel
    ? `Start zone: "${args.startLabel}". Prefer places that make sense near that neighborhood — do not send the runner across the whole city.`
    : 'Prefer a compact loop near the start.';

  const system = `You are ✦, the Run4Travel curator. Select and order running-friendly cultural places.
Return ONLY JSON: {"placeIds":["id",...],"blurbs":{"id":"short ES blurb"},"routeTitle":"optional title"}.
Rules: use only provided ids; never invent coordinates, streets, or geometry; select exactly ${args.maxCount} places when that many candidates exist (this is a ${args.distanceKm}km Discovery Run — more story stops beat sparse routes); ${startHint} Prefer safe sidewalks/parks; match style "${args.style}".
If style is "cafes", prefer category cafe / styles cafes.`;

  const user = `City: ${args.cityName}
DistanceKm: ${args.distanceKm}
Style: ${args.style}
Start: ${args.startLabel ?? 'unspecified'}
Candidates: ${JSON.stringify(compact)}`;

  try {
    const res = await fetch(`${getLlmBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getLlmModel(),
        temperature: 0.4,
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
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseRankJson(content, allowedIds, args.maxCount);
    if (!parsed) throw new Error('LLM parse failed');

    track('route_llm_rank_succeeded', {
      n: parsed.placeIds.length,
      model: getLlmModel(),
    });
    return { ...parsed, provider: `llm:${getLlmModel()}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'llm_error';
    track('route_fallback_used', { reason: msg });
    return null;
  }
}

/** ✦ suggests travel-worthy city names (no coordinates). */
export async function suggestCitiesWithLlm(
  hint?: string,
): Promise<{ names: string[]; usedFallback: boolean }> {
  const fallback = [
    'Barcelona',
    'Ciudad de México',
    'Lisboa',
    'Roma',
    'París',
    'Buenos Aires',
    'Oporto',
    'Sevilla',
  ];
  const key = getLlmApiKey();
  if (!key) return { names: fallback, usedFallback: true };

  try {
    const res = await fetch(`${getLlmBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getLlmModel(),
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Suggest 6 cities great for a cultural Discovery Run. Return JSON {"cities":["Name",...]}. No coordinates.',
          },
          {
            role: 'user',
            content: hint?.trim()
              ? `Preference: ${hint.trim()}`
              : 'Prefer walkable historic European/LatAm cities.',
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { cities?: unknown };
    const names = Array.isArray(parsed.cities)
      ? parsed.cities.filter((c): c is string => typeof c === 'string').slice(0, 8)
      : [];
    if (names.length < 3) throw new Error('few cities');
    return { names, usedFallback: false };
  } catch {
    return { names: fallback, usedFallback: true };
  }
}
