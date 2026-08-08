/**
 * Strava OAuth surface — mock by default.
 *
 * TODO(env):
 *   EXPO_PUBLIC_STRAVA_CLIENT_ID=
 *   EXPO_PUBLIC_STRAVA_CLIENT_SECRET=   (server-only in prod)
 *   EXPO_PUBLIC_STRAVA_REDIRECT_URI=run4travel://strava/callback
 *
 * Without secrets, `beginStravaOAuth` runs a local stub authorize→callback flow.
 */

export type StravaOAuthProgress =
  | { phase: 'authorize'; message: string }
  | { phase: 'callback'; message: string }
  | { phase: 'token'; message: string }
  | { phase: 'done'; message: string; athleteName: string }
  | { phase: 'error'; message: string };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function stravaEnvConfigured(): boolean {
  const id =
    typeof process !== 'undefined'
      ? process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID
      : undefined;
  return Boolean(id && id.length > 0);
}

/** Mock OAuth: never opens a real browser / never needs secrets. */
export async function beginStravaOAuth(
  athleteName = 'Marta',
  onProgress?: (p: StravaOAuthProgress) => void,
): Promise<{ athleteName: string }> {
  onProgress?.({ phase: 'authorize', message: 'Abriendo autorización Strava (mock)…' });
  await sleep(350);
  onProgress?.({ phase: 'callback', message: 'Recibiendo callback…' });
  await sleep(280);
  onProgress?.({ phase: 'token', message: 'Intercambiando código (stub)…' });
  await sleep(220);
  if (stravaEnvConfigured()) {
    // Still stub until real PKCE wired; document for future
    onProgress?.({
      phase: 'done',
      message: 'Conectado (token real pendiente de wiring)',
      athleteName,
    });
  } else {
    onProgress?.({
      phase: 'done',
      message: 'Conectado en modo demo (sin OAuth secrets)',
      athleteName,
    });
  }
  return { athleteName };
}
