import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, type TabId } from '../theme';

type Props = {
  active: TabId;
  onChange?: (tab: TabId) => void;
};

/** Jobs cut: Clubs fuera del chrome hasta tener retención. */
const ITEMS: { id: TabId; label: string }[] = [
  { id: 'Hoy', label: 'Hoy' },
  { id: 'Explorar', label: 'Explorar' },
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
    case 'Perfil':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={9} r={3.2} stroke={stroke} strokeWidth={1.8} />
          <Path
            d="M5 19c1.2-3 3.5-4.5 7-4.5s5.8 1.5 7 4.5"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}

export function TabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {ITEMS.map((item) => {
        const on = active === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange?.(item.id)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Glyph id={item.id} active={on} />
            <Text style={[styles.label, on && styles.labelOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borders,
    backgroundColor: colors.surface,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.secondaryText,
  },
  labelOn: {
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
});
