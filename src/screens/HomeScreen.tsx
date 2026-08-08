import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BatlloBackground } from '../components/BatlloBackground';
import { CeramicScales } from '../components/CeramicScales';
import { TabBar } from '../components/TabBar';
import { TrencadisMark } from '../components/TrencadisMark';
import { getPlacesForCity } from '../data/places';
import type { DiscoveryRoute } from '../types/discovery';
import { colors, fonts, radii, spacing, type TabId } from '../theme';

type Props = {
  cityName?: string;
  onCreateRoute?: () => void;
  onStartRun?: () => void;
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  readyRoute?: DiscoveryRoute | null;
};

export function HomeScreen({
  cityName = 'Barcelona',
  onCreateRoute,
  onStartRun,
  activeTab = 'Hoy',
  onTabChange,
  readyRoute,
}: Props) {
  const insets = useSafeAreaInsets();
  const stories = readyRoute?.storyPoints.length ?? 14;
  const routeTitle = readyRoute?.name ?? 'Modernisme Loop';
  const distanceTag = readyRoute
    ? `${Math.round(readyRoute.distanceM / 1000)}K`
    : '10K';
  const pathLabel = readyRoute
    ? readyRoute.storyPoints
        .slice(0, 3)
        .map((sp) => {
          const p = getPlacesForCity(
            readyRoute.intent.cityId,
            readyRoute.intent.start,
          ).find((x) => x.id === sp.placeId);
          return p?.name ?? sp.placeId;
        })
        .join(' → ')
    : 'Casa Batlló → La Pedrera → Sagrada Família';

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
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Corre {cityName}</Text>
            <Text style={styles.subtitle}>
              {stories} historias te esperan hoy
            </Text>
          </View>
          <TrencadisMark size={40} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}
          onPress={onCreateRoute}
          accessibilityRole="button"
          accessibilityLabel="Crear ruta con IA"
        >
          <Text style={styles.heroGreeting}>Buenos días, Marta</Text>
          <Text style={styles.heroQuestion}>¿Qué ciudad corremos hoy?</Text>
          <View style={styles.heroBtn}>
            <Text style={styles.heroBtnLabel}>✦ Crear ruta con IA</Text>
          </View>
        </Pressable>

        <View style={styles.routeCard}>
          <CeramicScales />
          <Text style={styles.routeTag}>RUTA IA · {distanceTag}</Text>
          <Text style={styles.routeTitle}>{routeTitle}</Text>
          <Text style={styles.routePath}>{pathLabel}</Text>
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
            onPress={onStartRun}
            accessibilityRole="button"
            accessibilityLabel="Empezar a correr"
          >
            <View style={styles.playIcon}>
              <Svg width={12} height={12} viewBox="0 0 12 12">
                <Path d="M3 1.5v9l8-4.5-8-4.5Z" fill={colors.white} />
              </Svg>
            </View>
            <Text style={styles.startLabel}>
              {readyRoute ? 'Ver preview / Empezar' : 'Crear ruta primero'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.seaGreen }, radii.cardStat]}>
            <Text style={styles.statValue}>42.3</Text>
            <Text style={styles.statUnit}>km semana</Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: colors.mosaicYellow },
              {
                borderTopLeftRadius: 36,
                borderTopRightRadius: 28,
                borderBottomRightRadius: 40,
                borderBottomLeftRadius: 24,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.ink }]}>5:41</Text>
            <Text style={[styles.statUnit, { color: colors.ink }]}>ritmo /km</Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: colors.mediterraneanBlue },
              {
                borderTopLeftRadius: 24,
                borderTopRightRadius: 40,
                borderBottomRightRadius: 28,
                borderBottomLeftRadius: 36,
              },
            ]}
          >
            <Text style={styles.statValue}>7</Text>
            <Text style={styles.statUnit}>ciudades</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Run Clubs cerca</Text>
        <View style={styles.clubCard}>
          <View style={styles.clubAvatar}>
            <Text style={styles.clubAvatarLetter}>G</Text>
          </View>
          <View style={styles.clubInfo}>
            <Text style={styles.clubName}>Gràcia Morning Runners</Text>
            <Text style={styles.clubMeta}>Mañana 7:00 · 12 corredores</Text>
          </View>
          <Pressable hitSlop={8}>
            <Text style={styles.clubAction}>Unirme</Text>
          </Pressable>
        </View>
      </ScrollView>

      <TabBar active={activeTab} onChange={onTabChange} />
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 34,
    letterSpacing: -0.68,
    color: colors.ink,
    lineHeight: 38,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.secondaryText,
  },
  heroCta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    marginBottom: spacing.md,
    ...radii.cardOrganicAlt,
  },
  heroGreeting: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 6,
  },
  heroQuestion: {
    fontFamily: fonts.heading,
    fontSize: 24,
    letterSpacing: -0.48,
    color: colors.ink,
    marginBottom: 16,
  },
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.terracotta,
    paddingVertical: 12,
    paddingHorizontal: 18,
    ...radii.primaryButton,
  },
  heroBtnLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.white,
  },
  routeCard: {
    backgroundColor: colors.terracotta,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...radii.cardOrganic,
  },
  routeTag: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(255,248,239,0.85)',
    marginBottom: 8,
  },
  routeTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    letterSpacing: -0.56,
    color: colors.white,
    marginBottom: 8,
  },
  routePath: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,248,239,0.9)',
    marginBottom: 20,
  },
  startBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  playIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.white,
  },
  pressed: { opacity: 0.88 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  statChip: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    minHeight: 78,
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: 18,
    color: colors.white,
    marginBottom: 2,
  },
  statUnit: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    letterSpacing: -0.36,
    color: colors.ink,
    marginBottom: 12,
  },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 36,
    borderBottomRightRadius: 32,
    borderBottomLeftRadius: 40,
  },
  clubAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.seaGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubAvatarLetter: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.white,
  },
  clubInfo: { flex: 1 },
  clubName: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  clubMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  clubAction: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.terracotta,
  },
});
