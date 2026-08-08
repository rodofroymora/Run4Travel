import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../theme';

const TILES = [
  colors.terracotta,
  colors.seaGreen,
  colors.mosaicYellow,
  colors.mediterraneanBlue,
  colors.amber,
] as const;

type Props = {
  size?: number;
  style?: ViewStyle;
};

/** Mosaico trencadís 2×2 — acento de marca. */
export function TrencadisMark({ size = 36, style }: Props) {
  const gap = 3;
  const tile = (size - gap) / 2;

  return (
    <View style={[{ width: size, height: size }, styles.wrap, style]}>
      {TILES.slice(0, 4).map((color, i) => (
        <View
          key={i}
          style={[
            styles.tile,
            {
              width: tile,
              height: tile,
              backgroundColor: color,
              borderRadius: 4 + (i % 3),
              transform: [{ rotate: `${(i - 1.5) * 4}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    alignContent: 'space-between',
    justifyContent: 'space-between',
  },
  tile: {
    opacity: 0.95,
  },
});
