import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { MockMap } from '../components/MockMap';
import { canStartRun } from '../domain/offlinePack';
import { formatDistanceKm, formatDuration } from '../domain/geo';
import { getPlacesForCity } from '../data/places';
import { track } from '../services/analytics';
import { downloadOfflinePack, getOfflinePack } from '../services/offlinePackService';
import type { DiscoveryRoute, OfflinePackStatus, StoryPoint } from '../types/discovery';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  route: DiscoveryRoute;
  onBack: () => void;
  onStart: () => void;
};

export function RoutePreviewScreen({ route, onBack, onStart }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<StoryPoint | null>(null);
  const [showPhotos, setShowPhotos] = useState(true);
  const [pack, setPack] = useState<OfflinePackStatus | null>(null);
  const [downloading, setDownloading] = useState(false);

  const placeName = useCallback(
    (placeId: string) => {
      const places = getPlacesForCity(route.intent.cityId, route.intent.start);
      return places.find((p) => p.id === placeId)?.name ?? placeId;
    },
    [route],
  );

  useEffect(() => {
    track('route_preview_opened', { routeId: route.id });
    getOfflinePack(route.id).then(setPack);
  }, [route.id]);

  const markers = useMemo(() => {
    const story = route.storyPoints.map((sp) => {
      const place = getPlacesForCity(route.intent.cityId, route.intent.start).find(
        (p) => p.id === sp.placeId,
      );
      return place
        ? { id: sp.id, lat: place.lat, lng: place.lng, kind: 'story' as const }
        : null;
    });
    const photos = showPhotos
      ? route.photoSpots.map((ps) => ({
          id: ps.id,
          lat: ps.lat,
          lng: ps.lng,
          kind: 'photo' as const,
        }))
      : [];
    return [...story.filter(Boolean), ...photos] as {
      id: string;
      lat: number;
      lng: number;
      kind: 'story' | 'photo';
    }[];
  }, [route, showPhotos]);

  const ensurePackAndStart = async () => {
    track('run_start_tapped', { routeId: route.id });
    let current = pack ?? (await getOfflinePack(route.id));
    if (!canStartRun(current)) {
      if (!current || !current.ready) {
        setDownloading(true);
        try {
          current = await downloadOfflinePack(route.id, setPack);
        } catch {
          track('run_start_blocked_offline', { routeId: route.id });
          setDownloading(false);
          return;
        }
        setDownloading(false);
      }
    }
    if (!canStartRun(current)) {
      track('run_start_blocked_offline', { routeId: route.id });
      return;
    }
    onStart();
  };

  return (
    <BatlloBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>← Atrás</Text>
        </Pressable>

        <Text style={styles.title}>{route.name}</Text>
        <Text style={styles.meta}>
          {route.intent.cityName} · {formatDistanceKm(route.distanceM)} ·{' '}
          ~{formatDuration(route.estimatedMovingTimeSec)}
        </Text>

        <View style={styles.mapBlock}>
          <MockMap
            coordinates={route.geometry.coordinates}
            markers={markers}
            height={240}
            label={`${route.storyPoints.length} historias · ${route.photoSpots.length} foto spots`}
          />
        </View>

        <View style={styles.routeCard}>
          <Text style={styles.cardTag}>DISCOVERY RUN</Text>
          <Text style={styles.cardStat}>
            {formatDistanceKm(route.distanceM)} · {route.storyPoints.length} lugares
          </Text>
          <Pressable onPress={() => setShowPhotos((v) => !v)}>
            <Text style={styles.toggle}>
              Photo Spots: {showPhotos ? 'visibles' : 'ocultos'} · tocar para alternar
            </Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Story Points</Text>
        {route.storyPoints.map((sp) => (
          <Pressable
            key={sp.id}
            style={styles.storyCard}
            onPress={() => {
              setSelected(sp);
              track('story_point_opened', { placeId: sp.placeId });
            }}
          >
            <Text style={styles.storyName}>{placeName(sp.placeId)}</Text>
            <Text style={styles.storyDesc} numberOfLines={2}>
              {sp.shortDescription}
            </Text>
            <Text style={styles.storyDur}>
              Audio ~{sp.durationSec.standard}s · estándar
            </Text>
          </Pressable>
        ))}

        {selected ? (
          <View style={styles.detail}>
            <Text style={styles.detailTitle}>{placeName(selected.placeId)}</Text>
            <Text style={styles.detailBody}>{selected.storyVersions.standard}</Text>
            <Pressable onPress={() => setSelected(null)}>
              <Text style={styles.detailClose}>Cerrar</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.88 },
            downloading && { opacity: 0.7 },
          ]}
          onPress={ensurePackAndStart}
          disabled={downloading}
        >
          {downloading ? (
            <View style={styles.ctaRow}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.ctaLabel}>
                Descargando pack offline… {Math.round((pack?.progress ?? 0) * 100)}%
              </Text>
            </View>
          ) : (
            <Text style={styles.ctaLabel}>Empezar a correr</Text>
          )}
        </Pressable>
        {pack?.ready ? (
          <Text style={styles.ready}>Pack offline listo ✦</Text>
        ) : (
          <Text style={styles.readyHint}>
            Antes de START descargamos geometría, historias y mapa mínimo.
          </Text>
        )}
      </ScrollView>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 16,
  },
  mapBlock: { marginBottom: 14 },
  routeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 16,
    marginBottom: 20,
    ...radii.cardSoft,
  },
  cardTag: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.terracotta,
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardStat: {
    fontFamily: fonts.monoBold,
    fontSize: 16,
    color: colors.ink,
  },
  toggle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  section: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 10,
  },
  storyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 14,
    marginBottom: 10,
    ...radii.cardStat,
  },
  storyName: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 4,
  },
  storyDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
  },
  storyDur: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mediterraneanBlue,
  },
  detail: {
    backgroundColor: colors.ink,
    padding: 16,
    marginBottom: 16,
    ...radii.cardSoft,
  },
  detailTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.surface,
    marginBottom: 8,
  },
  detailBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,248,239,0.85)',
    marginBottom: 10,
  },
  detailClose: {
    fontFamily: fonts.bodySemi,
    color: colors.terracotta,
  },
  cta: {
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...radii.primaryButton,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
  ready: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.seaGreen,
  },
  readyHint: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
});
