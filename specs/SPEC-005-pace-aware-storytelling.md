# SPEC-005 — Pace-aware AI Storytelling + Music ducking

**Status:** hardened (client v1.1 mock)  
**Golden Path:** Music → AI Story → Music resumes  
**Depends on:** SPEC-002 (stories), SPEC-004 (pace/ETA)  
**Blocks:** — (enriquece run)

### Hardening notes (v1.1)

- Triggers siguen usando ritmo live / ETA; contador de adaptaciones alimenta chart del resumen.
- TTS real sigue stub (`cache://audio/...`); ducking mock local.

---

## Problem

Las historias fijas se desincronizan del ritmo del corredor. La magia es que la narración **llegue a tiempo** frente al lugar, conviviendo con la música del usuario.

## User Story

Como corredor con auriculares, quiero escuchar historias que se adapten a mi ritmo y que mi música baje o pause solo mientras dura la narración, para vivir el lugar sin pelear con el audio.

## Acceptance Criteria

1. **Given** me acerco a un Story Point, **When** ETA y duración de audio lo permiten, **Then** la narración puede **iniciar antes** de llegar para alinear el momento clave con el paso frente al lugar.
2. **Given** ritmo actual, **When** se elige versión, **Then** sistema selecciona `quick | standard | deep` dinámicamente.
3. **Given** música en reproducción (Spotify u otra), **When** empieza story, **Then** duck/pause → story → resume (§5).
4. **Given** Spotify API falla, **When** story debe sonar, **Then** running + story continúan; música best-effort.
5. **Given** audio cacheado, **When** offline, **Then** se reproduce cache; si falta, fallback a texto on-screen / TTS on-device si existe.
6. UI tip: “✦ Te acercas a Casa Batlló” — sin lenguaje técnico.
7. Generate → Cache → Reuse para texto y TTS.

## UX Flow

```
Run activa
  → Trigger por distancia/ETA a Story Point
  → Banner “✦ Te acercas a…”
  → Duck music
  → Play audio (versión elegida)
  → Resume music
  → Marca storyEvent en RunSession
```

Usuario puede skip / replay (si seguro).

## Data

```ts
type StoryPlaybackPlan = {
  storyPointId: string;
  version: 'quick' | 'standard' | 'deep';
  startAtDistanceM: number; // from point, negative = before
  audioUrl: string;
  durationSec: number;
};

type AudioCacheEntry = {
  key: string; // placeId+version+locale+voice
  uri: string;
  durationSec: number;
  createdAt: string;
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `POST` | `/stories/generate` | Texto versiones si faltan |
| `POST` | `/stories/tts` | Genera audio; idempotente por key |
| `GET` | `/stories/audio/:key` | CDN/cache |

Spotify: Auth + player control vía SDK oficial (nunca almacenar tracks).

## AI

| Campo | Valor (v1 propuesto) |
|-------|----------------------|
| Model/provider | LLM para texto (si no pre-generado en SPEC-002); TTS (p.ej. OpenAI TTS / ElevenLabs) |
| Inputs | place metadata, style, locale, version length target |
| Outputs | script texto; audio file |
| Expected calls | Ideal 0 en-run (pre-cache). Worst: 1 TTS miss por point |
| Token usage | ~400–1200 tokens/versión si on-demand |
| TTS duration | quick ≤ 25s · standard ≤ 55s · deep ≤ 110s |
| Cache | Texto + audio por `placeId+version+locale+voice+scriptHash`; TTL 90 días |
| Cost per run | Target &lt; $0.15 TTS+LLM por 10K (~8–14 points) con cache frío; &lt; $0.02 cache caliente |
| Fallback | Versión más corta cacheada → texto UI → skip |
| Evaluation | % stories started before arrival; % completed before leaving geofence; duck success rate |

## Privacy

- No enviar playlist/contenido Spotify a nuestros LLMs.
- Solo metadata de control de reproducción.

## Offline

- Prefetch audio en offline pack (SPEC-003).
- Sin audio: texto breve en card no modal blocking.

## Cost

Ver tabla AI. Preferir pre-generación al crear ruta.

## Edge Cases

- Ritmo muy alto → forzar `quick` o defer.
- Solapamiento de dos points → cola, no overlap audio.
- Usuario pausa carrera → pausa story.

## Analytics

- `story_triggered` / `story_played` / `story_skipped` / `story_failed`
- `story_version_selected` `{ version, reason }`
- `music_duck_succeeded` / `failed`
- `story_cache_hit`

## Tests

- Unit: version selector given pace + ETA + duration.
- Unit: start-before-arrival calculator.
- Integration: mock player duck/resume.
- Offline: play from cache only.
