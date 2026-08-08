# SPEC-007 — Resumen post-carrera

**Status:** hardened (client v1.1 mock)  
**Golden Path:** Running Summary  
**Depends on:** SPEC-004  
**Blocks:** SPEC-008 (trigger álbum)

### Hardening notes (v1.1)

- Chart de ritmo construido desde `RunSession.splitsKm` (no barras placeholder).
- `splitsToChartBars` + bandas Green→Yellow→Terracotta compartidas con carrera activa.
- Tests de agregación `runSummary` / `runMetrics`.

---

## Problem

Al terminar, el usuario necesita cierre emocional y factual: no solo stats de fitness, sino **qué descubrió**. El resumen es el puente al álbum.

## User Story

Como corredor que acaba de terminar, quiero ver un resumen celebratorio con distancia, tiempo, ritmo, historias y el estado de mi álbum, para sentir “descubrí la ciudad” y compartir o guardar.

## Acceptance Criteria

1. **Given** run completed, **When** abro summary, **Then** veo medalla/distancia objetivo, saludo tono Batlló (“¡Molt bé, Marta!”), ruta · ciudad · hora.
2. **Given** stats, **When** render, **Then** grid: distance, time, pace (± PB si aplica), stories escuchadas.
3. **Given** splits, **When** hay datos, **Then** “Ritmo por tramo” (Green→Yellow→Terracotta).
4. **Given** álbum pending/ready, **When** SPEC-008 status, **Then** card “Tu álbum está listo” o “✦ Preparando tu álbum…”.
5. Acciones: Compartir carrera (SPEC-009), Guardar, Ver álbum.
6. North Star: marca `discovery_run_completed` si route completed + ≥1 story visited + city set + (≥0 photos ok; ideal ≥1 memory).

## UX Flow

```
FINISH
  → Summary (UI ya mockeada)
  → Auto-start SPEC-008 generación
  → Share / Save / Ver álbum
  → Optional SPEC-010 Strava
```

## Data

```ts
type RunSummary = {
  runId: string;
  routeName: string;
  cityName: string;
  finishedAtLocal: string;
  distanceM: number;
  durationSec: number;
  avgPaceSecPerKm: number;
  isPacePb: boolean;
  storiesListened: number;
  photoCount: number;
  splits: { km: number; paceSec: number }[];
  narrationAdaptations: number; // veces que cambió versión
  albumStatus: 'pending' | 'ready' | 'failed';
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `GET` | `/runs/:id/summary` | Agregado server o local-first |

## AI

N/A directa; dispara SPEC-008.

## Privacy

- Summary privado; share es explícito.

## Offline

- Summary 100% calculable local.
- Album card muestra pending hasta sync/gen.

## Cost

Negligible.

## Edge Cases

- 0 stories → copy alternativo sin castigar.
- Discard run → no summary / no north star.
- PB false positive → umbral mínimo distancia.

## Analytics

- `summary_viewed`
- `discovery_run_completed` `{ stories, photos, cityId }`
- `album_cta_tapped` / `share_cta_tapped` / `save_tapped`

## Tests

- Unit: summary aggregate from RunSession.
- UI snapshot: Batlló summary layout.
- Analytics: discovery flag rules.
