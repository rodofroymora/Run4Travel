import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, fonts } from '../theme';

type Props = {
  label?: string;
  size?: number;
};

/** Medalla trencadís — anillo segmentado (compatible web + native). */
export function MedalBadge({ label = '10K\nCOMPLETADA', size = 112 }: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = Math.PI * 2 * r;
  const segments = [
    { color: colors.terracotta, from: 0, to: 0.28 },
    { color: colors.mosaicYellow, from: 0.28, to: 0.5 },
    { color: colors.seaGreen, from: 0.5, to: 0.76 },
    { color: colors.mediterraneanBlue, from: 0.76, to: 1 },
  ];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={colors.borders}
          strokeWidth={stroke}
          fill={colors.surface}
        />
        <G transform={`rotate(-90 ${c} ${c})`}>
          {segments.map((seg, i) => (
            <Circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              stroke={seg.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${circumference * (seg.to - seg.from)} ${circumference}`}
              strokeDashoffset={-circumference * seg.from}
              strokeLinecap="round"
              opacity={0.95}
            />
          ))}
        </G>
      </Svg>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.3,
    color: colors.ink,
    textAlign: 'center',
  },
});
