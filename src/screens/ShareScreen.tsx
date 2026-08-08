import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { SHARE_ASPECT } from '../domain/shareFormats';
import { buildShareAsset, shareOrSaveStub } from '../services/shareExport';
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
  const asset = useMemo(
    () => buildShareAsset(format, { runId, routeName, cityName }),
    [format, runId, routeName, cityName],
  );
  const spec = SHARE_ASPECT[format];
  const previewH = 220;
  const previewW = previewH * (spec.width / spec.height);

  return (
    <BatlloBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
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
              onPress={() => setFormat(f)}
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
                width: Math.min(previewW, 280),
                height: previewH,
                backgroundColor: asset.transparent ? 'transparent' : colors.ink,
                borderWidth: asset.transparent ? 1 : 0,
                borderColor: colors.borders,
                borderStyle: asset.transparent ? 'dashed' : 'solid',
              },
            ]}
          >
            <Text style={styles.previewTitle}>{routeName}</Text>
            <Text style={styles.previewCity}>{cityName}</Text>
            <View style={styles.fakeRoute} />
            <Text style={styles.wm}>Run4Travel</Text>
            {asset.transparent ? (
              <Text style={styles.alpha}>overlay α</Text>
            ) : null}
          </View>
          <Text style={styles.dims}>
            {asset.width}×{asset.height}
            {asset.transparent ? ' · PNG transparente' : ''}
          </Text>
        </View>

        {asset.caption ? (
          <Text style={styles.caption}>{asset.caption}</Text>
        ) : null}

        <Pressable
          style={styles.cta}
          onPress={async () => {
            const r = await shareOrSaveStub(asset, 'share');
            Alert.alert(
              r === 'ok' ? 'Listo' : 'Error',
              r === 'ok'
                ? 'Share sheet stub: archivo listo para Instagram / sistema.'
                : 'No se pudo compartir',
            );
            if (r === 'ok') onDone();
          }}
        >
          <Text style={styles.ctaLabel}>Abrir share sheet</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={async () => {
            await shareOrSaveStub(asset, 'save');
            Alert.alert('Guardado', 'Stub: guardado en carrete.');
          }}
        >
          <Text style={styles.secondaryLabel}>Guardar en carrete</Text>
        </Pressable>
      </View>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
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
    marginBottom: 10,
    width: '80%',
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
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 16,
    lineHeight: 20,
  },
  cta: {
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    ...radii.primaryButton,
    marginBottom: 10,
  },
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
});
