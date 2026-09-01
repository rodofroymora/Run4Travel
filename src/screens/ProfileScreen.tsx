import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { Run4TravelMark } from '../components/Run4TravelLogo';
import { TabBar } from '../components/TabBar';
import { aggregateProfileStats, type ProfileStats } from '../domain/profileStats';
import { track } from '../services/analytics';
import { getUserProfile, saveUserProfile } from '../services/profileStore';
import { listCompletedRuns } from '../services/runSessionStore';
import { getStravaConnection } from '../services/stravaSync';
import type { StravaConnection } from '../types/strava';
import { colors, fonts, radii, spacing, type TabId } from '../theme';

type Props = {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  onCreateRoute?: () => void;
  onOpenStrava?: () => void;
  hasRecentSession?: boolean;
};

export function ProfileScreen({
  activeTab = 'Perfil',
  onTabChange,
  onCreateRoute,
  onOpenStrava,
  hasRecentSession,
}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('Marta');
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [strava, setStrava] = useState<StravaConnection | null>(null);

  const refresh = useCallback(async () => {
    const profile = await getUserProfile();
    setName(profile.displayName);
    const runs = await listCompletedRuns();
    setStats(aggregateProfileStats(runs));
    setStrava(await getStravaConnection());
  }, []);

  useEffect(() => {
    track('profile_viewed', {});
    void refresh();
  }, [refresh]);

  return (
    <BatlloBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Tu viaje</Text>
            {editing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.nameInput}
                autoFocus
              />
            ) : (
              <Text style={styles.title}>Hola, {name}</Text>
            )}
            <Text style={styles.subtitle}>
              {stats?.lastCityName
                ? `Última ciudad: ${stats.lastCityName}`
                : 'Aún no hay Discovery Runs completadas'}
            </Text>
          </View>
          <Run4TravelMark size={48} raster />
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: colors.seaGreen }]}>
            <Text style={styles.statValue}>{stats?.completedRuns ?? 0}</Text>
            <Text style={styles.statLabel}>runs</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.mosaicYellow }]}>
            <Text style={[styles.statValue, { color: colors.ink }]}>
              {stats?.totalDistanceKm ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.ink }]}>km</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.mediterraneanBlue }]}>
            <Text style={styles.statValue}>{stats?.cities ?? 0}</Text>
            <Text style={styles.statLabel}>ciudades</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Memorias</Text>
          <Text style={styles.cardValue}>
            {stats?.totalStories ?? 0} historias · {stats?.totalPhotos ?? 0} fotos
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Strava</Text>
          <Text style={styles.cardValue}>
            {strava
              ? `Conectado · ${strava.athleteName}${strava.mode === 'oauth' ? ' · OAuth' : ' · demo'}`
              : 'No conectado'}
          </Text>
          {hasRecentSession ? (
            <Pressable style={styles.linkBtn} onPress={onOpenStrava}>
              <Text style={styles.linkLabel}>Abrir sync Strava →</Text>
            </Pressable>
          ) : (
            <Text style={styles.hint}>Completa una carrera para sincronizar.</Text>
          )}
        </View>

        <Pressable
          style={styles.secondary}
          onPress={async () => {
            if (editing) {
              const saved = await saveUserProfile({ displayName: name });
              setName(saved.displayName);
              setEditing(false);
              track('profile_name_saved', {});
              Alert.alert('Guardado', `Listo, ${saved.displayName}.`);
            } else {
              setEditing(true);
            }
          }}
        >
          <Text style={styles.secondaryLabel}>
            {editing ? 'Guardar nombre' : 'Editar nombre'}
          </Text>
        </Pressable>

        <Pressable style={styles.cta} onPress={onCreateRoute}>
          <Text style={styles.ctaLabel}>✦ Crear ruta con IA</Text>
        </Pressable>
      </ScrollView>
      <TabBar active={activeTab} onChange={onTabChange} />
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  nameInput: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
    borderBottomWidth: 2,
    borderBottomColor: colors.terracotta,
    paddingVertical: 4,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondaryText,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    ...radii.cardStat,
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: 20,
    color: colors.white,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 16,
    ...radii.cardSoft,
  },
  cardLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.secondaryText,
    marginBottom: 6,
  },
  cardValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  hint: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  linkBtn: { marginTop: 10 },
  linkLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.terracotta,
  },
  secondary: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borders,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  cta: {
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    ...radii.primaryButton,
  },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
});
