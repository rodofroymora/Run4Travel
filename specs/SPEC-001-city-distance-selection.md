# SPEC-001 — Selección de ciudad, punto de partida y distancia

**Status:** implemented (client v1 — mock cities API)  
**Golden Path:** Choose City → Choose Distance  
**Depends on:** —  
**Blocks:** SPEC-002

---

## Problem

Sin una forma clara de elegir **dónde** y **cuánto** correr, el usuario no puede iniciar una Discovery Run. Viajeros necesitan un flujo rápido (ciudad conocida + distancia objetivo) sin parecer un configurador de entrenamiento.

## User Story

Como viajero en una ciudad, quiero elegir ciudad, punto de partida, distancia y estilo de ruta, para que Run4Travel genere una Discovery Run alineada a mi tiempo y curiosidad.

## Acceptance Criteria

1. **Given** estoy en Hoy / “✦ Crear ruta”, **When** abro el flujo, **Then** veo selector de ciudad (lista + búsqueda).
2. **Given** ciudad seleccionada, **When** elijo punto de partida, **Then** puedo usar ubicación actual (con permiso) o un POI / dirección en esa ciudad.
3. **Given** punto válido, **When** elijo distancia, **Then** solo puedo elegir `5K | 10K | 15K | 21K | 42K`.
  4. **Given** distancia elegida, **When** elijo estilo, **Then** veo: Highlights · Historic · Scenic · Parks · Architecture · Hidden Gems · Waterfront · Cafés (default: Highlights).
5. **Given** todos los campos válidos, **When** confirmo, **Then** se dispara SPEC-002 con el payload de intención de ruta.
6. **Given** rechazo de permiso de ubicación, **When** intento “ubicación actual”, **Then** puedo elegir punto manualmente sin bloquear el flujo.
7. Copy cercano, sin jerga técnica; CTAs con ✦ solo en acciones IA posteriores.

## UX Flow

```
Hoy / CTA “✦ Crear ruta con IA”
  → Ciudad (search)
  → Punto de partida (mapa + pin / “Estoy aquí”)
  → Distancia (chips)
  → Estilo (chips o cards)
  → Confirmar → loading SPEC-002
```

Batlló: chips orgánicos, fondo `#f6efe3`, CTA primario terracotta.

## Data

```ts
type RouteIntent = {
  cityId: string;
  cityName: string;
  start: { lat: number; lng: number; label?: string };
  distanceKm: 5 | 10 | 15 | 21 | 42;
  style: RouteStyle;
  locale: string; // es-ES, en-US, ca-ES…
  createdAt: string; // ISO
};

type RouteStyle =
  | 'highlights' | 'historic' | 'scenic' | 'parks'
  | 'architecture' | 'hidden_gems' | 'waterfront';
```

Persistencia local del último `RouteIntent` (re-generar / editar).

## API

| Método | Path | Notas |
|--------|------|-------|
| `GET` | `/cities?q=` | Búsqueda ciudades soportadas |
| `GET` | `/cities/:id` | Bounds, centro, idiomas |
| `GET` | `/cities/:id/start-suggestions` | Hoteles/POIs comunes (opcional v1) |

Sin llamada LLM en esta spec.

## AI

N/A.

## Privacy

- Ubicación precisa solo con consentimiento explícito.
- Por defecto se muestra **ciudad**, no GPS continuo.
- El pin de partida se guarda en el dispositivo / cuenta del usuario; no es público.

## Offline

- Lista de ciudades recientes + favoritas cacheadas.
- Sin red: permitir seleccionar ciudad cacheada y punto en mapa offline si hay tiles; si no, mensaje claro y reintento.

## Cost

Negligible (lookup ciudades). Sin LLM/TTS.

## Edge Cases

- Ciudad no soportada → waitlist / “Próximamente”.
- Punto fuera de bounds de ciudad → snap o error suave.
- Distancia 42K con poca luz / aviso de seguridad (no bloquea).

## Analytics

- `route_intent_started`
- `city_selected` `{ cityId }`
- `distance_selected` `{ distanceKm }`
- `style_selected` `{ style }`
- `route_intent_confirmed`
- `location_permission` `{ status }`

## Tests

- Unit: validación `RouteIntent`, distancias enum.
- UI: chips exclusivos, CTA disabled hasta completar.
- E2E: Barcelona → 10K → Architecture → confirm.
