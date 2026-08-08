import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  rows?: number;
  cols?: number;
};

/** Escamas cerámicas Batlló — semicerculos superpuestos. */
export function CeramicScales({ rows = 6, cols = 8 }: Props) {
  const scales = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      scales.push({
        key: `${r}-${c}`,
        left: c * 42 - (r % 2) * 21,
        top: r * 28,
        opacity: 0.1 + ((r + c) % 4) * 0.04,
      });
    }
  }

  return (
    <View style={styles.wrap} pointerEvents="none">
      {scales.map((s) => (
        <View
          key={s.key}
          style={[
            styles.scale,
            {
              left: s.left,
              top: s.top,
              opacity: s.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  scale: {
    position: 'absolute',
    width: 48,
    height: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: 'transparent',
  },
});
