export type RunClub = {
  id: string;
  cityId: string;
  cityName: string;
  title: string;
  whenLabel: string;
  distanceKm: number;
  paceRange: string;
  meetingPoint: string;
  runners: number;
  joined?: boolean;
};

export function joinClub(club: RunClub): RunClub {
  if (club.joined) return club;
  return { ...club, joined: true, runners: club.runners + 1 };
}

export function createClub(input: Omit<RunClub, 'id' | 'runners' | 'joined'>): RunClub {
  return {
    ...input,
    id: `club_${Date.now().toString(36)}`,
    runners: 1,
    joined: true,
  };
}
