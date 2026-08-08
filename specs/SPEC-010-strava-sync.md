# SPEC-010 — Sync de actividad a Strava

**Status:** implemented (client v1 mock)  
**Golden Path:** Sync to Strava  
**Depends on:** SPEC-004 / SPEC-007  
**Blocks:** —

---

## Problem

Muchos runners ya viven en Strava. Run4Travel no los reemplaza: debe **enviar** la actividad completada cuando la API lo permita, sin perder datos si Strava falla.

## User Story

Como usuario de Strava, quiero sincronizar mi Discovery Run terminada a Strava, para mantener mi historial fitness mientras uso Run4Travel para descubrir la ciudad.

## Acceptance Criteria

1. **Given** cuenta Strava conectada, **When** completo un run, **Then** puedo sync automático (opt-in) o manual desde summary.
2. **Given** sync, **When** éxito, **Then** actividad aparece en Strava con distancia/tiempo/GPS y nombre tipo “Run4Travel · Modernisme Loop · Barcelona”.
3. **Given** Strava falla / sin red, **When** termino, **Then** actividad queda guardada local y en cola “sincronizar después” (§14).
4. **Given** no conectado, **When** tap sync, **Then** OAuth Strava.
5. No duplicar la misma `runId` (idempotencia).
6. Descripción puede mencionar lugares descubiertos (conteo), sin dumps de GPS privado extra.

## UX Flow

```
Settings → Conectar Strava
Summary → “Sync to Strava” / auto
  → success toast / pending / error+retry
```

## Data

```ts
type StravaConnection = {
  athleteId: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: string;
  autoSync: boolean;
};

type OutboxJob = {
  id: string;
  type: 'strava_upload';
  runId: string;
  attempts: number;
  nextAt: string;
  lastError?: string;
};
```

## API

| Método | Path | Notas |
|--------|------|-------|
| `POST` | `/integrations/strava/oauth/start` | |
| `POST` | `/integrations/strava/oauth/callback` | |
| `POST` | `/integrations/strava/activities` | Proxy upload idempotente `Idempotency-Key: runId` |
| Strava | `POST /oauth/token`, `POST /activities`, upload GPX/FIT | Según scopes aprobados |

## AI

N/A.

## Privacy

- Tokens cifrados at-rest.
- Scopes mínimos.
- User puede desconectar y borrar tokens.
- No hacer público el track en Run4Travel por sync.

## Offline

- Outbox persistente con backoff.
- UI: “Se sincronizará cuando haya red”.

## Cost

- API Strava free tier; nuestros compute mínimos.

## Edge Cases

- Token expired → refresh; fail → reauth.
- Activity already uploaded → treat as success.
- Run discarded → cancel outbox job.

## Analytics

- `strava_connect_succeeded`
- `strava_sync_queued` / `succeeded` / `failed`
- `strava_sync_rate` (secondary metric)

## Tests

- Unit: idempotency key + outbox retry.
- Integration: mock Strava upload.
- Offline: queue flush on reconnect.
