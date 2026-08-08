export type StravaConnection = {
  athleteId: string;
  athleteName: string;
  connectedAt: string;
  autoSync: boolean;
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
