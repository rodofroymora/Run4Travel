import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../theme';

type MarkProps = {
  size?: number;
  style?: StyleProp<ViewStyle | ImageStyle>;
  /** Prefer generated PNG mark when available (Home / splash wow). */
  raster?: boolean;
};

/**
 * Run4Travel mark — organic Batlló mosaic + discovery route + ✦.
 * Vector stays crisp; `raster` uses the generated brand PNG.
 */
export function Run4TravelMark({ size = 40, style, raster = false }: MarkProps) {
  if (raster) {
    return (
      <Image
        source={require('../../assets/run4travel-logo-mark.png')}
        style={[
          { width: size, height: size, borderRadius: size * 0.22 } as ImageStyle,
          style as StyleProp<ImageStyle>,
        ]}
        resizeMode="cover"
        accessibilityLabel="Run4Travel"
      />
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]} accessibilityLabel="Run4Travel">
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Path
          d="M8 22C8 12 14 6 24 6h18c10 0 16 7 16 16v22c0 11-8 18-20 18H26C14 62 8 54 8 42V22Z"
          fill={colors.ink}
        />
        <Path d="M14 18c0-6 4-10 11-10h8l-4 22H14V18Z" fill={colors.terracotta} opacity={0.95} />
        <Path d="M33 8h11c7 0 12 5 12 12v8H29L33 8Z" fill={colors.seaGreen} opacity={0.95} />
        <Path
          d="M14 32h18l-3 22H22c-6 0-8-4-8-10V32Z"
          fill={colors.mediterraneanBlue}
          opacity={0.95}
        />
        <Path d="M34 30h22v14c0 8-5 14-14 14h-4L34 30Z" fill={colors.mosaicYellow} opacity={0.95} />
        <Path d="M28 26l8-6 10 8-7 10-11-4Z" fill={colors.amber} opacity={0.9} />
        <Path
          d="M18 44C22 36 28 34 34 30c6-4 10-10 14-16"
          stroke={colors.white}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
          opacity={0.95}
        />
        <Circle cx={18} cy={44} r={2.4} fill={colors.white} />
        <Path
          d="M50 12l1.2 2.6 2.8.4-2 2.2.5 2.8L50 18.6 47.5 20l.5-2.8-2-2.2 2.8-.4L50 12Z"
          fill={colors.white}
        />
      </Svg>
    </View>
  );
}

type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  stacked?: boolean;
  raster?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Mark + optional wordmark for headers. */
export function Run4TravelLogo({
  size = 40,
  showWordmark = true,
  stacked = false,
  raster = false,
  style,
}: LogoProps) {
  return (
    <View style={[stacked ? styles.stacked : styles.row, style]}>
      <Run4TravelMark size={size} raster={raster} />
      {showWordmark ? (
        <View style={stacked ? styles.wordStack : styles.wordRow}>
          <Text style={[styles.word, stacked && styles.wordCentered]}>Run4Travel</Text>
          {!stacked ? <Text style={styles.tag}>✦ Discovery Runs</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stacked: {
    alignItems: 'center',
    gap: 10,
  },
  wordRow: {
    justifyContent: 'center',
  },
  wordStack: {
    alignItems: 'center',
  },
  word: {
    fontFamily: fonts.heading,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  wordCentered: {
    textAlign: 'center',
  },
  tag: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
});
