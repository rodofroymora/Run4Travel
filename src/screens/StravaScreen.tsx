import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { getRunSession } from '../services/runSessionStore';
import { beginStravaOAuth, stravaEnvConfigured, stravaOAuthReady } from '../services/stravaAuth';
import {
  disconnectStrava,
  flushStravaOutbox,
  getOutbox,
  getStravaConnection,
  outboxStatusLabel,
  queueStravaUpload,
  saveStravaConnection,
  setMockNetworkOnline,
  setStravaAutoSync,
  stravaActivityDescription,
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
  const [oauthMsg, setOauthMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setConn(await getStravaConnection());
    setJobs(await getOutbox());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const job = jobs.find((j) => j.runId === session.id);
  const pendingCount = jobs.filter((j) => j.status === 'pending' || j.status === 'failed').length;

  const connect = async () => {
    setBusy(true);
    setOauthMsg(null);
    try {
      const oauth = await beginStravaOAuth('Marta', (p) => {
        setOauthMsg(p.message);
      });
      const c = await saveStravaConnection({
        athleteId: oauth.athleteId,
        athleteName: oauth.athleteName,
        connectedAt: new Date().toISOString(),
        autoSync: true,
        accessToken: oauth.accessToken,
        refreshToken: oauth.refreshToken,
        expiresAt: oauth.expiresAt,
        mode: oauth.mode,
      });
      setConn(c);
      Alert.alert(
        'Strava conectado',
        oauth.mode === 'oauth'
          ? `Hola ${oauth.athleteName}. Ya puedes sincronizar actividades reales.`
          : stravaEnvConfigured()
            ? 'Falta EXPO_PUBLIC_STRAVA_CLIENT_SECRET para OAuth real. Conectado en demo.'
            : 'OAuth mock listo (sin secrets). Puedes sincronizar en demo.',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo conectar';
      setOauthMsg(msg);
      Alert.alert('Strava', msg);
    } finally {
      setBusy(false);
      setOauthMsg(null);
    }
  };

  return (
    <BatlloBackground>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
      >
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
          <Text style={styles.hint}>{stravaActivityDescription(session)}</Text>
          <Text style={styles.hint}>
            {(session.distanceM / 1000).toFixed(2)} km · {session.storyEvents.length} lugares
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Conexión</Text>
          <Text style={styles.value}>
            {conn
              ? `Conectado · ${conn.athleteName}${conn.mode === 'oauth' ? ' · OAuth' : ' · demo'}`
              : 'No conectado'}
          </Text>
          {conn ? (
            <>
              <Text style={styles.hint}>
                Desde {new Date(conn.connectedAt).toLocaleString('es-ES')}
              </Text>
              <Pressable
                style={styles.switchRow}
                onPress={async () => {
                  const next = await setStravaAutoSync(!conn.autoSync);
                  if (next) setConn(next);
                }}
              >
                <Text style={styles.switchLabel}>Auto-sync al terminar</Text>
                <Text style={styles.switchValue}>{conn.autoSync ? 'Sí' : 'No'}</Text>
              </Pressable>
              <Pressable
                style={styles.ghostBtn}
                onPress={async () => {
                  await disconnectStrava();
                  setConn(null);
                }}
              >
                <Text style={styles.ghostLabel}>Desconectar</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={[styles.cta, busy && { opacity: 0.7 }]} disabled={busy} onPress={() => void connect()}>
              <Text style={styles.ctaLabel}>
                {busy ? 'Autorizando…' : 'Conectar Strava'}
              </Text>
            </Pressable>
          )}
          {oauthMsg ? <Text style={styles.oauthMsg}>{oauthMsg}</Text> : null}
          <Text style={styles.envHint}>
            {stravaOAuthReady()
              ? 'OAuth real listo (Client ID + Secret). Redirect: run4travel://strava/callback'
              : stravaEnvConfigured()
                ? 'Client ID presente · añade EXPO_PUBLIC_STRAVA_CLIENT_SECRET para OAuth real'
                : 'Demo: sin EXPO_PUBLIC_STRAVA_CLIENT_ID (mock OK)'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Red (demo)</Text>
          <Pressable
            style={styles.switchRow}
            onPress={() => {
              const next = !online;
              setOnline(next);
              setMockNetworkOnline(next);
            }}
          >
            <Text style={styles.switchLabel}>Estado</Text>
            <Text style={[styles.switchValue, !online && styles.offline]}>
              {online ? 'Online' : 'Offline · cola activa'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Outbox</Text>
          <Text style={styles.value}>
            {job
              ? `${outboxStatusLabel(job.status)}${
                  job.stravaActivityId ? ` · ${job.stravaActivityId}` : ''
                }`
              : 'Sin jobs para este run'}
          </Text>
          {job?.lastError ? (
            <Text style={styles.errorHint}>{job.lastError}</Text>
          ) : null}
          {pendingCount > 0 ? (
            <Text style={styles.hint}>{pendingCount} en cola (todas las carreras)</Text>
          ) : null}
          {jobs.length > 0 ? (
            <View style={styles.jobList}>
              {jobs.slice(0, 5).map((j) => (
                <Text key={j.id} style={styles.jobRow}>
                  {j.runId.slice(0, 12)}… · {outboxStatusLabel(j.status)}
                  {j.attempts ? ` · x${j.attempts}` : ''}
                </Text>
              ))}
            </View>
          ) : null}
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
                Alert.alert(
                  'Sincronizado',
                  conn.mode === 'oauth'
                    ? 'Actividad enviada a Strava.'
                    : 'Actividad enviada a Strava (mock).',
                );
              } else {
                Alert.alert('Pendiente', 'Revisa el estado del outbox.');
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={styles.ctaLabel}>
            {busy ? 'Sincronizando…' : 'Sincronizar con Strava'}
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
      </ScrollView>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
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
  errorHint: {
    marginTop: 6,
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.terracotta,
  },
  envHint: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.secondaryText,
  },
  oauthMsg: {
    marginTop: 8,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.seaGreen,
  },
  switchRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  switchValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.seaGreen,
  },
  offline: { color: colors.terracotta },
  jobList: { marginTop: 10, gap: 4 },
  jobRow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.secondaryText,
  },
  cta: {
    marginTop: 4,
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
  ghostBtn: { marginTop: 10, alignSelf: 'flex-start' },
  ghostLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.terracotta,
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
