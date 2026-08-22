import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@r4t/profile';

export type UserProfile = {
  displayName: string;
  updatedAt: string;
};

const DEFAULT: UserProfile = {
  displayName: 'Marta',
  updatedAt: new Date(0).toISOString(),
};

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as UserProfile) };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveUserProfile(
  patch: Partial<Pick<UserProfile, 'displayName'>>,
): Promise<UserProfile> {
  const current = await getUserProfile();
  const next: UserProfile = {
    ...current,
    ...patch,
    displayName: (patch.displayName ?? current.displayName).trim() || 'Marta',
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
