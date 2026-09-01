import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BatlloBackground } from '../components/BatlloBackground';
import { BatlloButton } from '../components/BatlloButton';
import { CeramicScales } from '../components/CeramicScales';
import { OrganicCard } from '../components/OrganicCard';
import { RouteMap } from '../components/RouteMap';
import { Run4TravelMark } from '../components/Run4TravelLogo';
import { StatMedal } from '../components/StatMedal';
import { TabBar } from '../components/TabBar';
import { getPlacesForCity } from '../data/places';
import type { DiscoveryRoute } from '../types/discovery';
import { colors, fonts, spacing, type TabId } from '../theme';
import { motion } from '../theme/motion';

type Props = {
  cityName?: string;
  onCreateRoute?: () => void;
  onStartRun?: () => void;
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  readyRoute?: DiscoveryRoute | null;
};

function greetingForHour(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function HomeScreen({
  cityName = 'Barcelona',
  onCreateRoute,
  onStartRun,
  activeTab = 'Hoy',
  onTabChange,
  readyRoute,
}: Props) {
  const insets = useSafeAreaInsets();
  const stories = readyRoute?.storyPoints.length ?? 0;
  const routeTitle = readyRoute?.name ?? 'Tu próxima Discovery Run';
  const distanceTag = readyRoute
    ? `${Math.round(readyRoute.distanceM / 1000)}K`
    : '—';
  const pathLabel = readyRoute
    ? readyRoute.storyPoints
        .slice(0, 3)
        .map((sp) => {
          const p =
            readyRoute.places?.find((x) => x.id === sp.placeId) ??
            getPlacesForCity(
              readyRoute.intent.cityId,
              readyRoute.intent.start,
            ).find((x) => x.id === sp.placeId);
          return p?.name ?? sp.placeName ?? sp.placeId;
        })
        .join(' → ')
    : 'Elige ciudad · distancia · estilo — ✦ hace el resto';

  const mapMarkers = useMemo(() => {
    if (!readyRoute) return [];
    const places =
      readyRoute.places ??
      getPlacesForCity(readyRoute.intent.cityId, readyRoute.intent.start);
    return readyRoute.storyPoints.slice(0, 8).flatMap((sp) => {
      const p = places.find((x) => x.id === sp.placeId);
      return p ? [{ id: sp.id, lng: p.lng, lat: p.lat, kind: 'story' as const }] : [];
    });
  }, [readyRoute]);

  const enter = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    Animated.stagger(
      motion.enterStaggerMs,
      enter.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: motion.enterMs,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [enter]);

  const block = (i: number) => ({
    opacity: enter[i]!,
    transform: [
      {
        translateY: enter[i]!.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  });

  return (
    <BatlloBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, block(0)]}>
          <View style={styles.headerText}>
            <View style={styles.brandRow}>
              <Run4TravelMark size={36} raster />
              <Text style={styles.brand}>Run4Travel</Text>
            </View>
            <Text style={styles.title}>Corre {cityName}</Text>
            <Text style={styles.subtitle}>
              {readyRoute
                ? `${stories} episodios listos · la ciudad te habla al pasar`
                : 'Corres una ciudad. Ella te habla.'}
            </Text>
          </View>
        </Animated.View>

        {/* Hero composition — one scene */}
        <Animated.View style={block(1)}>
          <OrganicCard tone="surface" shape="organicAlt" style={styles.hero}>
            <View style={styles.heroMap}>
              {readyRoute && readyRoute.geometry.coordinates.length >= 2 ? (
                <RouteMap
                  coordinates={readyRoute.geometry.coordinates}
                  markers={mapMarkers}
                  height={168}
                  showLegend={false}
                  interactive={false}
                  label=""
                />
              ) : (
                <LinearGradient
                  colors={['#3d5a80', '#2a9d8f', '#e2603c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroGradient}
                >
                  <CeramicScales rows={5} cols={7} />
                  <Text style={styles.heroMapHint}>✦ Tu mapa aparecerá aquí</Text>
                </LinearGradient>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(255,248,239,0.92)', colors.surface]}
                locations={[0, 0.55, 1]}
                style={styles.heroFade}
                pointerEvents="none"
              />
            </View>

            <View style={styles.heroBody}>
              <Text style={styles.heroGreeting}>{greetingForHour()}, Marta</Text>
              <Text style={styles.heroQuestion}>
                {readyRoute
                  ? '¿Seguimos explorando?'
                  : '¿Qué ciudad corremos hoy?'}
              </Text>
              <BatlloButton
                label={readyRoute ? '✦ Nueva ruta' : '✦ Crear ruta con IA'}
                size="lg"
                onPress={onCreateRoute}
                accessibilityLabel="Crear ruta con IA"
              />
            </View>
          </OrganicCard>
        </Animated.View>

        {/* Route orb */}
        <Animated.View style={block(2)}>
          <OrganicCard tone="terracotta" shape="organic" style={styles.routeOrb}>
            <CeramicScales />
            <View style={styles.routeOrbInner}>
              <View style={styles.routeTop}>
                <Text style={styles.routeTag}>
                  {readyRoute ? `RUTA ✦ · ${distanceTag}` : 'LISTA PARA CREAR'}
                </Text>
                <View style={styles.playOrb}>
                  <Svg width={14} height={14} viewBox="0 0 12 12">
                    <Path d="M3 1.5v9l8-4.5-8-4.5Z" fill={colors.terracotta} />
                  </Svg>
                </View>
              </View>
              <Text style={styles.routeTitle}>{routeTitle}</Text>
              <Text style={styles.routePath}>{pathLabel}</Text>
              <BatlloButton
                label={readyRoute ? 'Ver preview / Empezar' : 'Crear ruta primero'}
                variant="ink"
                size="lg"
                onPress={readyRoute ? onStartRun : onCreateRoute}
                leading={
                  <View style={styles.playIcon}>
                    <Svg width={11} height={11} viewBox="0 0 12 12">
                      <Path d="M3 1.5v9l8-4.5-8-4.5Z" fill={colors.white} />
                    </Svg>
                  </View>
                }
                accessibilityLabel="Empezar a correr"
              />
            </View>
          </OrganicCard>
        </Animated.View>

        {/* Medal stats */}
        <Animated.View style={[styles.statsRow, block(3)]}>
          <StatMedal value="42.3" unit="km semana" tone="sea" />
          <StatMedal value="5:41" unit="ritmo /km" tone="yellow" />
          <StatMedal value="7" unit="ciudades" tone="blue" />
        </Animated.View>
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
    marginBottom: spacing.md,
  },
  headerText: { flex: 1 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  brand: {
    fontFamily: fonts.heading,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 36,
    letterSpacing: -0.72,
    color: colors.ink,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.secondaryText,
  },
  hero: {
    marginBottom: spacing.md,
    paddingBottom: 20,
  },
  heroMap: {
    height: 168,
    marginBottom: 4,
    overflow: 'hidden',
  },
  heroGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMapHint: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: 'rgba(255,248,239,0.95)',
    zIndex: 1,
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
  },
  heroBody: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 6,
  },
  heroGreeting: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
  },
  heroQuestion: {
    fontFamily: fonts.heading,
    fontSize: 26,
    letterSpacing: -0.52,
    color: colors.ink,
    marginBottom: 10,
    lineHeight: 30,
  },
  routeOrb: {
    marginBottom: spacing.md,
  },
  routeOrbInner: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
  },
  routeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  routeTag: {
    fontFamily: fonts.metric,
    fontSize: 12,
    letterSpacing: 0.6,
    color: 'rgba(255,248,239,0.85)',
  },
  playOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 18,
  },
  playIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
});
