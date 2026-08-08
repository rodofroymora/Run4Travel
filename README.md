# Run4Travel

**Run the city. Hear its story. Capture the journey.**

App móvil que combina running, travel, AI storytelling, fotografía y comunidad para descubrir ciudades mientras corres.

## Fuente de verdad

- **[CONSTITUTION.md](./CONSTITUTION.md)** — visión de producto, Golden Path, Batlló Design System y reglas de Spec-Driven Development.
- **[assets/references/batllo-home-summary-mock.png](./assets/references/batllo-home-summary-mock.png)** — mock de referencia (Hoy + Resumen).
- **[specs/](./specs/)** — specs de features (obligatorias antes de implementar, §23). Golden Path: SPEC-001 → SPEC-010.

## Stack

| Capa | Tecnología |
|------|------------|
| App | Expo (React Native) + TypeScript |
| Design system | Batlló (`src/theme`) |
| Tipografía | Gabarito · Instrument Sans · JetBrains Mono |

## Arranque

```bash
npm install
npm start
```

Luego `i` (iOS), `a` (Android) o `w` (web).

**Demo UI:**
- **Hoy** → *✦ Crear ruta con IA* → wizard SPEC-001 (ciudad → partida → distancia → estilo) → placeholder SPEC-002
- **Hoy** → *Empezar a correr* → Resumen post-carrera (mock)

## Estructura

```
CONSTITUTION.md          # Constitución del producto
specs/                   # Feature specs (Spec-Driven)
docs/design/             # Notas del design system
src/
  theme/                 # Tokens Batlló
  components/            # UI reutilizable
  screens/               # Pantallas
assets/references/       # Mocks y referencias visuales
```

## North Star

**Completed Discovery Runs** — ruta completada + Story Points + ciudad descubierta + memorias capturadas.

## Principios rápidos

1. Distance is a constraint. Experience is the objective.
2. Los LLM nunca inventan geometría de rutas.
3. Offline-first durante la carrera.
4. Seguridad > descubrimiento / foto / comunidad.
5. La IA se comunica como **✦**, no como “LLM”.
