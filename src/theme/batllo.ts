/**
 * Batlló Design System — tokens canónicos.
 * Fuente de verdad visual: CONSTITUTION.md §15–§19
 */

export const colors = {
  background: '#f6efe3',
  surface: '#fff8ef',
  ink: '#2b1d12',
  terracotta: '#e2603c',
  seaGreen: '#2a9d8f',
  mosaicYellow: '#f3c33f',
  mediterraneanBlue: '#3d5a80',
  amber: '#e8a63c',
  secondaryText: '#8c6f52',
  borders: '#ead9bd',
  white: '#ffffff',
} as const;

export const fonts = {
  heading: 'Gabarito_800ExtraBold',
  headingBold: 'Gabarito_700Bold',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemi: 'InstrumentSans_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/** Radios asimétricos — Gaudí, not chaos. */
export const radii = {
  cardOrganic: {
    borderTopLeftRadius: 44,
    borderTopRightRadius: 62,
    borderBottomRightRadius: 48,
    borderBottomLeftRadius: 70,
  },
  cardOrganicAlt: {
    borderTopLeftRadius: 54,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 64,
    borderBottomLeftRadius: 36,
  },
  cardSoft: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 48,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 52,
  },
  cardStat: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 36,
    borderBottomRightRadius: 32,
    borderBottomLeftRadius: 40,
  },
  primaryButton: {
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    borderBottomLeftRadius: 22,
  },
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const tabs = ['Hoy', 'Explorar', 'Clubs', 'Perfil'] as const;

export const distances = ['5K', '10K', '15K', '21K', '42K'] as const;

export const routeStyles = [
  'Highlights',
  'Historic',
  'Scenic',
  'Parks',
  'Architecture',
  'Hidden Gems',
  'Waterfront',
] as const;

export type BatlloColor = keyof typeof colors;
export type TabId = (typeof tabs)[number];
