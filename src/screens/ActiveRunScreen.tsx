import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { RouteMap } from '../components/RouteMap';
import { PaceChart } from '../components/PaceChart';
import { getPlacesForCity } from '../data/places';
import { formatDistanceKm, formatDuration, formatPace, haversineM } from '../domain/geo';
import { evaluatePhotoSafety } from '../domain/photoSafety';
import { unlockOffers } from '../domain/partnerOffers';
import {
  computeAvgPaceSecPerKm,
  computePartialSplit,
  computeSplitsKm,
  currentPaceSecPerKm,
  distanceFromSamples,
  splitsToChartBars,
} from '../domain/runMetrics';
import {
  selectStoryVersion,
  shouldTriggerStory,
  startBeforeArrivalM,
} from '../domain/storyVersion';
import { track } from '../services/analytics';
import { duckMusic, resumeMusic } from '../services/musicDuck';
import { createRunGpsStreamer } from '../services/runGps';
import type { GpsStreamer, GpsSource } from '../services/gpsTypes';
import { captureRunPhoto } from '../services/runCamera';
import { speakStory, stopStorySpeech, storyCacheKey } from '../services/storySpeech';
import { saveRunSession } from '../services/runSessionStore';
import type { DiscoveryRoute, StoryVersionKey } from '../types/discovery';
import type { GpsSample, RunPhoto, RunSession } from '../types/run';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  route: DiscoveryRoute;
  onFinished: (session: RunSession) => void;
  onDiscard: () => void;
};

type Banner =
  | { kind: 'intro'; text: string }
  | { kind: 'story'; text: string; version: StoryVersionKey; storyPointId: string }
  | { kind: 'photo'; text: string; photoSpotId: string; placeName: string }
  | null;

