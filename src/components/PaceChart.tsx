import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';

const DEFAULT_BARS = [
  { h: 28, color: colors.seaGreen },
  { h: 44, color: colors.seaGreen },
  { h: 36, color: colors.mosaicYellow },
  { h: 58, color: colors.mosaicYellow },
  { h: 48, color: colors.terracotta },
  { h: 64, color: colors.terracotta },
  { h: 40, color: colors.seaGreen },
  { h: 52, color: colors.mosaicYellow },
  { h: 34, color: colors.seaGreen },
  { h: 46, color: colors.terracotta },
];

type Props = {
  title?: string;
  subtitle?: string;
  bars?: { h: number; color: string }[];
};

export function PaceChart({
  title = 'Ritmo por tramo',
  subtitle = 'narración adaptada 3 veces',
  bars = DEFAULT_BARS,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chart}>
        {bars.map((bar, i) => (
          <View key={i} style={styles.barTrack}>
            <View
              style={[
                styles.bar,
                {
                  height: bar.h,
                  backgroundColor: bar.color,
                  borderTopLeftRadius: 6 + (i % 3),
                  borderTopRightRadius: 8 + (i % 2),
                },
              ]}
            />
          </View>
        ))}
      </View>
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
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.surface,
    marginBottom: 14,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 72,
    gap: 6,
    marginBottom: 12,
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    minHeight: 12,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,248,239,0.65)',
  },
});
