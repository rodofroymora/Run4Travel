import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { MockMap } from '../components/MockMap';
import { PaceChart } from '../components/PaceChart';
import { getPlacesForCity } from '../data/places';
import { formatDistanceKm, formatDuration, formatPace, haversineM } from '../domain/geo';
import { evaluatePhotoSafety } from '../domain/photoSafety';
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
import { createMockGpsStreamer } from '../services/mockGps';
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
  | { kind: 'story'; text: string; version: StoryVersionKey; storyPointId: string }
  | { kind: 'photo'; text: string; photoSpotId: string; placeName: string }
  | null;

export function ActiveRunScreen({ route, onFinished, onDiscard }: Props) {
  const insets = useSafeAreaInsets();
  const places = useMemo(
    () => getPlacesForCity(route.intent.cityId, route.intent.start),
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
  });

  const [samples, setSamples] = useState<GpsSample[]>([]);
  const [paused, setPaused] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [tick, setTick] = useState(0);
  const promptedPhotos = useRef(new Set<string>());
  const playedStories = useRef(new Set<string>());
  const lastVersion = useRef<StoryVersionKey | null>(null);
  const streamerRef = useRef<ReturnType<typeof createMockGpsStreamer> | null>(null);
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

  useEffect(() => {
    track('run_started', { routeId: route.id });
    const streamer = createMockGpsStreamer(route.geometry.coordinates, {
      paceSecPerKm: 330,
      tickMs: 500,
      metersPerTick: 22,
      paceVarianceSec: 50,
    });
    streamerRef.current = streamer;
    streamer.start(onSample);
    void persist();
    return () => streamer.stop();
  }, [route, onSample, persist]);

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
            text: `✦ Te acercas a ${place.name}`,
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
          track('story_played', { storyPointId: sp.id, version });
          setTimeout(() => {
            void resumeMusic();
            setBanner((b) => (b?.kind === 'story' ? null : b));
          }, Math.min(sp.durationSec[version], 8) * 1000);
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
      void resumeMusic();
    }
    void persist();
  };

  const finish = () => {
    streamerRef.current?.stop();
    const finished: RunSession = {
      ...sessionRef.current,
      status: 'completed',
      finishedAt: new Date().toISOString(),
      durationSec: Math.floor(
        (Date.now() - startMs.current - pausedAccumMs.current) / 1000,
      ),
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
    const photo: RunPhoto = {
      id: `ph_${Date.now().toString(36)}`,
      runId: sessionRef.current.id,
      photoSpotId: banner.photoSpotId,
      uri: `stub://photo/${banner.photoSpotId}.jpg`,
      lat: userPos?.lat,
      lng: userPos?.lng,
      takenAt: new Date().toISOString(),
      source: 'stub',
    };
    sessionRef.current.photos.push(photo);
    void persist();
    track('photo_spot_captured', { photoSpotId: banner.photoSpotId });
    setBanner(null);
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
            <Text style={styles.live}>{paused ? 'PAUSA' : 'EN CURSO · OFFLINE'}</Text>
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

          <MockMap
            coordinates={route.geometry.coordinates}
            markers={markers}
            height={180}
            label={nextPlace ? `Próximo: ${nextPlace.name} · ${Math.round(nextPlace.dist)} m` : 'Meta cercana'}
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

          <PaceChart
            live
            title="Ritmo por tramo"
            subtitle={
              s.splitsKm.length
                ? `${s.splitsKm.length} km completados · media ${formatPace(s.avgPaceSecPerKm)}`
                : 'Offline-first · el gráfico crece con tu carrera'
            }
            bars={liveBars}
          />

          {banner ? (
            <View style={[styles.banner, banner.kind === 'photo' && styles.bannerPhoto]}>
              <Text style={styles.bannerText}>{banner.text}</Text>
              {banner.kind === 'story' ? (
                <Text style={styles.bannerMeta}>Versión {banner.version} · música en duck</Text>
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
                GPS demo · offline-first · {s.storyEvents.length} historias
              </Text>
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
