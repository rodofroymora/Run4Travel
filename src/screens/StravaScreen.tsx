import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { getRunSession } from '../services/runSessionStore';
import {
  connectStravaStub,
  flushStravaOutbox,
  getOutbox,
  getStravaConnection,
  queueStravaUpload,
  setMockNetworkOnline,
  stravaActivityName,
} from '../services/stravaSync';
import type { RunSession } from '../types/run';
import type { OutboxJob, StravaConnection } from '../types/strava';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  session: RunSession;
  onBack: () => void;
};

export function StravaScreen({ session, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [conn, setConn] = useState<StravaConnection | null>(null);
  const [jobs, setJobs] = useState<OutboxJob[]>([]);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setConn(await getStravaConnection());
    setJobs(await getOutbox());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const job = jobs.find((j) => j.runId === session.id);

  return (
    <BatlloBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Resumen</Text>
        </Pressable>
        <Text style={styles.title}>Strava</Text>
        <Text style={styles.meta}>
          Sync opcional · outbox offline · idempotente por runId
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Actividad</Text>
          <Text style={styles.value}>{stravaActivityName(session)}</Text>
          <Text style={styles.hint}>
            {(session.distanceM / 1000).toFixed(2)} km · {session.storyEvents.length} lugares
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Conexión</Text>
          <Text style={styles.value}>
            {conn ? `Conectado · ${conn.athleteName}` : 'No conectado'}
          </Text>
          {!conn ? (
            <Pressable
              style={styles.cta}
              onPress={async () => {
                const c = await connectStravaStub('Marta');
                setConn(c);
                Alert.alert('Strava', 'OAuth stub completado.');
              }}
            >
              <Text style={styles.ctaLabel}>Conectar Strava</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Red (demo)</Text>
          <Pressable
            onPress={() => {
              const next = !online;
              setOnline(next);
              setMockNetworkOnline(next);
            }}
          >
            <Text style={styles.value}>{online ? 'Online' : 'Offline · cola activa'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Outbox</Text>
          <Text style={styles.value}>
            {job
              ? `${job.status}${job.stravaActivityId ? ` · ${job.stravaActivityId}` : ''}${
                  job.lastError ? ` · ${job.lastError}` : ''
                }`
              : 'Sin jobs para este run'}
          </Text>
        </View>

        <Pressable
          style={[styles.cta, busy && { opacity: 0.7 }]}
          disabled={busy}
          onPress={async () => {
            if (!conn) {
              Alert.alert('Strava', 'Conecta primero tu cuenta.');
              return;
            }
            setBusy(true);
            try {
              await queueStravaUpload(session);
              const result = await flushStravaOutbox(getRunSession);
              await refresh();
              if (!online) {
                Alert.alert(
                  'En cola',
                  'Sin red: se sincronizará cuando haya conexión.',
                );
              } else if (result.succeeded > 0) {
                Alert.alert('Sincronizado', 'Actividad enviada a Strava (mock).');
              } else {
                Alert.alert('Pendiente', 'Revisa el estado del outbox.');
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={styles.ctaLabel}>
            {busy ? 'Sincronizando…' : 'Sync to Strava'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={async () => {
            setMockNetworkOnline(true);
            setOnline(true);
            setBusy(true);
            try {
              await flushStravaOutbox(getRunSession);
              await refresh();
              Alert.alert('Flush', 'Cola procesada.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={styles.secondaryLabel}>Flush outbox (reconexión)</Text>
        </Pressable>
      </View>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    padding: 16,
    ...radii.cardSoft,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.secondaryText,
    marginBottom: 6,
  },
  value: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  hint: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  cta: {
    marginTop: 12,
    backgroundColor: colors.terracotta,
    paddingVertical: 14,
    alignItems: 'center',
    ...radii.primaryButton,
  },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.white,
  },
  secondary: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borders,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
});
