import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { distanceLabel } from '../domain/routeIntent';
import { ROUTE_STYLE_LABELS, type RouteIntent } from '../types/routeIntent';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  intent: RouteIntent;
  onDone: () => void;
};

/** Placeholder bridge hacia SPEC-002. */
export function GeneratingRouteScreen({ intent, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const lines = [
    `Explorando ${intent.cityName}…`,
    'Eligiendo lugares con alma…',
    'Trazando una ruta segura…',
    'Listo — SPEC-002 conectará el motor real.',
  ];

  return (
    <BatlloBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.spark}>✦</Text>
        <Text style={styles.title}>Creando tu Discovery Run</Text>
        <Text style={styles.meta}>
          {intent.cityName} · {distanceLabel(intent.distanceKm)} ·{' '}
          {ROUTE_STYLE_LABELS[intent.style]}
        </Text>
        <Text style={styles.start}>
          Salida: {intent.start.label ?? `${intent.start.lat.toFixed(3)}, ${intent.start.lng.toFixed(3)}`}
        </Text>

        <View style={styles.card}>
          {phase < 3 ? (
            <ActivityIndicator color={colors.terracotta} size="large" />
          ) : null}
          <Text style={styles.phase}>{lines[phase]}</Text>
        </View>

        {phase >= 3 ? (
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]}
            onPress={onDone}
          >
            <Text style={styles.ctaLabel}>Volver a Hoy</Text>
          </Pressable>
        ) : null}
      </View>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  spark: {
    fontSize: 36,
    color: colors.terracotta,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    letterSpacing: -0.56,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  meta: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  start: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 28,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    ...radii.cardSoft,
  },
  phase: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },
  cta: {
    marginTop: 28,
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    alignSelf: 'stretch',
    ...radii.primaryButton,
  },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
});
