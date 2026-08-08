import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, fonts, type TabId } from '../theme';

type Props = {
  active: TabId;
  onChange?: (tab: TabId) => void;
};

const ITEMS: { id: TabId; label: string }[] = [
  { id: 'Hoy', label: 'Hoy' },
  { id: 'Explorar', label: 'Explorar' },
  { id: 'Clubs', label: 'Clubs' },
  { id: 'Perfil', label: 'Perfil' },
];

function Glyph({ id, active }: { id: TabId; active: boolean }) {
  const stroke = active ? colors.ink : colors.secondaryText;
  switch (id) {
    case 'Hoy':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 18V10.5L12 5l8 5.5V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"
            stroke={stroke}
            strokeWidth={1.8}
          />
          <Path d="M9 19v-5h6v5" stroke={stroke} strokeWidth={1.8} />
        </Svg>
      );
    case 'Explorar':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={11} cy={11} r={6.5} stroke={stroke} strokeWidth={1.8} />
          <Path d="M16 16l4 4" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'Clubs':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={9} cy={9} r={3} stroke={stroke} strokeWidth={1.8} />
          <Circle cx={16} cy={10} r={2.5} stroke={stroke} strokeWidth={1.8} />
          <Path
            d="M4 18c.8-2.4 2.8-3.5 5-3.5s4.2 1.1 5 3.5"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Path
            d="M14 18c.5-1.6 1.7-2.4 3.2-2.4 1.2 0 2.2.5 2.8 1.6"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'Perfil':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={9} r={3.2} stroke={stroke} strokeWidth={1.8} />
          <Path
            d="M5.5 19c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Rect x={3} y={3} width={0} height={0} />
        </Svg>
      );
  }
}

export function TabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <Pressable
            key={item.id}
            style={styles.item}
            onPress={() => onChange?.(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Glyph id={item.id} active={isActive} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            {isActive ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borders,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.secondaryText,
  },
  labelActive: {
    color: colors.ink,
    fontFamily: fonts.bodySemi,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.terracotta,
    marginTop: 2,
  },
  dotSpacer: {
    height: 7,
    marginTop: 2,
  },
});
