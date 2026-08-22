# SPEC-011 — Traveler Run Clubs

**Status:** implemented (client MVP mock)  
**Golden Path:** Community (parallel to discovery run)  
**Depends on:** —  
**Blocks:** —

---

## Problem

Viajeros quieren correr con otros en la misma ciudad sin montar un club permanente. Los Run Clubs espontáneos conectan personas durante el viaje y pueden desaparecer después.

## User Story

Como viajero en una ciudad, quiero encontrar o crear una corrida con distancia, ritmo, horario y punto de encuentro, para conocer la ciudad con otras personas.

## Acceptance Criteria

1. **Given** estoy en la tab Clubs, **When** abro la lista, **Then** veo corridas cercanas en mi ciudad (mock local).
2. **Given** una corrida, **When** tap Unirme, **Then** quedan registrados mi interés y el contador de runners sube (local).
3. **Given** quiero crear, **When** completo nombre, día/hora, distancia, ritmo y meeting point, **Then** aparece en la lista.
4. Ubicación precisa del meeting point **no** se trata como live GPS público (§13).
5. Copy Batlló: cercano, celebratorio; sin jerga técnica.

## UX Flow

```
Tab Clubs
  → Lista “Run Clubs cerca”
  → Unirme / Crear corrida
  → Confirmación suave
```

## Data

```ts
type RunClub = {
  id: string;
  cityId: string;
  cityName: string;
  title: string;
  whenLabel: string; // "Domingo · 07:00"
  distanceKm: number;
  paceRange: string; // "5:15–5:45/km"
  meetingPoint: string;
  runners: number;
  joined?: boolean;
};
```

## API

Mock local AsyncStorage v1. Futuro: `GET/POST /clubs`.

## Privacy

- Solo ciudad + meeting point textual; sin live share por defecto.

## Offline

- Lista cacheada localmente; create/join funcionan offline.

## Edge Cases

- Ciudad sin clubs → empty state + CTA crear.
- Club espontáneo: se puede “archivar” al acabar el viaje (v1.1).

## Analytics

- `clubs_viewed` · `club_joined` · `club_created`

## Tests

- Unit: join incrementa runners sin duplicar.
