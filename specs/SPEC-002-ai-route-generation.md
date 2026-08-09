# SPEC-002 — ✦ Generación de Discovery Run (AI Route Generation)

**Status:** hardened (client v1.2 — Mapbox Directions optional)  
**Golden Path:** ✦ Generate Discovery Run  
**Depends on:** SPEC-001  
**Blocks:** SPEC-003, SPEC-005 (audio cache), SPEC-006 (photo ranking)

### Hardening notes (v1.1)

- Catálogo BCN/CDMX ampliado (`PLACE_CATALOG_VERSION=v2`) + blurbs editoriales por ID.
- Router pluggable `MockSafeRouter` (`src/services/routing/`) — geometría solo del router; ✦ no emite coords.
- Fitting de distancia ±8% con spurs métricos + filtro de places cercanos al start.
- Caché AsyncStorage con TTL 7 días e invalidación por versión de catálogo.
- UX generación: checklist de fases (caché → lugares → ✦ → ruta → validar) + meta de error %.

### Hardening notes (v1.2)

- `MapboxSafeRouter` (profile `walking`) detrás de `getRouteRouter()` cuando hay `EXPO_PUBLIC_MAPBOX_TOKEN`.
- Fallback automático a `MockSafeRouter` si Mapbox falla (red / token / quota).
- `generateDiscoveryRoute` es async; tests pinnean el mock router.
- Ver `.env.example`.

---

## Problem

El valor central de Run4Travel es una ruta que **descubre la ciudad** dentro de una distancia fija. Un fitness planner genérico no basta: hace falta curaduría cultural + geometría real + Story/Photo points.

## User Story

Como viajero, quiero que ✦ cree una ruta de mi distancia que conecte lugares relevantes de forma segura y corrida, para descubrir la ciudad mientras corro — no solo completar kilómetros.

## Acceptance Criteria

1. **Given** un `RouteIntent` válido, **When** genero ruta, **Then** recibo geometría real (polyline), distancia dentro de tolerancia (±8% del target, ideal ±5%), Story Points y Photo Spots.
2. **Given** generación, **When** el LLM propone lugares, **Then** solo selecciona/ordena/explica IDs de un catálogo; **nunca** inventa calles, coords ni geometría.
3. **Given** routing engine, **When** calcula path, **Then** prioriza: safety (aceras/parques/carriles) → distancia → densidad cultural → paisaje.
4. **Given** fallo de LLM, **When** hay fallback, **Then** se usa ranking heurístico del catálogo + mismo router (sin inventar lugares).
5. **Given** éxito, **When** termina, **Then** se cachea la ruta completa para offline (SPEC-014 principios / §14).
6. Copy de loading: “✦ Creando tu ruta…” — nunca “llamando al LLM”.

## UX Flow

```
Confirm SPEC-001
  → Pantalla “✦ Creando tu Discovery Run…”
  → Progreso suave (ciudad / lugares / ruta)
  → Éxito → SPEC-003 Preview
  → Error → reintentar / cambiar estilo / soporte
```

## Data

```ts
type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  photoUrl?: string;
  relevance: number; // 0–1
  safeForRunning: boolean;
};

type StoryPoint = {
  id: string;
  placeId: string;
  shortDescription: string;
  storyVersions: { quick: string; standard: string; deep: string };
  audio?: { quick?: string; standard?: string; deep?: string }; // URLs cache
  durationSec: { quick: number; standard: number; deep: number };
  photoSpotId?: string;
};

type PhotoSpot = {
  id: string;
  placeId: string;
  lat: number;
  lng: number;
  tip: string; // nunca compromete seguridad
  radiusM: number;
};

type DiscoveryRoute = {
  id: string;
  intent: RouteIntent;
  geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng,lat]
  distanceM: number;
  elevGainM?: number;
  estimatedMovingTimeSec: number;
  storyPoints: StoryPoint[];
  photoSpots: PhotoSpot[];
  provider: { router: string; llm?: string };
  createdAt: string;
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `POST` | `/routes/generate` | Body: `RouteIntent` → `DiscoveryRoute` |
| `GET` | `/routes/:id` | Recuperar cacheada |
| `GET` | `/places?cityId=&bbox=` | Catálogo (interno al servicio) |

### Pipeline (obligatorio)

1. Fetch places candidatos (DB/POI, no LLM).
2. LLM: rank + order + short blurbs (IDs only).
3. Router (Mapbox/OSRM/etc.): geometría visitando waypoints.
4. Validate distance & safety score.
5. Persist + return.

## AI

| Campo | Valor (v1 propuesto) |
|-------|----------------------|
| Model/provider | LLM texto (p.ej. GPT-4.1-mini / Claude Haiku) — **sin** tool de mapas |
| Inputs | city, style, distanceKm, lista de places `{id,name,category,relevance}` (máx N) |
| Outputs | ordered `placeIds[]`, per-place `shortDescription`, suggested story depth hints |
| Expected calls | 1 rank/order por generación (+0 si cache hit) |
| Token usage | Target ≤ 4k input / ≤ 1.5k output por run |
| TTS | No en esta spec (SPEC-005) |
| Cache | Key: `cityId+style+distanceKm+startGeohash5+catalogVersion` → reusar 7 días si start cercano |
| Cost per run | Target &lt; $0.05 LLM (sin TTS) |
| Fallback | Heurística por relevance + category match al style; sin LLM |
| Evaluation | % rutas en tolerancia distancia; % waypoints visitables a pie/run; 0 alucinaciones geométricas en sample QA |

**Hard constraint:** LLM nunca emite lat/lng ni polylines.

## Privacy

- Start point no se publica.
- Logs de generación sin PII en prompts (usar IDs).

## Offline

- Post-generación: descargar geometry, stories texto, audio (si listo), tiles mínimos **antes** de START (gate en SPEC-003/004).
- Durante generación se requiere red (salvo cache hit total).

## Cost

- LLM: ver arriba.
- Router: 1 request directions/optimized.
- Storage: route JSON + media refs.

## Edge Cases

- Muy pocos places → ampliar radio / cambiar style suggestion.
- Router no alcanza distancia → loop scenic seguro o out-and-back declarado en UI.
- Timeout LLM → fallback heurístico automático &lt; 3s extra.

## Analytics

- `route_generate_started` / `succeeded` / `failed`
- `route_generate_cache_hit`
- `route_distance_error_pct`
- `route_story_point_count`, `route_photo_spot_count`
- `route_fallback_used` `{ reason }`

## Tests

- Contract: response nunca contiene coords no presentes en catálogo/router.
- Unit: distance tolerance validator.
- Integration: mock LLM + real/fixture router.
- Eval set: 20 intents Barcelona/CDMX — 0 geometry hallucinations.
