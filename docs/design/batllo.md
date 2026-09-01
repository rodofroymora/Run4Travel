# Batlló Design System

Referencia operativa. Detalle completo en [`CONSTITUTION.md`](../../CONSTITUTION.md) §15–§19.

## Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| background | `#fafafa` | Fondo app (casi blanco) |
| surface | `#ffffff` | Cards / superficies |
| ink | `#2b1d12` | Texto principal |
| terracotta | `#e2603c` | CTA primario |
| seaGreen | `#2a9d8f` | Acentos / stats |
| mosaicYellow | `#f3c33f` | Trencadís / highlights |
| mediterraneanBlue | `#3d5a80` | Acentos |
| amber | `#e8a63c` | Trencadís |
| secondaryText | `#8c6f52` | Texto secundario |
| borders | `#e6e0d8` | Bordes sutiles |

Los colores brillantes son **acentos** sobre blanco — nunca el fondo dominante.

## Tipografía

- **Gabarito** 700–800 — headings con carácter (Gaudí energy)
- **Instrument Sans** — body / UI
- **Space Grotesk** — métricas, ritmo, km (lean / Apple-adjacent)
- **JetBrains Mono** — solo coords / debug técnico

Alternativas lean si evoluciona el sistema: **Outfit** / **Sora** (display), **Manrope** / **DM Sans** (body). Evitar Inter genérico.

## Geometría

Cards con radios asimétricos. Botón primario: `999 / 999 / 999 / 22`.

## Ciudad hero

**Barcelona** — catálogo editorial (`PLACE_CATALOG_VERSION` v6). Blurbs podcast-ready; nombres de ruta por estilo (`Batlló Discovery`, `Modernisme Loop`, …).

## Componentes primarios (UI kit)

| Componente | Rol |
|---|---|
| `BatlloButton` | CTA: `primary` · `secondary` · `ghost` · `ink` — press scale Apple |
| `OrganicCard` | Superficie orgánica: `surface` · `terracotta` · `ink` + elevation |
| `StatMedal` | Stats con gradiente cerámico (no chips planos) |

Motion tokens: `src/theme/motion.ts` (`enterMs`, `pressScale`, `elevation`).

## Home (Hoy) — composición

Una escena: marca → hero (mapa + saludo + un CTA) → route orb → 3 medallas. Clubs fuera del tab bar.

## Mock de referencia

`assets/references/batllo-home-summary-mock.png` — pantallas Hoy + Resumen post-carrera.
