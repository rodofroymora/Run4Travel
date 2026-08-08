# SPEC-006 — Photo Spots

**Status:** hardened (client v1.1 mock)  
**Golden Path:** 📸 Photo Spot  
**Depends on:** SPEC-002 (spots), SPEC-004 (location)  
**Blocks:** SPEC-008 (album inputs)

### Hardening notes (v1.1)

- Safety gate intacto en carrera activa; captura stub → `RunSession.photos` → álbum.
- Cámara real pendiente (sin permisos extra en demo).

---

## Problem

Sin fotos ancladas a lugares, el álbum pierde alma editorial. Pero un prompt fotográfico mal timed puede ser **peligroso**.

## User Story

Como corredor, quiero que me avisen de los mejores momentos para una foto sin ponerme en riesgo, y que esas fotos queden ligadas a la carrera y al lugar.

## Acceptance Criteria

1. **Given** me acerco a un Photo Spot (p.ej. 150 m), **When** velocidad/contexto es seguro, **Then** veo “📸 Photo Spot · {nombre} · {m} m”.
2. **Given** prompt, **When** estoy en cruce / pace muy alto / accuracy mala, **Then** se **diferirá o silenciará** el prompt (seguridad &gt; foto).
3. **Given** spot, **When** capturo o elijo de galería post-run, **Then** la foto se asocia a `Run + Location + Story Point? + Time`.
4. Tips nunca piden detenerse en calzada; sugieren acera/mirador seguro.
5. Puedo dismiss; no spam del mismo spot.

## UX Flow

```
Geofence Photo Spot
  → Safety check
  → Banner 📸
  → [Capturar] [Después] [Dismiss]
  → Camera / save uri
  → Continúa run (+ music resume si venía de story)
```

Post-run: “Añadir desde galería” por spot faltante.

## Data

```ts
type RunPhoto = {
  id: string;
  runId: string;
  photoSpotId?: string;
  storyPointId?: string;
  uri: string; // local
  remoteUrl?: string;
  lat?: number;
  lng?: number;
  takenAt: string;
  source: 'camera' | 'library';
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `POST` | `/runs/:id/photos` | Multipart; puede ser cola offline |
| `GET` | `/runs/:id/photos` | Lista |

## AI

Opcional v1.5: ranking estético on-device o server para álbum (SPEC-008).  
En v1: reglas + metadata spot; sin inventar spots fuera del catálogo.

## Privacy

- Fotos privadas por defecto.
- EXIF: strip o minimizar antes de share.
- Ubicación de foto no pública salvo share explícito.

## Offline

- Guardar en disco local; sync después.
- Prompts funcionan offline (spots en pack).

## Cost

- Storage fotos; compresión client-side antes de upload.

## Edge Cases

- Permiso cámara denegado → solo library post-run.
- Spot sin foto al finish → álbum usa placeholders/mapa.
- Doble prompt story+photo → priorizar seguridad; secuenciar.

## Analytics

- `photo_spot_impressed` / `captured` / `deferred_safety` / `dismissed`
- `photo_library_attached`
- `photos_per_run`

## Tests

- Unit: safety gate (speed, accuracy, road flag).
- Unit: geofence enter/exit debounce.
- E2E: approach → capture → RunPhoto persisted.
