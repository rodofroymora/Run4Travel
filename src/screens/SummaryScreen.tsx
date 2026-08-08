import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { MedalBadge } from '../components/MedalBadge';
import { PaceChart } from '../components/PaceChart';
import { formatDistanceKm, formatDuration, formatPace } from '../domain/geo';
import { splitsToChartBars } from '../domain/runMetrics';
import { buildRunSummary, medalLabel } from '../domain/runSummary';
import { track } from '../services/analytics';
import { generateAlbumForRun, getAlbumByRunId } from '../services/albumStore';
import type { DiscoveryRoute } from '../types/discovery';
import type { RunSession, RunSummary } from '../types/run';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  session: RunSession;
  route: DiscoveryRoute;
  onBack?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onViewAlbum?: () => void;
  onStrava?: () => void;
};

export function SummaryScreen({
  session,
  route,
  onBack,
  onShare,
  onSave,
  onViewAlbum,
  onStrava,
}: Props) {
  const insets = useSafeAreaInsets();
  const [albumStatus, setAlbumStatus] = useState<RunSummary['albumStatus']>('pending');

  useEffect(() => {
    let cancelled = false;
    track('summary_viewed', { runId: session.id });

    (async () => {
      const existing = await getAlbumByRunId(session.id);
      if (existing) {
        if (!cancelled) setAlbumStatus('ready');
        return;
      }
      try {
        await generateAlbumForRun(session, route, true);
        if (!cancelled) setAlbumStatus('ready');
      } catch {
        if (!cancelled) setAlbumStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, route]);

  const summary = useMemo(
    () => buildRunSummary(session, albumStatus),
    [session, albumStatus],
  );

  useEffect(() => {
    if (summary.discoveryRunCompleted) {
      track('discovery_run_completed', {
        stories: summary.storiesListened,
        photos: summary.photoCount,
        cityId: summary.cityId,
      });
    }
  }, [summary.discoveryRunCompleted, summary]);

  const splitBars = summary.splits.length
    ? splitsToChartBars(summary.splits, { maxBars: 12 })
    : undefined;

  return (
    <BatlloBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backLabel}>← Hoy</Text>
        </Pressable>

        <View style={styles.hero}>
          <MedalBadge label={medalLabel(summary.distanceM)} size={120} />
          <Text style={styles.greeting}>¡Molt bé, Marta!</Text>
          <Text style={styles.runMeta}>
            {summary.routeName} · {summary.cityName} · {summary.finishedAtLocal}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, radii.cardStat]}>
            <Text style={styles.statValue}>{formatDistanceKm(summary.distanceM)}</Text>
            <Text style={styles.statLabel}>distancia</Text>
          </View>
          <View style={[styles.statCard, styles.r1]}>
            <Text style={styles.statValue}>{formatDuration(summary.durationSec)}</Text>
            <Text style={styles.statLabel}>tiempo</Text>
          </View>
          <View style={[styles.statCard, styles.r2]}>
            <Text style={styles.statValue}>{formatPace(summary.avgPaceSecPerKm)}</Text>
            <Text style={styles.statLabel}>
              ritmo{summary.isPacePb ? ' · PB ' : ''}
              {summary.isPacePb ? <Text style={styles.spark}>✦</Text> : null}
            </Text>
          </View>
          <View style={[styles.statCard, styles.r3]}>
            <Text style={styles.statValue}>{summary.storiesListened}</Text>
            <Text style={styles.statLabel}>historias escuchadas</Text>
          </View>
        </View>

        <View style={styles.block}>
          <PaceChart
            title="Ritmo por tramo"
            subtitle={
              summary.splits.length
                ? summary.narrationAdaptations
                  ? `${summary.splits.length} km · narración adaptada ${summary.narrationAdaptations} veces`
                  : `${summary.splits.length} km desde tu carrera · ${summary.photoCount} fotos`
                : 'Sin tramos completos — corre un poco más en la próxima'
            }
            bars={splitBars ?? []}
            emptyLabel="Sin splits en esta sesión"
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
          onPress={() => {
            track('album_cta_tapped', { status: albumStatus });
            onViewAlbum?.();
          }}
        >
          <View style={styles.albumIcon}>
            <Text style={styles.albumSpark}>✦</Text>
          </View>
          <View style={styles.albumInfo}>
            <Text style={styles.albumTitle}>
              {albumStatus === 'ready'
                ? 'Tu álbum está listo'
                : albumStatus === 'failed'
                  ? 'Álbum con plantilla local'
                  : '✦ Preparando tu álbum…'}
            </Text>
            <Text style={styles.albumMeta}>
              {summary.photoCount} fotos · {summary.routeName}
            </Text>
          </View>
          <Text style={styles.albumAction}>Ver →</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
          onPress={() => {
            track('share_cta_tapped');
            onShare?.();
          }}
        >
          <Text style={styles.shareLabel}>Compartir carrera</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
          onPress={() => {
            track('save_tapped');
            onSave?.();
          }}
        >
          <Text style={styles.saveLabel}>Guardar</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.stravaBtn, pressed && styles.pressed]}
          onPress={onStrava}
        >
          <Text style={styles.stravaLabel}>Sync to Strava</Text>
        </Pressable>
      </ScrollView>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    marginTop: 16,
    fontFamily: fonts.heading,
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.ink,
    textAlign: 'center',
  },
  runMeta: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 88,
    justifyContent: 'center',
  },
  r1: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 24,
  },
  r2: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 36,
  },
  r3: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 36,
    borderBottomLeftRadius: 28,
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  spark: {
    color: colors.terracotta,
    fontFamily: fonts.bodySemi,
  },
  block: {
    marginBottom: spacing.md,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 36,
    borderBottomRightRadius: 32,
    borderBottomLeftRadius: 40,
  },
  albumIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.mosaicYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumSpark: {
    fontSize: 18,
    color: colors.ink,
  },
  albumInfo: { flex: 1 },
  albumTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  albumMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  albumAction: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.terracotta,
  },
  shareBtn: {
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    ...radii.primaryButton,
  },
  shareLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
  saveBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
    marginBottom: 10,
  },
  saveLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  stravaBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  stravaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.mediterraneanBlue,
  },
  pressed: { opacity: 0.88 },
});
