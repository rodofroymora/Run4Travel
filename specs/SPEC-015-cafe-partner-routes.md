# SPEC-015 — Rutas de cafés + descuentos partner

**Status:** implemented (client v1 demo)  
**Golden Path:** Choose style **Cafés** → Generate → Run → Summary codes  
**Depends on:** SPEC-001, SPEC-002, SPEC-004, SPEC-007  
**Blocks:** —

### Hardening notes (v1)

- Estilo `cafes` en wizard / Explore.
- Waypoints: catálogo partner (coords reales) ∪ POIs `amenity=cafe` (Nominatim). ✦ no inventa geometría.
- Ofertas `%` + código; **se revelan al terminar** (nunca piden entrar al local en carrera).
- Demo: códigos `R4T-…` marcados como demo si no hay partner oficial.
- Safety > comercio: copy de acera; no CTA de “entra ahora” a alta velocidad.

---

## Problem

El viajero descubre monumentos, pero la ciudad también se vive en **cafeterías**. Un loop de cafés con un perk claro (descuento) conecta running, barrio y negocio local sin convertir Run4Travel en un cuponero.

## User Story

Como viajero, quiero una Discovery Run que una cafés con encanto y, al terminar, un % de descuento para parar con calma, para probar la ciudad a ritmo de café sin cruzar calzadas por una promo.

## Acceptance Criteria

1. **Given** elijo estilo **Cafés**, **When** genero ruta, **Then** la mayoría de waypoints son cafés con coords de catálogo/POI (no inventadas por ✦).
2. **Given** preview, **When** hay partners, **Then** veo “hasta −X% al terminar” — no un código todavía.
3. **Given** carrera activa, **When** paso cerca de un café, **Then** la historia puede sonar; **no** se exige entrar al local. Código **no** se muestra a velocidad insegura.
4. **Given** run completada, **When** abro resumen, **Then** veo códigos de los cafés visitados (story trigger) o de la ruta café.
5. **Given** oferta `demo: true`, **When** UI, **Then** se etiqueta “Demo · no válido en caja”.
6. Seguridad: nunca “párate en la calzada para canjear”.

## UX Flow

```
Estilo → Cafés
  → ✦ genera loop de cafés (router real)
  → Preview: lista de locales + perk teaser
  → Run (historias / photo spots con safety gate)
  → Summary: códigos desbloqueados
```

## Data

```ts
type PartnerOffer = {
  id: string;
  placeId: string;
  venueName: string;
  discountPct: number;
  code: string;
  perk: string;
  terms: string;
  demo: boolean;
};
```

## API

v1 client: catálogo local + Nominatim. Futuro: `GET /partners?cityId=` con contratos reales.

## AI

✦ rank/order/blurbs/stories igual que SPEC-002/014. Preferir IDs `category=cafe` cuando style=`cafes`. Sin coords.

## Privacy

Códigos en dispositivo. No publicar el track al partner.

## Offline

Ofertas van en el pack de ruta (JSON). Canje en local requiere estar en el café (fuera de app v1).

## Cost

LLM igual que generación; POI Nominatim/Mapbox.

## Edge Cases

- Ciudad sin partners → POIs café + oferta demo.
- Muy pocos cafés → mezclar 1–2 landmarks seguros.
- Partner caído → ocultar oferta, café sigue como story point.

## Analytics

- `cafe_route_generated`
- `partner_offer_previewed`
- `partner_offer_unlocked` `{ offerId, demo }`

## Tests

- Unit: style `cafes` válido; ofertas solo para placeIds de la ruta.
- Unit: unlock al haber storyEvent del café.
- Contract: 0 coords inventadas.
