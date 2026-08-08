import { Dimensions, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

const { width, height } = Dimensions.get('window');

/** Fondo crema + dots sutiles + blobs orgánicos. */
export function BatlloBackground({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.blobSea} />
      <View style={styles.blobTerra} />
      <View style={styles.blobAmber} />
      <View style={styles.dots} pointerEvents="none">
        {DOTS.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                left: dot.x,
                top: dot.y,
                opacity: dot.o,
              },
            ]}
          />
        ))}
      </View>
      {children}
    </View>
  );
}

const DOTS = Array.from({ length: 48 }, (_, i) => ({
  x: ((i * 17 + 5) % 96) * (width / 100),
  y: ((i * 23 + 8) % 94) * (height / 100),
  o: 0.08 + (i % 3) * 0.03,
}));

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  blobSea: {
    position: 'absolute',
    width: 280,
    height: 280,
    top: -60,
    right: -80,
    backgroundColor: colors.seaGreen,
    opacity: 0.14,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 120,
    borderBottomRightRadius: 180,
    borderBottomLeftRadius: 100,
  },
  blobTerra: {
    position: 'absolute',
    width: 220,
    height: 260,
    bottom: 120,
    left: -90,
    backgroundColor: colors.terracotta,
    opacity: 0.12,
    borderTopLeftRadius: 140,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 160,
    borderBottomLeftRadius: 120,
  },
  blobAmber: {
    position: 'absolute',
    width: 160,
    height: 160,
    top: height * 0.42,
    right: -40,
    backgroundColor: colors.mosaicYellow,
    opacity: 0.1,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 70,
    borderBottomRightRadius: 100,
    borderBottomLeftRadius: 60,
  },
  dots: {
    ...StyleSheet.absoluteFill,
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.seaGreen,
  },
});
