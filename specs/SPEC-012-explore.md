# SPEC-012 — Explorar

**Status:** implemented (client MVP)  
**Depends on:** SPEC-001  
**Blocks:** —

## Problem

El viajero quiere descubrir ciudades y estilos de ruta sin empezar el wizard a ciegas.

## User Story

Como viajero, quiero explorar ciudades soportadas y estilos de Discovery Run, para elegir dónde correr y lanzar ✦ Crear ruta con contexto.

## Acceptance Criteria

1. Tab Explorar lista ciudades (soportadas + próximamente).
2. Tap ciudad soportada → puede iniciar creación de ruta con esa ciudad.
3. Estilos de ruta visibles (Highlights, Architecture, etc.).
4. Copy Batlló; sin jerga LLM.

## Analytics

- `explore_viewed` · `explore_city_selected` · `explore_style_tapped`
