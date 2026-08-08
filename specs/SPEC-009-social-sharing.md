# SPEC-009 — Social Sharing & exports

**Status:** hardened (client v1.1 mock)  
**Golden Path:** Share to Instagram / Social  
**Depends on:** SPEC-008 (o summary share mínimo)  
**Blocks:** —

### Hardening notes (v1.1)

- Pipeline stub compose→render→watermark con barra de progreso.
- Preview por formato + caption ES; share/save siguen stub (sin APIs nativas).
- TODO: render real (Skia/vista) cuando haya media.

---

## Problem

Compartir es crecimiento orgánico. Hace falta exportar en formatos sociales reales y un overlay de ruta transparente reutilizable.

## User Story

Como corredor orgulloso de mi Discovery Run, quiero exportar stories/carousel/post o solo la ruta transparente, para publicarlo en Instagram u otras redes sin pelear con el diseño.

## Acceptance Criteria

1. **Given** álbum o summary, **When** Compartir, **Then** puedo elegir: Instagram Stories 9:16 · Carousel 4:5 · Square 1:1 · Transparent Route Overlay.
2. **Given** transparent overlay, **When** export, **Then** PNG/WebP con fondo transparente solo de ruta/mapa gráfico.
3. **Given** export, **When** share sheet del OS, **Then** entrega archivos listos (no requiere Instagram API obligatoria en v1).
4. Watermark Run4Travel discreto (configurable off en settings v1.1).
5. Copy sugerido opcional tono Batlló.

## UX Flow

```
Summary / Album
  → Compartir carrera
  → Elegir formato
  → Render preview
  → Share sheet / Save to camera roll
```

## Data

```ts
type ShareFormat = 'story_9x16' | 'carousel_4x5' | 'square_1x1' | 'route_overlay';

type ShareAsset = {
  format: ShareFormat;
  uri: string;
  width: number;
  height: number;
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `POST` | `/albums/:id/export` | Server render opcional |
| Client-side render preferido v1 (perf/cost) | | |

## AI

Opcional: caption suggestions (1 call, cacheable). No bloqueante.

## Privacy

- Share explícito.
- Strip EXIF sensible en exports.
- Overlay no incluye live location trail crudo con timestamps personales si user opt-out.

## Offline

- Exports client-side si assets locales listos.
- Sin red: guardar en carrete.

## Cost

- Prefer client render; server solo si device low-end.

## Edge Cases

- Instagram no instalado → share genérico / save.
- Render fail → retry / simpler template.

## Analytics

- `share_format_selected` `{ format }`
- `share_completed` / `share_saved_gallery`
- `share_failed`

Secondary metric: album share rate.

## Tests

- Unit: aspect ratios correct.
- Overlay alpha channel present (route_overlay).
- E2E: export story asset exists on disk.
