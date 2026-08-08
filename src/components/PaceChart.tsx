import { StyleSheet, Text, View } from 'react-native';
import type { ChartBar, PaceBand } from '../domain/runMetrics';
import { colors, fonts, radii } from '../theme';

const BAND_COLOR: Record<PaceBand, string> = {
  fast: colors.seaGreen,
  steady: colors.mosaicYellow,
  easy: colors.terracotta,
};

const DEFAULT_BARS: ChartBar[] = [
  { h: 28, band: 'fast' },
  { h: 44, band: 'fast' },
  { h: 36, band: 'steady' },
  { h: 58, band: 'steady' },
  { h: 48, band: 'easy' },
  { h: 64, band: 'easy' },
  { h: 40, band: 'fast' },
  { h: 52, band: 'steady' },
  { h: 34, band: 'fast' },
  { h: 46, band: 'easy' },
];

type Props = {
  title?: string;
  subtitle?: string;
  /** Pass `[]` for empty; omit for decorative defaults (home mock only). */
  bars?: ChartBar[] | null;
  /** When true, empty bars show waiting copy (live run). */
  live?: boolean;
  emptyLabel?: string;
};

export function PaceChart({
  title = 'Ritmo por tramo',
  subtitle = 'narración adaptada 3 veces',
  bars,
  live = false,
  emptyLabel = 'Los tramos aparecen al completar cada km',
}: Props) {
  const data = bars != null ? bars : live ? [] : DEFAULT_BARS;
  const showEmpty = data.length === 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {live ? <Text style={styles.livePill}>EN VIVO</Text> : null}
      </View>
      {showEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      ) : (
        <View style={styles.chart}>
          {data.map((bar, i) => (
            <View key={i} style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: bar.h,
                    backgroundColor: BAND_COLOR[bar.band],
                    opacity: bar.partial ? 0.55 : 1,
                    borderTopLeftRadius: 6 + (i % 3),
                    borderTopRightRadius: 8 + (i % 2),
                  },
                ]}
              />
              {bar.label ? <Text style={styles.kmLabel}>{bar.label}</Text> : null}
            </View>
          ))}
        </View>
      )}
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    ...radii.cardSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.surface,
  },
  livePill: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.terracotta,
  },
  empty: {
    height: 72,
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,248,239,0.55)',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 84,
    gap: 6,
    marginBottom: 8,
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    minHeight: 12,
  },
  kmLabel: {
    marginTop: 4,
    fontFamily: fonts.mono,
    fontSize: 9,
    color: 'rgba(255,248,239,0.45)',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,248,239,0.65)',
  },
});
