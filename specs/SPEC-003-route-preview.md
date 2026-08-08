# SPEC-003 — Preview de ruta, Story Points y Photo Spots

**Status:** draft  
**Golden Path:** Preview Route + Story Points + Photo Spots  
**Depends on:** SPEC-002  
**Blocks:** SPEC-004 (start gate offline)

---

## Problem

Antes de correr, el usuario debe **entender y emocionarse** con lo que descubrirá. Sin preview, la ruta es un polyline ciego y baja el start rate.

## User Story

Como corredor, quiero ver el mapa de mi ruta, las historias y los photo spots antes de empezar, para decidir si esta Discovery Run es la que quiero vivir hoy.

## Acceptance Criteria

1. **Given** una `DiscoveryRoute`, **When** abro preview, **Then** veo mapa con polyline, markers de Story Points y Photo Spots.
2. **Given** un Story Point, **When** tap, **Then** card con foto, nombre, descripción breve, duración de audio, categoría.
3. **Given** lista/cards, **When** scrolleo, **Then** puedo explorar todos los lugares sin iniciar carrera.
4. **Given** preview, **When** tap “Empezar a correr”, **Then** se verifica pack offline listo; si no, descarga con progreso.
5. **Given** descarga incompleta, **When** pierdo red, **Then** no se permite START (seguridad de experiencia §14).
6. Distancia, lugares, tiempo estimado visibles (Route Card Batlló).

## UX Flow

```
SPEC-002 success
  → Mapa + Route Card (distancia, lugares, dificultad/tiempo)
  → Sheet / carousel Story Points
  → Toggle Photo Spots
  → CTA “Empezar a correr”
      → Download pack (si falta)
      → SPEC-004 Active Run
```

## Data

Reutiliza `DiscoveryRoute`.  
Cliente añade:

```ts
type OfflinePackStatus = {
  routeId: string;
  geometry: boolean;
  storiesText: boolean;
  audio: boolean;
  mapTiles: boolean;
  ready: boolean;
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `GET` | `/routes/:id` | Ya generado |
| `GET` | `/routes/:id/offline-manifest` | URLs + hashes a descargar |
| `POST` | `/routes/:id/prefetch` | Opcional: firmar URLs |

## AI

N/A en preview. Textos ya vienen de SPEC-002.

## Privacy

- Mapa en dispositivo; no compartir ubicación en preview.
- Story content puede cachearse encriptado en reposo (v1: sandbox app).

## Offline

- Gate de START: `ready === true`.
- Manifest incluye geometry, story JSON, audio files, minimal tiles/region.

## Cost

- Bandwidth audio+tiles; mostrar tamaño estimado si &gt; 20MB.

## Edge Cases

- Audio aún generando → permitir START solo con texto TTS-on-device o skip audio con aviso.
- Marker overlap → clustering.
- Usuario edita intent → regenerar (confirma pérdida de pack).

## Analytics

- `route_preview_opened`
- `story_point_opened` `{ placeId }`
- `offline_pack_download_started/completed/failed`
- `run_start_tapped` / `run_start_blocked_offline`

## Tests

- UI: markers count = storyPoints + photoSpots.
- Offline gate unit tests.
- E2E: preview → download mock → start enabled.
