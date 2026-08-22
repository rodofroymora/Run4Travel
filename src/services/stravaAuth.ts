import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  athleteDisplayName,
  buildStravaAuthorizeUrl,
  parseOAuthRedirect,
} from '../domain/stravaOAuth';
import type { StravaTokenResponse } from '../types/strava';
import { track } from './analytics';

export {
  athleteDisplayName,
  buildStravaAuthorizeUrl,
  parseOAuthRedirect,
} from '../domain/stravaOAuth';

WebBrowser.maybeCompleteAuthSession();

export type StravaOAuthProgress =
  | { phase: 'authorize'; message: string }
  | { phase: 'callback'; message: string }
  | { phase: 'token'; message: string }
  | {
      phase: 'done';
      message: string;
      athleteName: string;
      athleteId: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;
      mode: 'mock' | 'oauth';
    }
  | { phase: 'error'; message: string };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function getStravaClientId(): string | undefined {
  const id = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim();
  return id || undefined;
}

/** Demo-only: never ship client secrets in production clients. */
export function getStravaClientSecret(): string | undefined {
  const secret = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET?.trim();
  return secret || undefined;
}

export function stravaEnvConfigured(): boolean {
  return Boolean(getStravaClientId());
}

export function stravaOAuthReady(): boolean {
  return Boolean(getStravaClientId() && getStravaClientSecret());
}

export function getStravaRedirectUri(): string {
  const fromEnv = process.env.EXPO_PUBLIC_STRAVA_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  return AuthSession.makeRedirectUri({
    scheme: 'run4travel',
    path: 'strava/callback',
  });
}

export async function exchangeStravaCode(args: {
  clientId: string;
  clientSecret: string;
  code: string;
}): Promise<StravaTokenResponse> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    code: args.code,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Strava token HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
  }
  return (await res.json()) as StravaTokenResponse;
}

export async function refreshStravaToken(args: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<StravaTokenResponse> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    refresh_token: args.refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Strava refresh HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
  }
  return (await res.json()) as StravaTokenResponse;
}

/**
 * OAuth Strava: real browser flow when Client ID (+ Secret for token) are set.
 * Without secrets → mock phases (demo offline).
 */
export async function beginStravaOAuth(
  fallbackAthleteName = 'Marta',
  onProgress?: (p: StravaOAuthProgress) => void,
): Promise<{
  athleteName: string;
  athleteId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  mode: 'mock' | 'oauth';
}> {
  const clientId = getStravaClientId();
  const clientSecret = getStravaClientSecret();

  if (!clientId || !clientSecret) {
    onProgress?.({ phase: 'authorize', message: 'Abriendo autorización Strava (mock)…' });
    await sleep(350);
    onProgress?.({ phase: 'callback', message: 'Recibiendo callback…' });
    await sleep(280);
    onProgress?.({ phase: 'token', message: 'Intercambiando código (stub)…' });
    await sleep(220);
    const result = {
      athleteName: fallbackAthleteName,
      athleteId: `ath_mock_${Date.now().toString(36)}`,
      mode: 'mock' as const,
    };
    onProgress?.({
      phase: 'done',
      message: clientId
        ? 'Client ID OK · falta SECRET para OAuth real (demo mock)'
        : 'Conectado en modo demo (sin OAuth secrets)',
      ...result,
    });
    track('strava_oauth_mock', { hasClientId: clientId ? 1 : 0 });
    return result;
  }

  const redirectUri = getStravaRedirectUri();
  const authUrl = buildStravaAuthorizeUrl({ clientId, redirectUri });

  onProgress?.({
    phase: 'authorize',
    message: 'Abriendo Strava…',
  });
  track('strava_oauth_started', {});

  const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (authResult.type !== 'success' || !('url' in authResult) || !authResult.url) {
    const msg =
      authResult.type === 'cancel' || authResult.type === 'dismiss'
        ? 'Autorización cancelada'
        : 'No se completó el login de Strava';
    onProgress?.({ phase: 'error', message: msg });
    track('strava_oauth_failed', { reason: authResult.type });
    throw new Error(msg);
  }

  onProgress?.({ phase: 'callback', message: 'Recibiendo callback…' });
  const { code, error } = parseOAuthRedirect(authResult.url);
  if (error || !code) {
    const msg = error === 'access_denied' ? 'Acceso denegado en Strava' : 'Sin código OAuth';
    onProgress?.({ phase: 'error', message: msg });
    track('strava_oauth_failed', { reason: error ?? 'no_code' });
    throw new Error(msg);
  }

  onProgress?.({ phase: 'token', message: 'Intercambiando código…' });
  const token = await exchangeStravaCode({ clientId, clientSecret, code });
  const athleteName = athleteDisplayName(token.athlete);
  const athleteId = String(token.athlete?.id ?? `ath_${Date.now().toString(36)}`);
  const expiresAt = new Date(token.expires_at * 1000).toISOString();

  const done = {
    athleteName,
    athleteId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    mode: 'oauth' as const,
  };
  onProgress?.({
    phase: 'done',
    message: `Conectado · ${athleteName}`,
    ...done,
  });
  track('strava_oauth_succeeded', { athleteId });
  return done;
}
