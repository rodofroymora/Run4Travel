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
import { TabBar } from '../components/TabBar';
import type { RunClub } from '../domain/runClubs';
import {
  createRunClub,
  joinRunClub,
  listClubs,
} from '../services/runClubsStore';
import { colors, fonts, radii, spacing, type TabId } from '../theme';

type Props = {
  cityId?: string;
  cityName?: string;
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
};

export function ClubsScreen({
  cityId = 'barcelona',
  cityName = 'Barcelona',
  activeTab = 'Clubs',
  onTabChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const [clubs, setClubs] = useState<RunClub[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [whenLabel, setWhenLabel] = useState('Mañana · 07:00');
  const [meetingPoint, setMeetingPoint] = useState('');

  const refresh = useCallback(async () => {
    setClubs(await listClubs(cityId));
  }, [cityId]);

  useEffect(() => {
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
      >
        <Text style={styles.title}>Run Clubs</Text>
        <Text style={styles.subtitle}>
          Viajeros corriendo {cityName} · espontáneos y con alma
        </Text>

        {clubs.map((club) => (
          <View key={club.id} style={styles.card}>
            <Text style={styles.clubTitle}>{club.title}</Text>
            <Text style={styles.clubMeta}>
              {club.whenLabel} · {club.distanceKm}K · {club.paceRange}
            </Text>
            <Text style={styles.clubMeta}>
              {club.meetingPoint} · {club.runners} corredores
            </Text>
            <Pressable
              style={[styles.joinBtn, club.joined && styles.joinBtnOn]}
              disabled={club.joined}
              onPress={async () => {
                await joinRunClub(club.id);
                await refresh();
                Alert.alert('¡Molt bé!', `Te uniste a ${club.title}`);
              }}
            >
              <Text style={[styles.joinLabel, club.joined && styles.joinLabelOn]}>
                {club.joined ? 'Ya estás dentro' : 'Unirme'}
              </Text>
            </Pressable>
          </View>
        ))}

        {clubs.length === 0 ? (
          <Text style={styles.empty}>
            Aún no hay clubs aquí. Sé el primero en crear una corrida.
          </Text>
        ) : null}

        {creating ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Crear corrida</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre (ej. Sunrise Run)"
              placeholderTextColor={colors.secondaryText}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Cuándo"
              placeholderTextColor={colors.secondaryText}
              value={whenLabel}
              onChangeText={setWhenLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Punto de encuentro"
              placeholderTextColor={colors.secondaryText}
              value={meetingPoint}
              onChangeText={setMeetingPoint}
            />
            <Pressable
              style={styles.cta}
              onPress={async () => {
                if (!title.trim() || !meetingPoint.trim()) {
                  Alert.alert('Falta info', 'Pon nombre y punto de encuentro.');
                  return;
                }
                await createRunClub({
                  cityId,
                  cityName,
                  title: title.trim(),
                  whenLabel: whenLabel.trim() || 'Pronto',
                  distanceKm: 8,
                  paceRange: '5:15–5:45/km',
                  meetingPoint: meetingPoint.trim(),
                });
                setTitle('');
                setMeetingPoint('');
                setCreating(false);
                await refresh();
              }}
            >
              <Text style={styles.ctaLabel}>Publicar corrida</Text>
            </Pressable>
            <Pressable onPress={() => setCreating(false)}>
              <Text style={styles.cancel}>Cancelar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.cta} onPress={() => setCreating(true)}>
            <Text style={styles.ctaLabel}>✦ Crear una corrida</Text>
          </Pressable>
        )}
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
  title: {
    fontFamily: fonts.heading,
    fontSize: 32,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 16,
    ...radii.cardSoft,
  },
  clubTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
  },
  clubMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  joinBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.terracotta,
  },
  joinBtnOn: {
    backgroundColor: colors.borders,
  },
  joinLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
  joinLabelOn: {
    color: colors.ink,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondaryText,
    marginVertical: 12,
  },
  form: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 16,
    gap: 10,
    ...radii.cardOrganicAlt,
  },
  formTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borders,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.background,
  },
  cta: {
    backgroundColor: colors.terracotta,
    paddingVertical: 14,
    alignItems: 'center',
    ...radii.primaryButton,
  },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.white,
  },
  cancel: {
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
  },
});
