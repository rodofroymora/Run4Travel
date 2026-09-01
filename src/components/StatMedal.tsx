import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radii } from '../theme';
import { elevation } from '../theme/motion';

export type StatMedalTone = 'sea' | 'yellow' | 'blue' | 'terra';

type Props = {
  value: string;
  unit: string;
  tone?: StatMedalTone;
};

const TONES: Record<
  StatMedalTone,
  { colors: [string, string]; value: string; unit: string }
> = {
  sea: {
    colors: ['#2a9d8f', '#1f7a70'],
    value: colors.white,
    unit: 'rgba(255,255,255,0.78)',
  },
  yellow: {
    colors: ['#f3c33f', '#e8a63c'],
    value: colors.ink,
    unit: 'rgba(43,29,18,0.55)',
  },
  blue: {
    colors: ['#3d5a80', '#2f4666'],
    value: colors.white,
    unit: 'rgba(255,255,255,0.78)',
  },
  terra: {
    colors: ['#e2603c', '#c44a2a'],
    value: colors.white,
    unit: 'rgba(255,255,255,0.78)',
  },
};

const SHAPES = [
  radii.cardStat,
  {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 24,
  },
  {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 36,
  },
] as const;

/**
 * Stat medal — label up, value fills the pill (Apple Fitness hierarchy).
 * Space Grotesk for lean metric type.
 */
export function StatMedal({ value, unit, tone = 'sea' }: Props) {
  const t = TONES[tone];
  const shape = SHAPES[tone === 'sea' ? 0 : tone === 'yellow' ? 1 : 2]!;

  return (
    <View style={[styles.wrap, shape, elevation.medal]}>
      <LinearGradient
        colors={t.colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, shape]}
      />
      <View style={styles.sheen} pointerEvents="none" />
      <Text style={[styles.unit, { color: t.unit }]} numberOfLines={1}>
        {unit}
      </Text>
      <Text
        style={[styles.value, { color: t.value }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 108,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: '30%',
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderBottomRightRadius: 80,
  },
  unit: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: fonts.metricHeavy,
    fontSize: 32,
    letterSpacing: -1.4,
    lineHeight: 36,
    marginTop: 8,
  },
});
