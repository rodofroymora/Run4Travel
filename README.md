# Run4Travel

**Run the city. Hear its story. Capture the journey.**

App móvil que combina running, travel, AI storytelling, fotografía y comunidad para descubrir ciudades mientras corres.

## Fuente de verdad

- **[CONSTITUTION.md](./CONSTITUTION.md)** — visión de producto, Golden Path, Batlló Design System y reglas de Spec-Driven Development.
- **[assets/references/batllo-home-summary-mock.png](./assets/references/batllo-home-summary-mock.png)** — mock de referencia (Hoy + Resumen).
- **[specs/](./specs/)** — specs de features (SPEC-001 → SPEC-010, client v1 mock implementado).
- **[docs/dev-workflow.md](./docs/dev-workflow.md)** — branching por slice demostable (no una rama por SPEC por defecto).

## Stack

| Capa | Tecnología |
|------|------------|
| App | Expo (React Native) + TypeScript |
| Design system | Batlló (`src/theme`) |
| Tipografía | Gabarito · Instrument Sans · JetBrains Mono |
| Persistencia demo | AsyncStorage (rutas, packs, runs, álbum, Strava outbox) |

## Arranque

```bash
npm install
npm start
```

Luego `i` (iOS), `a` (Android) o `w` (web).

```bash
npm run typecheck
npm test
```

## Demo Golden Path (end-to-end)

Flujo cliente sin backend real:

1. **Hoy** → *✦ Crear ruta con IA* → wizard SPEC-001 (ciudad → partida → distancia → estilo)
2. **✦ Creando tu ruta…** (SPEC-002) — ranking mock de places del catálogo + polyline del router determinístico → caché
3. **Preview** (SPEC-003) — mapa mock, story/photo cards → *Empezar a correr* descarga pack offline
4. **Carrera activa** (SPEC-004/005/006) — GPS simulado acelerado, métricas + **chart de ritmo en vivo**, banners `✦ Te acercas a…`, photo spots con safety gate → *Finalizar*
5. **Resumen** (SPEC-007) — stats y chart desde `RunSession.splitsKm` + card de álbum
6. **Álbum** (SPEC-008) — cards editoriales, reordenar / ocultar / editar texto
7. **Compartir** (SPEC-009) — formatos 9:16 / 4:5 / 1:1 / overlay transparente (stub share/save)
8. **Strava** (SPEC-010, opcional desde resumen) — OAuth mock por fases, outbox idempotente, toggle offline/flush

Atajo: tras generar una ruta, en **Hoy** el card muestra esa Discovery Run y *Ver preview / Empezar*.

## Estructura

```
CONSTITUTION.md
specs/                   # Feature specs
src/
  theme/                 # Tokens Batlló
  components/            # UI (MockMap, etc.)
  screens/               # Golden Path screens
  domain/                # Lógica pura + tests
  services/              # Mocks / AsyncStorage
  data/                  # Cities + places catalog
  types/
```

## Stubs / limitaciones intencionales (v1 mock)

- Mapbox Directions opcional — con `EXPO_PUBLIC_MAPBOX_TOKEN` usa `MapboxSafeRouter` (walking); sin token o si falla → `MockSafeRouter`
- Mapa: `RouteMap` (Mapbox GL vía WebView / static) con token; sin token → `MockMap` SVG
- Stories: TTS on-device (`expo-speech`); ducking música sigue mock
- Photo Spots: cámara/galería (`expo-image-picker`); safety gate intacto
- GPS: en dispositivo usa `expo-location`; en web / sin permiso → simulación a lo largo de la polyline
- Strava OAuth = stub (sin APIs externas en connect real)

### Env (ver `.env.example`)

| Variable | Uso | Estado |
|----------|-----|--------|
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Directions walking reales | Activo si está en `.env` |
| `EXPO_PUBLIC_STRAVA_CLIENT_ID` / `SECRET` | OAuth Strava | TODO — pantalla usa connect mock |
| `EXPO_PUBLIC_LLM_API_KEY` | Rank/order remoto de place IDs | TODO — mock ✦ local |

## North Star

**Completed Discovery Runs** — ruta completada + Story Points + ciudad descubierta + memorias capturadas.

## Principios rápidos

1. Distance is a constraint. Experience is the objective.
2. Los LLM nunca inventan geometría de rutas.
3. Offline-first durante la carrera.
4. Seguridad > descubrimiento / foto / comunidad.
5. La IA se comunica como **✦**, no como “LLM”.
