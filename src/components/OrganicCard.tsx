import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '../theme';
import { elevation } from '../theme/motion';

export type OrganicCardTone = 'surface' | 'terracotta' | 'ink' | 'cream';
export type OrganicCardShape = 'organic' | 'organicAlt' | 'soft';

type Props = {
  children: React.ReactNode;
  tone?: OrganicCardTone;
  shape?: OrganicCardShape;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SHAPE: Record<OrganicCardShape, object> = {
  organic: radii.cardOrganic,
  organicAlt: radii.cardOrganicAlt,
  soft: radii.cardSoft,
};

const TONE: Record<OrganicCardTone, { bg: string; border?: string }> = {
  surface: { bg: colors.surface, border: colors.borders },
  cream: { bg: colors.background, border: colors.borders },
  terracotta: { bg: colors.terracotta },
  ink: { bg: colors.ink },
};

/** Organic surface — Gaudí radii, Apple elevation optional. */
export function OrganicCard({
  children,
  tone = 'surface',
  shape = 'organic',
  elevated = true,
  style,
}: Props) {
  const t = TONE[tone];
  return (
    <View
      style={[
        styles.base,
        SHAPE[shape],
        { backgroundColor: t.bg },
        t.border ? { borderWidth: 1, borderColor: t.border } : null,
        elevated ? elevation.card : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
