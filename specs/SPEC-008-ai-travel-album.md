# SPEC-008 — ✦ AI Travel Album + Editor

**Status:** implemented (client v1 mock)  
**Golden Path:** ✦ AI generates Travel Album → Preview → Customize  
**Depends on:** SPEC-007, SPEC-006 (fotos), SPEC-004  
**Blocks:** SPEC-009

---

## Problem

Las stats solas no cuentan el viaje. El usuario debe terminar con una **pieza editorial** que recuerde lugares, fotos e historias — y poder editarla porque “AI creates the first edit. The user owns the final story.”

## User Story

Como viajero, quiero que ✦ arme un álbum premium de mi carrera y poder reordenar, cambiar fotos/textos/layouts fácilmente, para compartir *la historia* de mis kilómetros en la ciudad.

## Acceptance Criteria

1. **Given** run completed, **When** genera álbum, **Then** produce secuencia tipo: Cover → Ciudad·Distancia → Route Map → Foto+Story loops → Stats → Final → footer métricas.
2. **Given** primera versión, **When** abro editor, **Then** puedo: reordenar, cambiar fotos, crop/zoom/reposition, fondos, textos, ocultar stats, colores, layouts, add/remove cards, cambiar portada.
3. Editor **simple y táctil**, no herramienta pro.
4. Estética álbum: fondo ink `#2b1d12`, marcos orgánicos, acentos trencadís.
5. Fallback sin fotos: mapa + stories + graphics Run4Travel.
6. Fallo IA: plantilla determinística local.

## UX Flow

```
Summary → “✦ Preparando tu álbum…”
  → Preview album
  → Customize (editor)
  → Done → SPEC-009 export targets
```

## Data

```ts
type AlbumCard =
  | { type: 'cover'; title: string; subtitle?: string; imageUri?: string }
  | { type: 'city_distance'; city: string; distanceLabel: string }
  | { type: 'route_map'; routeId: string; imageUri?: string }
  | { type: 'photo_story'; photoId?: string; placeName: string; storyExcerpt: string }
  | { type: 'stats'; distanceM: number; durationSec: number; paceSec: number; places: number }
  | { type: 'final'; imageUri?: string; caption?: string };

type TravelAlbum = {
  id: string;
  runId: string;
  cards: AlbumCard[];
  theme: { bg: string; accent: string; layout: string };
  createdBy: 'ai' | 'user';
  updatedAt: string;
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `POST` | `/albums/generate` | From runId |
| `GET` | `/albums/:id` | |
| `PATCH` | `/albums/:id` | User edits |
| `POST` | `/albums/:id/render` | Optional server render frames |

## AI

| Campo | Valor (v1 propuesto) |
|-------|----------------------|
| Model/provider | LLM para orden/copy; visión opcional para elegir mejores fotos |
| Inputs | run summary, photos metadata, story excerpts, city |
| Outputs | `TravelAlbum` JSON (cards order + copy); photo picks by id |
| Expected calls | 1 generate / run (+0 si user solo edita) |
| Token usage | ≤ 3k in / ≤ 1.5k out |
| TTS | N/A |
| Cache | Album by runId; regen only on demand |
| Cost per run | Target &lt; $0.03 LLM (+ storage renders) |
| Fallback | Template fijo: cover, map, up to N photos chronological, stats, final |
| Evaluation | Human raters “editorial vs sports report”; share rate lift |

**Hard:** no inventar lugares no visitados; no inventar fotos.

## Privacy

- Álbum privado hasta export.
- Edits quedan en cuenta del usuario.

## Offline

- Generación IA requiere red; fallback template local offline.
- Editor offline sobre álbum ya descargado.

## Cost

Ver AI + render images si server-side.

## Edge Cases

- 0 photos → ilustraciones/mapa.
- Demasiadas fotos → cap N con “añadir card”.
- Texto largo → clamp con edit.

## Analytics

- `album_generate_started/succeeded/failed`
- `album_fallback_used`
- `album_edit` `{ action }`
- `album_ready_viewed`

## Tests

- Unit: template fallback structure.
- Contract: all photoIds belong to run.
- UI: reorder gestures; hide stats.
