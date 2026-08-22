import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClub, joinClub, type RunClub } from '../domain/runClubs';
import { track } from './analytics';

const KEY = '@r4t/run_clubs';

const SEED: RunClub[] = [
  {
    id: 'club_gracia',
    cityId: 'barcelona',
    cityName: 'Barcelona',
    title: 'Gràcia Morning Runners',
    whenLabel: 'Mañana · 07:00',
    distanceKm: 8,
    paceRange: '5:15–5:45/km',
    meetingPoint: 'Plaça de la Virreina',
    runners: 12,
  },
  {
    id: 'club_sunrise',
    cityId: 'barcelona',
    cityName: 'Barcelona',
    title: 'Barcelona Sunrise Run',
    whenLabel: 'Domingo · 07:00',
    distanceKm: 10,
    paceRange: '5:00–5:30/km',
    meetingPoint: 'Barceloneta',
    runners: 6,
  },
  {
    id: 'club_roma',
    cityId: 'roma',
    cityName: 'Roma',
    title: 'Colosseo Easy 5K',
    whenLabel: 'Hoy · 18:30',
    distanceKm: 5,
    paceRange: '6:00–6:30/km',
    meetingPoint: 'Colosseo',
    runners: 4,
  },
];

async function readAll(): Promise<RunClub[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as RunClub[];
  } catch {
    /* seed */
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
}

async function writeAll(clubs: RunClub[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(clubs));
}

export async function listClubs(cityId?: string): Promise<RunClub[]> {
  const all = await readAll();
  track('clubs_viewed', { cityId: cityId ?? 'all' });
  if (!cityId) return all;
  return all.filter((c) => c.cityId === cityId);
}

export async function joinRunClub(clubId: string): Promise<RunClub | null> {
  const all = await readAll();
  const idx = all.findIndex((c) => c.id === clubId);
  if (idx < 0) return null;
  const next = joinClub(all[idx]);
  all[idx] = next;
  await writeAll(all);
  track('club_joined', { clubId });
  return next;
}

export async function createRunClub(input: {
  cityId: string;
  cityName: string;
  title: string;
  whenLabel: string;
  distanceKm: number;
  paceRange: string;
  meetingPoint: string;
}): Promise<RunClub> {
  const all = await readAll();
  const club = createClub(input);
  all.unshift(club);
  await writeAll(all);
  track('club_created', { clubId: club.id, cityId: club.cityId });
  return club;
}
