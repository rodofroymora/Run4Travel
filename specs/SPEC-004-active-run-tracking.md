# SPEC-004 — Carrera activa: tracking, navegación y métricas

**Status:** draft  
**Golden Path:** START RUN → Navigation → Continue Running → FINISH  
**Depends on:** SPEC-003 (offline ready)  
**Blocks:** SPEC-005, SPEC-006, SPEC-007

---

## Problem

El tracking debe **soportar el descubrimiento**, no competir con Garmin/Strava. Sin GPS fiable, stories y photo spots no se sincronizan; sin resiliencia offline, se rompe la carrera.

## User Story

Como corredor, quiero que la app registre mi ruta y me guíe al siguiente lugar aunque falle internet, para completar la Discovery Run con confianza.

## Acceptance Criteria

1. **Given** pack offline ready, **When** START, **Then** inicia tracking: GPS route, distance, duration, moving time, current/avg pace, speed, km splits, elevation (si disponible).
2. **Given** carrera activa, **When** corro, **Then** veo navegación hacia el siguiente waypoint / story point (distancia restante, flecha/ruta).
3. **Given** pérdida de red, **When** sigo corriendo, **Then** tracking + nav + stories cacheadas continúan (§14).
4. **Given** FINISH (manual o meta), **When** confirmo, **Then** se persiste actividad localmente y se abre SPEC-007.
5. **Given** GPS débil, **When** accuracy pobre, **Then** UI avisa sin detener; no inventar path.
6. Seguridad: no prompts que distraigan en cruces; photo prompts diferidos si velocidad alta (coord. SPEC-006).

## UX Flow

```
START
  → Pantalla Run: mapa + pace/dist/time + próximo lugar
  → Eventos SPEC-005 / SPEC-006 intercalados
  → Pause / Resume
  → Finish
  → SPEC-007 Summary
```

## Data

```ts
type RunSession = {
  id: string;
  routeId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'active' | 'paused' | 'completed' | 'discarded';
  samples: GpsSample[]; // local buffer
  splitsKm: { km: number; paceSec: number; elevM?: number }[];
  distanceM: number;
  durationSec: number;
  movingTimeSec: number;
  avgPaceSecPerKm: number;
  storyEvents: { storyPointId: string; version: string; at: string }[];
  photos: { id: string; photoSpotId?: string; uri: string; at: string }[];
};

type GpsSample = {
  t: number; // epoch ms
  lat: number;
  lng: number;
  alt?: number;
  speed?: number;
  acc?: number;
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `POST` | `/runs` | Crear sesión (puede diferirse offline) |
| `PATCH` | `/runs/:id` | Heartbeat / finalize |
| `POST` | `/runs/:id/samples` | Batch upload post-run |

Offline-first: cola de sync.

## AI

N/A (consumo de stories en SPEC-005).

## Privacy

- GPS activo **nunca** público por defecto (§13).
- Diferenciar ciudad / plan / meeting point / live GPS.
- Live share solo con consentimiento explícito (fuera de v1 GP si hace falta).

## Offline

- Buffer samples en disco.
- Nav usa geometry local.
- Al recuperar red: sync actividad (y Strava vía SPEC-010).

## Cost

- Device GPS/battery; batch upload pequeño.

## Edge Cases

- App killed → recovery de sesión al reopen.
- Background location permissions denied mid-run → foreground-only mode + aviso.
- Autopause en semáforos (heurística) sin perder story sync.

## Analytics

- `run_started` / `run_completed` / `run_discarded`
- `run_duration_sec`, `run_distance_m`
- `run_gps_quality` `{ avgAcc }`
- `run_offline_ratio`

North Star precursor: completed runs (SPEC-007 valida “discovery” completo).

## Tests

- Unit: pace/splits calculators.
- Integration: mock GPS stream → distance.
- Chaos: airplane mode mid-run → finish → local persist.
