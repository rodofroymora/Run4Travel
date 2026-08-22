# SPEC-013 — Perfil

**Status:** implemented (client MVP)  
**Depends on:** SPEC-004, SPEC-010  
**Blocks:** —

## Problem

El usuario necesita un lugar para ver su progreso, conexiones y ajustes básicos.

## User Story

Como corredor, quiero ver mis stats de Discovery Runs, estado de Strava y un saludo personal, para sentir continuidad entre viajes.

## Acceptance Criteria

1. Muestra runs completados, km, historias, fotos, ciudades.
2. Muestra estado Strava (conectado / no).
3. Permite editar nombre de display (local).
4. CTA hacia sync Strava si hay sesión reciente.

## Analytics

- `profile_viewed` · `profile_name_saved`
