# Feature Specs — Run4Travel

Ninguna feature importante se implementa sin spec (§23 Constitución).

## Golden Path (orden de implementación sugerido)

| ID | Spec | Fase GP | IA |
|----|------|---------|----|
| [SPEC-001](./SPEC-001-city-distance-selection.md) | Selección de ciudad, punto de partida y distancia | Choose City → Distance | No |
| [SPEC-002](./SPEC-002-ai-route-generation.md) | ✦ Generación de Discovery Run | Generate Route | Sí |
| [SPEC-003](./SPEC-003-route-preview.md) | Preview ruta + Story Points + Photo Spots | Preview | No* |
| [SPEC-004](./SPEC-004-active-run-tracking.md) | Carrera activa: GPS, nav, métricas | START RUN | No |
| [SPEC-005](./SPEC-005-pace-aware-storytelling.md) | Narración adaptada al ritmo + música | AI Story ↔ Music | Sí |
| [SPEC-006](./SPEC-006-photo-spots.md) | Photo Spots durante la carrera | 📸 Photo Spot | No* |
| [SPEC-007](./SPEC-007-run-summary.md) | Resumen post-carrera | Running Summary | No |
| [SPEC-008](./SPEC-008-ai-travel-album.md) | ✦ AI Travel Album + editor | Album → Customize | Sí |
| [SPEC-009](./SPEC-009-social-sharing.md) | Export / share social | Share | No |
| [SPEC-010](./SPEC-010-strava-sync.md) | Sync actividad a Strava | Sync to Strava | No |

\*Puede usar IA en ranking/copy; la geometría y coords nunca las inventa un LLM.

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
