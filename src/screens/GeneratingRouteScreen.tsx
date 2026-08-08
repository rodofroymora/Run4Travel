import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { distanceLabel } from '../domain/routeIntent';
import { generateRoute } from '../services/routeGenerate';
import type { DiscoveryRoute } from '../types/discovery';
import { ROUTE_STYLE_LABELS, type RouteIntent } from '../types/routeIntent';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  intent: RouteIntent;
  onReady: (route: DiscoveryRoute) => void;
  onCancel: () => void;
};

export function GeneratingRouteScreen({ intent, onReady, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('✦ Creando tu ruta…');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    generateRoute(intent, (p) => {
      if (cancelled) return;
      if (p.phase === 'error') {
        setError(p.message);
        setBusy(false);
        return;
      }
      if (p.phase === 'done') {
        setMessage(p.message);
        setBusy(false);
        setTimeout(() => {
          if (!cancelled) onReady(p.route);
        }, 450);
        return;
      }
      setMessage(p.message);
    }).catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : 'No pudimos crear la ruta');
      setBusy(false);
    });

    return () => {
      cancelled = true;
    };
  }, [intent, onReady]);

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
          {busy ? <ActivityIndicator color={colors.terracotta} size="large" /> : null}
          <Text style={styles.phase}>{error ?? message}</Text>
          <Text style={styles.hint}>✦ Creando tu ruta…</Text>
        </View>

        {error ? (
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]}
            onPress={() => {
              setError(null);
              setBusy(true);
              generateRoute(intent, (p) => {
                if (p.phase === 'done') onReady(p.route);
                else if (p.phase === 'error') setError(p.message);
                else setMessage(p.message);
              }).catch((e) =>
                setError(e instanceof Error ? e.message : 'Error'),
              );
            }}
          >
            <Text style={styles.ctaLabel}>Reintentar</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onCancel} hitSlop={12} style={styles.cancel}>
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </Pressable>
        )}
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
    gap: 12,
    ...radii.cardSoft,
  },
  phase: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.terracotta,
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
  cancel: { marginTop: 20 },
  cancelLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
  },
});
