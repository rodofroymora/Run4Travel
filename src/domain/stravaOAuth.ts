import type { StravaTokenResponse } from '../types/strava';

export function buildStravaAuthorizeUrl(args: {
  clientId: string;
  redirectUri: string;
  scope?: string;
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    response_type: 'code',
    redirect_uri: args.redirectUri,
    approval_prompt: 'auto',
    scope: args.scope ?? 'read,activity:write,activity:read_all',
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export function parseOAuthRedirect(url: string): {
  code?: string;
  error?: string;
} {
  try {
    const parsed = new URL(url);
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const code =
      parsed.searchParams.get('code') ?? hashParams.get('code') ?? undefined;
    const error =
      parsed.searchParams.get('error') ?? hashParams.get('error') ?? undefined;
    return { code: code || undefined, error: error || undefined };
  } catch {
    return {};
  }
}

export function athleteDisplayName(
  athlete: StravaTokenResponse['athlete'],
): string {
  if (!athlete) return 'Atleta Strava';
  const full = [athlete.firstname, athlete.lastname].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (athlete.username) return athlete.username;
  return `Atleta ${athlete.id}`;
}
