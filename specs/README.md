# Feature Specs — Run4Travel

Ninguna feature importante se implementa sin spec (§23 Constitución).

Flujo de ramas y slices futuros: [docs/dev-workflow.md](../docs/dev-workflow.md).

## Golden Path (orden de implementación)

| ID | Spec | Fase GP | IA | Status |
|----|------|---------|----|--------|
| [SPEC-001](./SPEC-001-city-distance-selection.md) | Selección de ciudad, punto de partida y distancia | Choose City → Distance | No | implemented (client v1) |
| [SPEC-002](./SPEC-002-ai-route-generation.md) | ✦ Generación de Discovery Run | Generate Route | Sí | implemented (client v1 mock) |
| [SPEC-003](./SPEC-003-route-preview.md) | Preview ruta + Story Points + Photo Spots | Preview | No* | implemented (client v1 mock) |
| [SPEC-004](./SPEC-004-active-run-tracking.md) | Carrera activa: GPS, nav, métricas | START RUN | No | implemented (client v1 mock) |
| [SPEC-005](./SPEC-005-pace-aware-storytelling.md) | Narración adaptada al ritmo + música | AI Story ↔ Music | Sí | implemented (client v1 mock) |
| [SPEC-006](./SPEC-006-photo-spots.md) | Photo Spots durante la carrera | 📸 Photo Spot | No* | implemented (client v1 mock) |
| [SPEC-007](./SPEC-007-run-summary.md) | Resumen post-carrera | Running Summary | No | implemented (client v1 mock) |
| [SPEC-008](./SPEC-008-ai-travel-album.md) | ✦ AI Travel Album + editor | Album → Customize | Sí | implemented (client v1 mock) |
| [SPEC-009](./SPEC-009-social-sharing.md) | Export / share social | Share | No | implemented (client v1 mock) |
| [SPEC-010](./SPEC-010-strava-sync.md) | Sync actividad a Strava | Sync to Strava | No | hardened (client v1.2 OAuth) |
| [SPEC-011](./SPEC-011-traveler-run-clubs.md) | Traveler Run Clubs | Community | No | implemented (client MVP mock) |
| [SPEC-012](./SPEC-012-explore.md) | Explorar ciudades y estilos | Discover | No | implemented (client MVP) |
| [SPEC-013](./SPEC-013-profile.md) | Perfil y stats | Profile | No | implemented (client MVP) |

\*Puede usar IA en ranking/copy; la geometría y coords nunca las inventa un LLM.

## Demo client-side

El Golden Path completo corre sin backend real: catálogo de places, router mock, GPS simulado, álbum/template, share stub y outbox Strava. Ver [README.md](../README.md) → *Demo Golden Path*.

## Plantilla mínima

```md
# SPEC-XXX — Título

## Problem
## User Story
## Acceptance Criteria
## UX Flow
## Data
## API
## AI (si aplica)
## Privacy
## Offline
## Cost
## Edge Cases
## Analytics
## Tests
```

Para features con IA: model/provider, inputs, outputs, calls esperadas, tokens, TTS, cache, cost/run, fallback, evaluation.
