import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Text } from 'react-native';

type Props = {
  label?: string;
  size?: number;
};

/** Medalla trencadís con anillo conic-like. */
export function MedalBadge({ label = '10K\nCOMPLETADA', size = 112 }: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const segments = [
    { color: colors.terracotta, from: 0, to: 0.28 },
    { color: colors.mosaicYellow, from: 0.28, to: 0.5 },
    { color: colors.seaGreen, from: 0.5, to: 0.76 },
    { color: colors.mediterraneanBlue, from: 0.76, to: 1 },
  ];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="medalRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.terracotta} />
            <Stop offset="35%" stopColor={colors.mosaicYellow} />
            <Stop offset="65%" stopColor={colors.seaGreen} />
            <Stop offset="100%" stopColor={colors.mediterraneanBlue} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke="url(#medalRing)"
          strokeWidth={stroke}
          fill={colors.surface}
          strokeDasharray={`${Math.PI * 2 * r * 0.92} ${Math.PI * 2 * r * 0.08}`}
          strokeLinecap="round"
          rotation={-20}
          origin={`${c}, ${c}`}
        />
        {segments.map((seg, i) => (
          <Circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            stroke={seg.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${Math.PI * 2 * r * (seg.to - seg.from)} ${Math.PI * 2 * r}`}
            strokeDashoffset={-Math.PI * 2 * r * seg.from}
            rotation={-90}
            origin={`${c}, ${c}`}
            opacity={0.95}
          />
        ))}
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
