# Flujo de desarrollo — Run4Travel

## Enfoque de branching

Trabajamos con **trunk** (`main`) y **PRs de corta vida** por **slice demostable**, no con una rama por SPEC por defecto.

- Las specs en `specs/` son el **contrato** (qué debe cumplirse), no el tamaño de la rama.
- Una rama = un incremento que se puede **demostrar** de punta a punta (o un hardening coherente de un tramo del Golden Path).
- Evitar “una rama retrospectiva por SPEC” cuando el trabajo ya está acoplado en un flujo único.

## Rama actual / progreso overnight

| Rama | Estado |
|------|--------|
| `cursor/gp-route-preview` | SPEC-003 hardened (offline gate + MockMap) |
| `cursor/gp-route` | SPEC-002 hardened (router mock pluggable, catálogo v2, caché TTL) |
| `main` | Puede ir detrás hasta FF-merge local de los slices |

Golden Path cliente mock v1 base: `cursor/golden-path-client-v1` / commit en `main` previo al hardening.

## Slices recomendados

| Rama sugerida | Enfoque | Specs |
|---------------|---------|-------|
| `cursor/gp-route-preview` | Preview UI + offline pack gate (mock map) | 003 ✅ |
| `cursor/gp-route` | Router pluggable + distancia/caché/UX | 002 ✅ (Mapbox real pendiente de token) |
| `cursor/gp-run` | Live metrics/charts + GPS sim + offline run | 004 + 005 + 006 + 007 |
| `cursor/gp-album-share` | Render/export álbum y share | 008 + 009 |
| `cursor/gp-strava` | OAuth mock + outbox Strava | 010 |

Cada slice abre PR contra trunk cuando el demo del hardening esté listo; las specs se actualizan solo si cambia el contrato.

## Regla práctica

1. Elige el **slice demostable** (no el número de SPEC).
2. Implementa contra los contratos en `specs/`.
3. Abre un PR corto; merge a trunk; borra la rama.
4. El siguiente hardening nace de trunk limpio.
