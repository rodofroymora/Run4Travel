# SPEC-014 — ✦ Ciudad y ruta dinámicas (AI-first)

**Status:** implemented (client v1)  
**Golden Path:** Choose City → ✦ Generate Discovery Run  
**Depends on:** SPEC-001, SPEC-002  
**Blocks:** —

### Hardening notes (v1)

- Ciudad libre: geocode Nominatim (o Mapbox si hay token) → `City` dinámica con `supported: true`.
- Lugares: catálogo curado si existe; si no, POIs reales vía Nominatim alrededor del centro (nunca coords inventadas por ✦).
- ✦ rank/order/blurbs con `EXPO_PUBLIC_LLM_API_KEY` (OpenAI-compatible); fallback heurístico.
- UX: “✦ Descubrir ciudad” + búsqueda libre en wizard; copy sin “LLM”.

---

## Problem

El catálogo fijo (BCN/CDMX/…) limita el producto. El viajero debe poder correr **cualquier ciudad** con curaduría inteligente, sin que ✦ invente geometría.

## User Story

Como viajero, quiero escribir o pedir a ✦ una ciudad y obtener una Discovery Run con lugares reales ordenados con criterio cultural, para descubrirla al correr sin depender de un catálogo cerrado.

## Acceptance Criteria

1. **Given** un nombre de ciudad no listado, **When** lo resuelvo, **Then** obtengo centro/bounds reales (geocoder) y puedo continuar el wizard.
2. **Given** ciudad dinámica, **When** genero ruta, **Then** los waypoints tienen coords de catálogo o geocoder/POI API — nunca lat/lng emitidos por ✦.
3. **Given** `EXPO_PUBLIC_LLM_API_KEY`, **When** rank, **Then** ✦ ordena IDs + blurbs; sin key → heurística.
4. **Given** fallo de red/POI, **When** hay fallback, **Then** synthetic offsets o catálogo + mismo router.
5. Loading: “✦ Creando tu ruta…” / “✦ Descubriendo lugares…”.

## Pipeline

1. Resolve city (geocode).
2. Fetch candidate places (catalog ∪ POI API).
3. ✦ rank/order/blurbs (IDs only).
4. Router → geometry.
5. Validate distance ±8%.

## AI

| Campo | Valor |
|-------|-------|
| Inputs | city, style, distanceKm, places `{id,name,category,relevance}` |
| Outputs | `orderedPlaceIds[]`, `blurbs{id→text}`, optional `routeTitle` |
| Hard | No lat/lng / polylines from ✦ |
| Fallback | `heuristicRankPlaceIds` |

## Offline

- Tras generar: mismo pack SPEC-003.
- Generación requiere red salvo cache hit.

## Tests

- Unit: LLM response parser rejects invented IDs.
- Unit: dynamic place coords come from geocoder fixtures.
- Integration: generate without catalog city uses mock POIs + mock router.
