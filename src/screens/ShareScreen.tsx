import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { SHARE_ASPECT } from '../domain/shareFormats';
import {
  buildShareAsset,
  exportShareAsset,
  shareOrSaveAsset,
} from '../services/shareExport';
import type { ShareFormat } from '../types/share';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  runId: string;
  routeName: string;
  cityName: string;
  onBack: () => void;
  onDone: () => void;
};

const FORMATS: ShareFormat[] = [
  'story_9x16',
  'carousel_4x5',
  'square_1x1',
  'route_overlay',
];

export function ShareScreen({ runId, routeName, cityName, onBack, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [format, setFormat] = useState<ShareFormat>('story_9x16');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const asset = useMemo(
    () => buildShareAsset(format, { runId, routeName, cityName }),
    [format, runId, routeName, cityName],
  );
  const spec = SHARE_ASPECT[format];
  const previewH = format === 'story_9x16' ? 260 : 220;
  const previewW = previewH * (spec.width / spec.height);

  const runExport = async (mode: 'share' | 'save') => {
    setBusy(true);
    setProgress(0);
    setStatus('Preparando…');
    try {
      const exported = await exportShareAsset(
        format,
        { runId, routeName, cityName },
        (p) => {
          if (p.phase === 'error') {
            setStatus(p.message);
            return;
          }
          setProgress(p.progress);
          setStatus(p.message);
        },
      );
      const r = await shareOrSaveAsset(exported, mode);
      if (r !== 'ok') {
        Alert.alert('Error', mode === 'share' ? 'No se pudo compartir' : 'No se pudo guardar');
        return;
      }
      Alert.alert(
        mode === 'share' ? 'Listo' : 'Guardado',
        mode === 'share'
          ? 'Share sheet abierto · SVG listo para Instagram / sistema.'
          : Platform.OS === 'web'
            ? 'Descarga iniciada (SVG).'
            : 'Guardado en carrete.',
      );
      if (mode === 'share') onDone();
    } finally {
      setBusy(false);
      setStatus(null);
      setProgress(0);
    }
  };

  return (
    <BatlloBackground>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Compartir carrera</Text>
        <Text style={styles.meta}>Elige formato social · watermark Run4Travel</Text>

        <View style={styles.formats}>
          {FORMATS.map((f) => (
            <Pressable
              key={f}
              style={[styles.chip, format === f && styles.chipOn]}
              onPress={() => !busy && setFormat(f)}
            >
              <Text style={[styles.chipLabel, format === f && styles.chipLabelOn]}>
                {SHARE_ASPECT[f].label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.previewWrap}>
          <View
            style={[
              styles.preview,
              {
                width: Math.min(previewW, 300),
                height: previewH,
                backgroundColor: asset.transparent ? 'transparent' : colors.ink,
                borderWidth: asset.transparent ? 1 : 0,
                borderColor: colors.borders,
                borderStyle: asset.transparent ? 'dashed' : 'solid',
              },
            ]}
          >
            <Text style={styles.previewEyebrow}>✦ Discovery Run</Text>
            <Text style={styles.previewTitle}>{routeName}</Text>
            <Text style={styles.previewCity}>{cityName}</Text>
            <View style={styles.fakeRoute} />
            <View style={styles.fakeRouteSoft} />
            <Text style={styles.wm}>Run4Travel</Text>
            {asset.transparent ? <Text style={styles.alpha}>overlay α</Text> : null}
          </View>
          <Text style={styles.dims}>
            {asset.width}×{asset.height}
            {asset.transparent ? ' · PNG transparente' : ' · PNG'}
          </Text>
        </View>

        {asset.caption ? (
          <View style={styles.captionBox}>
            <Text style={styles.captionLabel}>Caption sugerido</Text>
            <Text style={styles.caption}>{asset.caption}</Text>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>{status ?? 'Exportando…'}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
        ) : null}

        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void runExport('share')}
        >
          <Text style={styles.ctaLabel}>
            {busy ? 'Exportando…' : 'Abrir share sheet'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void runExport('save')}
        >
          <Text style={styles.secondaryLabel}>Guardar en carrete</Text>
        </Pressable>
        <Text style={styles.todo}>
          Export SVG client-side · share sheet nativo / descarga web
        </Text>
      </ScrollView>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
  },
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
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 16,
  },
  formats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borders,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipOn: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  chipLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  chipLabelOn: { color: colors.white },
  previewWrap: { alignItems: 'center', marginBottom: 16 },
  preview: {
    borderRadius: 28,
    padding: 16,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  previewEyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.mosaicYellow,
    marginBottom: 4,
  },
  previewTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.surface,
  },
  previewCity: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,248,239,0.7)',
    marginBottom: 12,
  },
  fakeRoute: {
    height: 4,
    backgroundColor: colors.terracotta,
    borderRadius: 4,
    marginBottom: 6,
    width: '80%',
  },
  fakeRouteSoft: {
    height: 3,
    backgroundColor: colors.seaGreen,
    borderRadius: 4,
    marginBottom: 10,
    width: '55%',
    opacity: 0.7,
  },
  wm: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,248,239,0.45)',
  },
  alpha: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.seaGreen,
  },
  dims: {
    marginTop: 8,
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.secondaryText,
  },
  captionBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 14,
    marginBottom: 16,
    ...radii.cardStat,
  },
  captionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.secondaryText,
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: colors.ink,
    padding: 14,
    marginBottom: 14,
    ...radii.cardStat,
  },
  progressText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.surface,
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#3a2a1c',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.terracotta,
  },
  cta: {
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    ...radii.primaryButton,
    marginBottom: 10,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
  secondary: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borders,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  todo: {
    marginTop: 14,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.secondaryText,
    textAlign: 'center',
  },
});
