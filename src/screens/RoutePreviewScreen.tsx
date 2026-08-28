import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { RouteMap } from '../components/RouteMap';
import { canStartRun } from '../domain/offlinePack';
import { formatDistanceKm, formatDuration } from '../domain/geo';
import { maxDiscountPct } from '../domain/partnerOffers';
import {
  buildPreviewMarkers,
  categoryLabelEs,
  estimateOfflinePackMb,
  PACK_STEP_LABELS,
} from '../domain/routePreview';
import { getPlacesForCity } from '../data/places';
import { track } from '../services/analytics';
import { downloadOfflinePack, getOfflinePack } from '../services/offlinePackService';
import { speakStory, stopStorySpeech, storyCacheKey } from '../services/storySpeech';
import type { DiscoveryRoute, OfflinePackStatus, StoryPoint } from '../types/discovery';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  route: DiscoveryRoute;
  onBack: () => void;
  onStart: () => void;
};

const CARD_WIDTH = 268;
const CARD_GAP = 12;

export function RoutePreviewScreen({ route, onBack, onStart }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<StoryPoint | null>(
    route.storyPoints[0] ?? null,
  );
  const [showPhotos, setShowPhotos] = useState(true);
  const [pack, setPack] = useState<OfflinePackStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const abortRef = useRef({ aborted: false });
  const listRef = useRef<FlatList<StoryPoint>>(null);

  const places = useMemo(
    () =>
      route.places?.length
        ? route.places
        : getPlacesForCity(route.intent.cityId, route.intent.start),
    [route],
  );

  const placeById = useCallback(
    (placeId: string) => places.find((p) => p.id === placeId),
    [places],
  );

  const placeName = useCallback(
    (placeId: string) =>
      placeById(placeId)?.name ??
      route.storyPoints.find((s) => s.placeId === placeId)?.placeName ??
      placeId,
    [placeById, route.storyPoints],
  );

  const packMb = useMemo(() => estimateOfflinePackMb(route), [route]);

  useEffect(() => {
    track('route_preview_opened', { routeId: route.id });
    if (route.partnerOffers?.length) {
      track('partner_offer_previewed', { n: route.partnerOffers.length });
    }
    getOfflinePack(route.id).then(setPack);
    return () => {
      stopStorySpeech();
    };
  }, [route.id, route.partnerOffers]);

  const playPodcastPreview = async () => {
    if (!selected) return;
    if (listening) {
      stopStorySpeech();
      setListening(false);
      return;
    }
    const text = selected.storyVersions.standard;
    const locale = route.intent.locale || 'es-ES';
    setListening(true);
    track('story_preview_listened', { placeId: selected.placeId });
    await speakStory({
      text,
      locale,
      cacheKey: storyCacheKey(selected.placeId, 'standard', locale, text),
      onDone: () => setListening(false),
      onError: () => setListening(false),
    });
  };

  const playIntroPreview = async () => {
    const intro = route.podcastIntro?.trim();
    if (!intro) return;
    if (listening) {
      stopStorySpeech();
      setListening(false);
      return;
    }
    const locale = route.intent.locale || 'es-ES';
    setListening(true);
    track('story_preview_listened', { placeId: 'intro' });
    await speakStory({
      text: intro,
      locale,
      cacheKey: storyCacheKey('route-intro', 'standard', locale, intro),
      onDone: () => setListening(false),
      onError: () => setListening(false),
    });
  };

  const markers = useMemo(
    () =>
      buildPreviewMarkers({
        storyPoints: route.storyPoints,
        photoSpots: route.photoSpots,
        resolvePlace: (id) => placeById(id),
        showPhotos,
      }),
    [route, showPhotos, placeById],
  );

  const scrollToStory = (index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
  };

  const selectStory = (sp: StoryPoint, index: number) => {
    setSelected(sp);
    track('story_point_opened', { placeId: sp.placeId });
    scrollToStory(index);
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0]?.item as StoryPoint | undefined;
      if (first) setSelected(first);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const ensurePackAndStart = async () => {
    track('run_start_tapped', { routeId: route.id });
    setDownloadError(null);
    let current = pack ?? (await getOfflinePack(route.id));

    if (!canStartRun(current)) {
      abortRef.current = { aborted: false };
      setDownloading(true);
      try {
        current = await downloadOfflinePack(route.id, {
          signal: abortRef.current,
          onProgress: setPack,
          route,
        });
      } catch (e) {
        track('run_start_blocked_offline', { routeId: route.id });
        setDownloadError(
          e instanceof Error ? e.message : 'No se pudo descargar el pack offline',
        );
        const partial = await getOfflinePack(route.id);
        setPack(partial);
        setDownloading(false);
        return;
      }
      setDownloading(false);
    }

    if (!canStartRun(current)) {
      track('run_start_blocked_offline', { routeId: route.id });
      setDownloadError('Pack offline incompleto. Completa la descarga para empezar.');
      return;
    }
    onStart();
  };

  const cancelDownload = () => {
    abortRef.current.aborted = true;
  };

  const ready = canStartRun(pack);

  return (
    <BatlloBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
          <Text style={styles.back}>← Atrás</Text>
        </Pressable>

        <Text style={styles.title}>{route.name}</Text>
        <Text style={styles.meta}>
          {route.intent.cityName} · estilo {route.intent.style}
        </Text>

        <View style={styles.mapBlock}>
          <RouteMap
            coordinates={route.geometry.coordinates}
            markers={markers}
            height={280}
            selectedMarkerId={selected?.id ?? null}
            label={`${route.storyPoints.length} historias · ${
              showPhotos ? route.photoSpots.length : 0
            } foto spots · Mapbox`}
          />
        </View>

        {/* Route Card Batlló */}
        <View style={styles.routeCard}>
          <Text style={styles.cardTag}>DISCOVERY RUN</Text>
          <Text style={styles.cardName}>{route.name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDistanceKm(route.distanceM)}</Text>
              <Text style={styles.statLabel}>Distancia</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{route.storyPoints.length}</Text>
              <Text style={styles.statLabel}>Lugares</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                ~{formatDuration(route.estimatedMovingTimeSec)}
              </Text>
              <Text style={styles.statLabel}>Tiempo est.</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.photoToggle, pressed && { opacity: 0.88 }]}
            onPress={() => setShowPhotos((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: showPhotos }}
            accessibilityLabel="Mostrar Photo Spots en el mapa"
          >
            <View
              style={[styles.toggleTrack, showPhotos && styles.toggleTrackOn]}
            >
              <View
                style={[styles.toggleThumb, showPhotos && styles.toggleThumbOn]}
              />
            </View>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Photo Spots</Text>
              <Text style={styles.toggleHint}>
                {showPhotos
                  ? `${route.photoSpots.length} visibles en el mapa`
                  : 'Ocultos — solo Story Points'}
              </Text>
            </View>
          </Pressable>
        </View>

        {(route.partnerOffers?.length ?? 0) > 0 ? (
          <View style={styles.offerPanel}>
            <Text style={styles.offerEyebrow}>CAFÉS PARTNER</Text>
            <Text style={styles.offerTitle}>
              Hasta −{maxDiscountPct(route.partnerOffers ?? [])}% al terminar
            </Text>
            <Text style={styles.offerHint}>
              Corre seguro. Los códigos se revelan en el resumen — no pares en la calzada.
            </Text>
            {(route.partnerOffers ?? []).slice(0, 4).map((o) => (
              <Text key={o.id} style={styles.offerRow}>
                {o.venueName} · {o.perk}
                {o.demo ? ' · demo' : ''}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Episodios ✦ (podcast)</Text>
          <Text style={styles.sectionHint}>Escucha antes de salir · se adaptan a tu ritmo</Text>
        </View>

        {route.podcastIntro ? (
          <Pressable
            style={({ pressed }) => [styles.listenBtn, { marginBottom: 12 }, pressed && styles.pressed]}
            onPress={() => void playIntroPreview()}
          >
            <Text style={styles.listenLabel}>
              {listening ? '■ Detener' : '▶ Escuchar intro del podcast'}
            </Text>
          </Pressable>
        ) : null}

        <FlatList
          ref={listRef}
          horizontal
          data={route.storyPoints}
          keyExtractor={(sp) => sp.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={() => undefined}
          renderItem={({ item: sp, index }) => {
            const place = placeById(sp.placeId);
            const active = selected?.id === sp.id;
            return (
              <Pressable
                style={[styles.storyCard, active && styles.storyCardActive]}
                onPress={() => selectStory(sp, index)}
                accessibilityRole="button"
                accessibilityLabel={`Story Point ${placeName(sp.placeId)}`}
              >
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIndex}>{index + 1}</Text>
                  <Text style={styles.photoCat}>
                    {categoryLabelEs(place?.category ?? 'landmark')}
                  </Text>
                </View>
                <Text style={styles.storyName} numberOfLines={1}>
                  {placeName(sp.placeId)}
                </Text>
                <Text style={styles.storyDesc} numberOfLines={2}>
                  {sp.shortDescription}
                </Text>
                <Text style={styles.storyDur}>
                  Podcast ~{sp.durationSec.standard}s · estándar
                  {sp.partnerOfferId ? ' · café partner' : ''}
                </Text>
              </Pressable>
            );
          }}
        />

        {selected ? (
          <View style={styles.detail}>
            <Text style={styles.detailEyebrow}>
              {categoryLabelEs(placeById(selected.placeId)?.category ?? 'landmark')} · ✦ podcast
            </Text>
            <Text style={styles.detailTitle}>{placeName(selected.placeId)}</Text>
            <Text style={styles.detailBody}>{selected.storyVersions.standard}</Text>
            <Text style={styles.detailMeta}>
              Episodio ~{selected.durationSec.standard}s · quick{' '}
              {selected.durationSec.quick}s · deep {selected.durationSec.deep}s
            </Text>
            <Pressable
              style={({ pressed }) => [styles.listenBtn, pressed && styles.pressed]}
              onPress={() => void playPodcastPreview()}
            >
              <Text style={styles.listenLabel}>
                {listening ? '■ Detener audio' : '▶ Escuchar episodio'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Offline pack panel */}
        <View style={styles.packPanel}>
          <Text style={styles.packTitle}>Pack offline</Text>
          <Text style={styles.packHint}>
            START solo con pack listo (geometría, historias y mapa).
            {packMb > 20 ? ` ~${packMb} MB` : ''}
          </Text>
          {(
            ['geometry', 'storiesText', 'audio', 'mapTiles'] as const
          ).map((step) => {
            const done = Boolean(pack?.[step]);
            return (
              <View key={step} style={styles.packStep}>
                <Text style={[styles.packCheck, done && styles.packCheckDone]}>
                  {done ? '✓' : '○'}
                </Text>
                <Text style={styles.packStepLabel}>{PACK_STEP_LABELS[step]}</Text>
                {step === 'audio' ? (
                  <Text style={styles.packOptional}>opcional</Text>
                ) : null}
              </View>
            );
          })}
          {downloading || (pack && pack.progress > 0 && !pack.ready) ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round((pack?.progress ?? 0) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {Math.round((pack?.progress ?? 0) * 100)}%
              </Text>
            </View>
          ) : null}
          {downloadError ? (
            <Text style={styles.errorText}>{downloadError}</Text>
          ) : null}
          {ready ? (
            <Text style={styles.ready}>Pack offline listo ✦</Text>
          ) : downloading ? (
            <Pressable onPress={cancelDownload} hitSlop={8}>
              <Text style={styles.cancelDownload}>
                Cancelar (simula pérdida de red)
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.readyHint}>
              Al tocar START descargamos el pack si aún no está listo.
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.88 },
            downloading && { opacity: 0.75 },
          ]}
          onPress={ensurePackAndStart}
          disabled={downloading}
          accessibilityRole="button"
          accessibilityLabel={
            ready ? 'Empezar a correr' : 'Descargar pack y empezar a correr'
          }
        >
          {downloading ? (
            <View style={styles.ctaRow}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.ctaLabel}>
                Descargando… {Math.round((pack?.progress ?? 0) * 100)}%
              </Text>
            </View>
          ) : (
            <Text style={styles.ctaLabel}>
              {ready ? 'Empezar a correr' : 'Descargar y empezar'}
            </Text>
          )}
        </Pressable>
      </View>
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
  offerPanel: {
    backgroundColor: colors.ink,
    padding: 16,
    marginBottom: 18,
    ...radii.cardSoft,
  },
  offerEyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.mosaicYellow,
    marginBottom: 6,
  },
  offerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.surface,
    marginBottom: 6,
  },
  offerHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,248,239,0.7)',
    marginBottom: 10,
    lineHeight: 18,
  },
  offerRow: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,248,239,0.88)',
    marginBottom: 4,
  },
  cardTag: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.terracotta,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardName: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.secondaryText,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borders,
  },
  photoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borders,
    paddingTop: 12,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.borders,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 3,
  },
  toggleTrackOn: {
    backgroundColor: colors.mediterraneanBlue,
    justifyContent: 'flex-end',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  toggleThumbOn: {},
  toggleCopy: { flex: 1 },
  toggleTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  toggleHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  section: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
  },
  sectionHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  carousel: {
    paddingRight: spacing.lg,
    gap: CARD_GAP,
    marginBottom: 14,
  },
  storyCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 12,
    ...radii.cardStat,
  },
  storyCardActive: {
    borderColor: colors.terracotta,
    borderWidth: 2,
  },
  photoPlaceholder: {
    height: 88,
    backgroundColor: colors.ink,
    marginBottom: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 30,
    padding: 12,
    justifyContent: 'space-between',
  },
  photoIndex: {
    fontFamily: fonts.monoBold,
    fontSize: 18,
    color: colors.mosaicYellow,
  },
  photoCat: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: 'rgba(255,248,239,0.7)',
    letterSpacing: 0.4,
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
    minHeight: 36,
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
  detailEyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.mosaicYellow,
    letterSpacing: 0.6,
    marginBottom: 6,
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
    lineHeight: 20,
  },
  detailMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,248,239,0.55)',
  },
  listenBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.terracotta,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  listenLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
  },
  pressed: { opacity: 0.88 },
  packPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 16,
    marginBottom: 8,
    ...radii.cardStat,
  },
  packTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 4,
  },
  packHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 12,
  },
  packStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  packCheck: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    color: colors.borders,
    width: 18,
  },
  packCheckDone: { color: colors.seaGreen },
  packStepLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  packOptional: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.secondaryText,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.borders,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.terracotta,
    borderRadius: 999,
  },
  progressLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.ink,
    width: 36,
    textAlign: 'right',
  },
  errorText: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.terracotta,
  },
  cancelDownload: {
    marginTop: 10,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.secondaryText,
    textDecorationLine: 'underline',
  },
  ready: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.seaGreen,
  },
  readyHint: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    backgroundColor: 'rgba(246,239,227,0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.borders,
  },
  cta: {
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    ...radii.primaryButton,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
});