export function ActiveRunScreen({ route, onFinished, onDiscard }: Props) {
  const insets = useSafeAreaInsets();
  const places = useMemo(
    () =>
      route.places?.length
        ? route.places
        : getPlacesForCity(route.intent.cityId, route.intent.start),
    [route],
  );

  const sessionRef = useRef<RunSession>({
    id: `run_${Date.now().toString(36)}`,
    routeId: route.id,
    routeName: route.name,
    cityName: route.intent.cityName,
    cityId: route.intent.cityId,
    startedAt: new Date().toISOString(),
    status: 'active',
    samples: [],
    splitsKm: [],
    distanceM: 0,
    durationSec: 0,
    movingTimeSec: 0,
    avgPaceSecPerKm: 0,
    storyEvents: [],
    photos: [],
    narrationAdaptations: 0,
    nextStoryIndex: 0,
    unlockedOfferIds: [],
  });

  const [samples, setSamples] = useState<GpsSample[]>([]);
  const [paused, setPaused] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [tick, setTick] = useState(0);
  const promptedPhotos = useRef(new Set<string>());
  const playedStories = useRef(new Set<string>());
  const lastVersion = useRef<StoryVersionKey | null>(null);
  const streamerRef = useRef<GpsStreamer | null>(null);
  const [gpsSource, setGpsSource] = useState<GpsSource>('demo');
  const [gpsHint, setGpsHint] = useState<string | null>(null);
  const [forceDemo, setForceDemo] = useState(false);
  const [hasReplay, setHasReplay] = useState(false);
  const introPlayed = useRef(false);
  const lastSpoken = useRef<{
    text: string;
    cacheKey: string;
    kind: 'intro' | 'story';
    version?: StoryVersionKey;
    storyPointId?: string;
  } | null>(null);
  const startMs = useRef(Date.now());
  const pausedAccumMs = useRef(0);
  const pauseStarted = useRef<number | null>(null);

  const persist = useCallback(async (partial?: Partial<RunSession>) => {
    const s = { ...sessionRef.current, ...partial };
    sessionRef.current = s;
    await saveRunSession(s);
  }, []);

  const onSample = useCallback(
    (sample: GpsSample) => {
      setSamples((prev) => {
        const next = [...prev, sample];
        const distanceM = distanceFromSamples(next);
        const movingTimeSec = Math.max(1, (next[next.length - 1].t - next[0].t) / 1000);
        const avgPaceSecPerKm = computeAvgPaceSecPerKm(distanceM, movingTimeSec);
        const splitsKm = computeSplitsKm(next);
        sessionRef.current = {
          ...sessionRef.current,
          samples: next,
          distanceM,
          movingTimeSec,
          avgPaceSecPerKm,
          splitsKm,
          durationSec: Math.floor(
            (Date.now() - startMs.current - pausedAccumMs.current) / 1000,
          ),
        };
        void persist();
        return next;
      });
      setTick((t) => t + 1);
    },
    [persist],
  );

  // Reloj de duración: actualiza métricas aunque el GPS tarde entre samples
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      sessionRef.current = {
        ...sessionRef.current,
        durationSec: Math.floor(
          (Date.now() - startMs.current - pausedAccumMs.current) / 1000,
        ),
      };
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    track('run_started', { routeId: route.id });
    setSamples([]);
    setTick(0);

    void (async () => {
      const resolved = await createRunGpsStreamer({
        coords: route.geometry.coordinates,
        forceDemo,
        paceSecPerKm: 330,
      });
      if (cancelled) {
        resolved.streamer.stop();
        return;
      }
      streamerRef.current?.stop();
      streamerRef.current = resolved.streamer;
      setGpsSource(resolved.source);
      if (resolved.source === 'demo') {
        const reason = resolved.fallbackReason ?? 'demo';
        setGpsHint(
          reason === 'web_uses_demo'
            ? 'Web: GPS demo a lo largo de la ruta'
            : reason === 'permission_denied'
              ? 'Sin permiso de ubicación · GPS demo'
              : reason === 'location_services_off'
                ? 'Ubicación desactivada · GPS demo'
                : reason === 'force_demo'
                  ? 'GPS demo (manual)'
                  : 'GPS demo · offline-first',
        );
        track('run_gps_source', { source: 'demo', reason });
      } else {
        setGpsHint('GPS del dispositivo');
        track('run_gps_source', { source: 'device' });
      }
      resolved.streamer.start(onSample);
      void persist();
    })();

    return () => {
      cancelled = true;
      stopStorySpeech();
      streamerRef.current?.stop();
      streamerRef.current = null;
    };
  }, [route, onSample, persist, forceDemo]);

  // Podcast intro at run start
  useEffect(() => {
    if (introPlayed.current) return;
    const intro = route.podcastIntro?.trim();
    if (!intro) return;
    introPlayed.current = true;
    const locale = route.intent.locale || 'es-ES';
    const cacheKey = storyCacheKey('route-intro', 'standard', locale, intro);
    lastSpoken.current = { text: intro, cacheKey, kind: 'intro' };
    setHasReplay(true);
    void duckMusic();
    setBanner({ kind: 'intro', text: '✦ Intro · Discovery Run' });
    track('story_played', { storyPointId: 'intro', version: 'standard', format: 'podcast_intro' });
    void speakStory({
      text: intro,
      locale,
      cacheKey,
      onDone: () => {
        void resumeMusic();
        setBanner((b) => (b?.kind === 'intro' ? null : b));
      },
    });
  }, [route]);

  const skipAudio = useCallback(() => {
    stopStorySpeech();
    void resumeMusic();
    setBanner(null);
    track('story_tts_skipped', { reason: 'user_skip' });
  }, []);

  const replayAudio = useCallback(() => {
    const last = lastSpoken.current;
    if (!last) return;
    stopStorySpeech();
    const locale = route.intent.locale || 'es-ES';
    void duckMusic();
    if (last.kind === 'intro') {
      setBanner({ kind: 'intro', text: '✦ Intro · Discovery Run' });
    } else if (last.storyPointId && last.version) {
      setBanner({
        kind: 'story',
        text: `✦ Podcast · replay`,
        version: last.version,
        storyPointId: last.storyPointId,
      });
    }
    track('story_played', {
      storyPointId: last.storyPointId ?? 'intro',
      version: last.version ?? 'standard',
      format: 'podcast_replay',
    });
    void speakStory({
      text: last.text,
      locale,
      cacheKey: last.cacheKey,
      onDone: () => {
        void resumeMusic();
        setBanner(null);
      },
    });
  }, [route.intent.locale]);

  const userPos = samples[samples.length - 1];
  const pace = currentPaceSecPerKm(samples) || sessionRef.current.avgPaceSecPerKm || 330;
  const liveBars = useMemo(
    () =>
      splitsToChartBars(sessionRef.current.splitsKm, {
        partial: computePartialSplit(samples),
        maxBars: 10,
      }),
    // tick forces recompute while sessionRef mutates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, samples],
  );

  // Story + photo triggers
  useEffect(() => {
    if (paused || !userPos) return;

    const idx = sessionRef.current.nextStoryIndex;
    const sp = route.storyPoints[idx];
    if (sp && !playedStories.current.has(sp.id)) {
      const place = places.find((p) => p.id === sp.placeId);
      if (place) {
        const dist = haversineM(userPos, place);
        const { version, reason } = selectStoryVersion({
          distanceToPointM: dist,
          paceSecPerKm: pace,
          durations: sp.durationSec,
        });
        const lead = startBeforeArrivalM(sp.durationSec[version], pace);
        if (shouldTriggerStory(dist, lead)) {
          track('story_triggered', { storyPointId: sp.id });
          track('story_version_selected', { version, reason });
          if (lastVersion.current && lastVersion.current !== version) {
            sessionRef.current.narrationAdaptations += 1;
          }
          lastVersion.current = version;
          playedStories.current.add(sp.id);
          void duckMusic();
          setBanner({
            kind: 'story',
            text: `✦ Podcast · ${place.name}`,
            version,
            storyPointId: sp.id,
          });
          sessionRef.current.storyEvents.push({
            storyPointId: sp.id,
            version,
            at: new Date().toISOString(),
          });
          sessionRef.current.nextStoryIndex = idx + 1;
          void persist();
          track('story_played', { storyPointId: sp.id, version, format: 'podcast' });
          const spoken = sp.storyVersions[version];
          const locale = route.intent.locale || 'es-ES';
          const cacheKey = storyCacheKey(sp.placeId, version, locale, spoken);
          lastSpoken.current = {
            text: spoken,
            cacheKey,
            kind: 'story',
            version,
            storyPointId: sp.id,
          };
          setHasReplay(true);
          void speakStory({
            text: spoken,
            locale,
            cacheKey,
            onDone: () => {
              void resumeMusic();
              setBanner((b) => (b?.kind === 'story' ? null : b));
            },
          });
        }
      }
    }

    for (const ps of route.photoSpots) {
      if (promptedPhotos.current.has(ps.id)) continue;
      const dist = haversineM(userPos, ps);
      const decision = evaluatePhotoSafety({
        distanceToSpotM: dist,
        speedMps: userPos.speed ?? 2.8,
        accuracyM: userPos.acc,
        nearCrossing: false,
        alreadyPrompted: false,
      });
      if (decision.action === 'show') {
        promptedPhotos.current.add(ps.id);
        const place = places.find((p) => p.id === ps.placeId);
        track('photo_spot_impressed', { photoSpotId: ps.id });
        setBanner({
          kind: 'photo',
          text: `📸 Photo Spot · ${place?.name ?? 'lugar'} · ${Math.round(dist)} m`,
          photoSpotId: ps.id,
          placeName: place?.name ?? 'lugar',
        });
      } else if (decision.action === 'defer') {
        track('photo_spot_deferred_safety', { reason: decision.reason });
      }
    }
  }, [tick, paused, userPos, route, places, pace, persist]);

  const markers = useMemo(() => {
    const list: { id: string; lat: number; lng: number; kind: 'story' | 'photo' | 'user' }[] = [];
    for (const sp of route.storyPoints) {
      const p = places.find((x) => x.id === sp.placeId);
      if (p) list.push({ id: sp.id, lat: p.lat, lng: p.lng, kind: 'story' });
    }
    if (userPos) {
      list.push({ id: 'user', lat: userPos.lat, lng: userPos.lng, kind: 'user' });
    }
    return list;
  }, [route, places, userPos]);

  const nextPlace = useMemo(() => {
    const sp = route.storyPoints[sessionRef.current.nextStoryIndex];
    if (!sp) return null;
    const p = places.find((x) => x.id === sp.placeId);
    if (!p || !userPos) return null;
    return { name: p.name, dist: haversineM(userPos, p) };
  }, [route, places, userPos, tick]);

  const togglePause = () => {
    if (paused) {
      if (pauseStarted.current) {
        pausedAccumMs.current += Date.now() - pauseStarted.current;
        pauseStarted.current = null;
      }
      setPaused(false);
      sessionRef.current.status = 'active';
      streamerRef.current?.resume(onSample);
    } else {
      pauseStarted.current = Date.now();
      setPaused(true);
      sessionRef.current.status = 'paused';
      streamerRef.current?.pause();
      stopStorySpeech();
      void resumeMusic();
    }
    void persist();
  };

  const finish = () => {
    stopStorySpeech();
    streamerRef.current?.stop();
    const heard = sessionRef.current.storyEvents.map((e) => e.storyPointId);
    const unlocked = unlockOffers({
      offers: route.partnerOffers ?? [],
      storyPoints: route.storyPoints,
      heardStoryPointIds: heard,
      cafeRoute: route.intent.style === 'cafes',
    });
    for (const o of unlocked) {
      track('partner_offer_unlocked', { offerId: o.id, demo: o.demo ? 1 : 0 });
    }
    const finished: RunSession = {
      ...sessionRef.current,
      status: 'completed',
      finishedAt: new Date().toISOString(),
      durationSec: Math.floor(
        (Date.now() - startMs.current - pausedAccumMs.current) / 1000,
      ),
      unlockedOfferIds: unlocked.map((o) => o.id),
    };
    sessionRef.current = finished;
    void persist(finished);
    track('run_completed', {
      runId: finished.id,
      distanceM: Math.round(finished.distanceM),
      stories: finished.storyEvents.length,
    });
    onFinished(finished);
  };

  const capturePhoto = () => {
    if (!banner || banner.kind !== 'photo') return;
    const spotId = banner.photoSpotId;
    void (async () => {
      const result = await captureRunPhoto();
      if (!result.ok) {
        if (result.reason !== 'cancelled') {
          Alert.alert(
            'No pudimos abrir la cámara',
            'Revisa permisos o elige una foto de la galería más tarde.',
          );
        }
        return;
      }
      const photo: RunPhoto = {
        id: `ph_${Date.now().toString(36)}`,
        runId: sessionRef.current.id,
        photoSpotId: spotId,
        uri: result.uri,
        lat: userPos?.lat,
        lng: userPos?.lng,
        takenAt: new Date().toISOString(),
        source: result.source,
      };
      sessionRef.current.photos.push(photo);
      void persist();
      track('photo_spot_captured', { photoSpotId: spotId, source: result.source });
      setBanner(null);
    })();
  };

  const s = sessionRef.current;

  return (
    <BatlloBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Text style={styles.live}>
              {paused
                ? 'PAUSA'
                : gpsSource === 'device'
                  ? 'EN CURSO · GPS'
                  : 'EN CURSO · DEMO'}
            </Text>
            <Pressable
              onPress={() =>
                Alert.alert('¿Descartar carrera?', 'Se perderá el progreso demo.', [
                  { text: 'Seguir', style: 'cancel' },
                  {
                    text: 'Descartar',
                    style: 'destructive',
                    onPress: () => {
                      streamerRef.current?.stop();
                      track('run_discarded', { runId: s.id });
                      onDiscard();
                    },
                  },
                ])
              }
            >
              <Text style={styles.discard}>Salir</Text>
            </Pressable>
          </View>

          <RouteMap
            coordinates={route.geometry.coordinates}
            markers={markers}
            height={180}
            label={nextPlace ? `Próximo: ${nextPlace.name} · ${Math.round(nextPlace.dist)} m` : 'Meta cercana'}
            followUser={Boolean(userPos)}
          />

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatDistanceKm(s.distanceM)}</Text>
              <Text style={styles.metricLabel}>distancia</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatDuration(s.durationSec || 0)}</Text>
              <Text style={styles.metricLabel}>tiempo</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatPace(pace)}</Text>
              <Text style={styles.metricLabel}>ritmo</Text>
            </View>
          </View>

          <View style={styles.secondaryMetrics}>
            <Text style={styles.secondaryMetric}>
              media {formatPace(s.avgPaceSecPerKm || pace)}
            </Text>
            <Text style={styles.secondaryMetric}>
              {s.splitsKm.length} km · {s.storyEvents.length} ✦ · {s.photos.length} 📸
            </Text>
            {userPos?.speed != null && userPos.speed > 0 ? (
              <Text style={styles.secondaryMetric}>
                {(userPos.speed * 3.6).toFixed(1)} km/h
              </Text>
            ) : null}
          </View>

          <PaceChart
            live
            title="Ritmo por tramo"
            subtitle={
              s.splitsKm.length
                ? `${s.splitsKm.length} km completados · media ${formatPace(s.avgPaceSecPerKm)}`
                : `Offline-first · crece al completar cada km · ${formatDistanceKm(s.distanceM)}`
            }
            bars={liveBars}
            emptyLabel="Corre el primer km — las barras aparecen en vivo"
          />

          {banner ? (
            <View style={[styles.banner, banner.kind === 'photo' && styles.bannerPhoto]}>
              <Text style={styles.bannerText}>{banner.text}</Text>
              {banner.kind === 'intro' || banner.kind === 'story' ? (
                <>
                  {banner.kind === 'story' ? (
                    <>
                      <Text style={styles.bannerMeta}>
                        Escuchando episodio · {banner.version} · ~
                        {route.storyPoints.find((sp) => sp.id === banner.storyPointId)?.durationSec[
                          banner.version
                        ] ?? '—'}
                        s
                      </Text>
                      <Text style={styles.bannerTranscript} numberOfLines={4}>
                        {route.storyPoints.find((sp) => sp.id === banner.storyPointId)?.storyVersions[
                          banner.version
                        ] ?? ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.bannerMeta}>Intro del podcast · puedes saltar o repetir</Text>
                  )}
                  <View style={styles.bannerActions}>
                    <Pressable style={styles.bannerBtnGhost} onPress={skipAudio}>
                      <Text style={styles.bannerBtnGhostLabel}>Saltar</Text>
                    </Pressable>
                    <Pressable style={styles.bannerBtn} onPress={replayAudio}>
                      <Text style={styles.bannerBtnLabel}>Replay</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.bannerActions}>
                  <Pressable style={styles.bannerBtn} onPress={capturePhoto}>
                    <Text style={styles.bannerBtnLabel}>Capturar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.bannerBtnGhost}
                    onPress={() => {
                      track('photo_spot_dismissed', { photoSpotId: banner.photoSpotId });
                      setBanner(null);
                    }}
                  >
                    <Text style={styles.bannerBtnGhostLabel}>Después</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.navCard}>
              <Text style={styles.navTitle}>
                {nextPlace ? `Hacia ${nextPlace.name}` : 'Último tramo'}
              </Text>
              <Text style={styles.navMeta}>
                {gpsHint ?? (gpsSource === 'device' ? 'GPS del dispositivo' : 'GPS demo')}
                {' · '}
                offline-first · {s.storyEvents.length} historias
                {userPos?.acc != null && userPos.acc > 40
                  ? ` · señal débil (~${Math.round(userPos.acc)} m)`
                  : ''}
              </Text>
              {hasReplay ? (
                <Pressable onPress={replayAudio} style={styles.gpsToggle}>
                  <Text style={styles.gpsToggleLabel}>Replay último episodio ✦</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setForceDemo((v) => !v)}
                accessibilityRole="button"
                style={styles.gpsToggle}
              >
                <Text style={styles.gpsToggleLabel}>
                  {forceDemo || gpsSource === 'demo'
                    ? 'Usar GPS del dispositivo (si disponible)'
                    : 'Cambiar a GPS demo'}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <View style={styles.controls}>
          <Pressable style={styles.secondaryBtn} onPress={togglePause}>
            <Text style={styles.secondaryLabel}>{paused ? 'Reanudar' : 'Pausar'}</Text>
          </Pressable>
          <Pressable style={styles.finishBtn} onPress={finish}>
            <Text style={styles.finishLabel}>Finalizar</Text>
          </Pressable>
        </View>
      </View>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    gap: 12,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  live: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.terracotta,
  },
  discard: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 2,
  },
  secondaryMetric: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.secondaryText,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 12,
    ...radii.cardStat,
  },
  metricValue: {
    fontFamily: fonts.monoBold,
    fontSize: 16,
    color: colors.ink,
  },
  metricLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
  },
  banner: {
    backgroundColor: colors.ink,
    padding: 16,
    ...radii.cardSoft,
  },
  bannerPhoto: {
    backgroundColor: '#3a2a1c',
  },
  bannerText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.surface,
  },
  bannerMeta: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,248,239,0.65)',
  },
  bannerTranscript: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,248,239,0.88)',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  bannerBtn: {
    backgroundColor: colors.terracotta,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  bannerBtnLabel: {
    fontFamily: fonts.bodySemi,
    color: colors.white,
  },
  bannerBtnGhost: {
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  bannerBtnGhostLabel: {
    fontFamily: fonts.bodySemi,
    color: colors.surface,
  },
  navCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 14,
    ...radii.cardStat,
  },
  navTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  navMeta: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  gpsToggle: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  gpsToggleLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mediterraneanBlue,
    textDecorationLine: 'underline',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 999,
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  finishBtn: {
    flex: 1,
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    ...radii.primaryButton,
  },
  finishLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
});
