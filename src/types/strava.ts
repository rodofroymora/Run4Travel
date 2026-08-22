export type StravaConnection = {
  athleteId: string;
  athleteName: string;
  connectedAt: string;
  autoSync: boolean;
  /** Present when real OAuth succeeded. Demo stub omits tokens. */
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  mode: 'mock' | 'oauth';
};

export type OutboxJob = {
  id: string;
  type: 'strava_upload';
  runId: string;
  idempotencyKey: string;
  attempts: number;
  nextAt: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  lastError?: string;
  stravaActivityId?: string;
};

export type StravaTokenResponse = {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id: number;
    firstname?: string;
    lastname?: string;
    username?: string;
  };
};
