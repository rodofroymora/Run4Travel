import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { Chip } from '../components/Chip';
import {
  buildRouteIntent,
  distanceLabel,
  isRouteIntentComplete,
  snapStartToCity,
  type RouteIntentDraft,
} from '../domain/routeIntent';
import { getStartSuggestions, getStartSuggestionsAsync, resolveCityQuery, searchCities, suggestDiscoveryCities } from '../services/citiesApi';
import { track } from '../services/analytics';
import { saveLastRouteIntent } from '../services/routeIntentStorage';
import { colors, fonts, radii, spacing } from '../theme';
import {
  DISTANCE_KM,
  ROUTE_STYLES,
  ROUTE_STYLE_LABELS,
  type City,
  type DistanceKm,
  type RouteIntent,
  type RouteStyle,
} from '../types/routeIntent';

type Step = 'city' | 'start' | 'distance' | 'style';

const STEPS: Step[] = ['city', 'start', 'distance', 'style'];

const STEP_TITLE: Record<Step, string> = {
  city: '¿Qué ciudad corremos?',
  start: '¿Desde dónde sales?',
  distance: '¿Cuántos kilómetros?',
  style: '¿Qué quieres descubrir?',
};

type Props = {
  onClose: () => void;
  onConfirmed: (intent: RouteIntent) => void;
  initialCityName?: string;
  initialCity?: City;
  initialStyle?: RouteStyle;
};

export function CreateRouteScreen({
  onClose,
  onConfirmed,
  initialCityName,
  initialCity,
  initialStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const seededCity =
    initialCity ??
    (initialCityName
      ? searchCities(initialCityName).find(
          (c) => c.name.toLowerCase() === initialCityName.toLowerCase(),
        )
      : undefined);
  const [step, setStep] = useState<Step>(seededCity?.supported ? 'start' : 'city');
  const [query, setQuery] = useState(seededCity?.name ?? initialCityName ?? '');
  const [draft, setDraft] = useState<RouteIntentDraft>({
    city: seededCity?.supported ? seededCity : undefined,
    style: initialStyle ?? 'highlights',
    locale: seededCity?.locales[0] ?? 'es-ES',
  });
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [resolvingCity, setResolvingCity] = useState(false);
  const [cityHint, setCityHint] = useState<string | null>(null);
  const [aiCities, setAiCities] = useState<string[]>([]);

  const cities = useMemo(() => searchCities(query), [query]);
  const suggestions = useMemo(
    () => (draft.city ? getStartSuggestions(draft.city.id) : []),
    [draft.city],
  );
  const [startSuggestions, setStartSuggestions] = useState<typeof suggestions>([]);

  useEffect(() => {
    track('route_intent_started');
    if (seededCity?.supported) {
      track('city_selected', { cityId: seededCity.id, source: 'explore' });
    }
  }, [seededCity]);

  useEffect(() => {
    setStartSuggestions(suggestions);
    if (!draft.city) return;
    let cancelled = false;
    getStartSuggestionsAsync(draft.city).then((list) => {
      if (!cancelled && list.length) setStartSuggestions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.city, suggestions]);

  const stepIndex = STEPS.indexOf(step);
  const canContinue =
    (step === 'city' && !!draft.city) ||
    (step === 'start' && !!draft.start) ||
    (step === 'distance' && !!draft.distanceKm) ||
    (step === 'style' && !!draft.style);

  const resolveTypedCity = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setResolvingCity(true);
    setCityHint(null);
    try {
      const city = await resolveCityQuery(q);
      if (!city) {
        setCityHint('No encontramos esa ciudad. Prueba otro nombre.');
        return;
      }
      setDraft((d) => ({
        ...d,
        city,
        start: undefined,
        locale: city.locales[0],
      }));
      setQuery(city.name);
      setCityHint(
        city.id.startsWith('dyn-')
          ? `✦ Ciudad dinámica lista · ${city.country || city.name}`
          : null,
      );
      track('city_selected', { cityId: city.id, source: 'geocode' });
    } finally {
      setResolvingCity(false);
    }
  };

  const loadAiCities = async () => {
    setResolvingCity(true);
    try {
      const { names, usedFallback } = await suggestDiscoveryCities(query);
      setAiCities(names);
      setCityHint(
        usedFallback
          ? '✦ Sugerencias locales (sin clave IA)'
          : '✦ Ciudades sugeridas para Discovery Runs',
      );
    } finally {
      setResolvingCity(false);
    }
  };

  const goNext = () => {
    if (step === 'city' && draft.city && !draft.city.supported) {
      Alert.alert('Próximamente', `${draft.city.name} aún no está disponible. ¡Te avisamos!`);
      return;
    }
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1]);
      return;
    }
    confirm();
  };

  const goBack = () => {
    if (stepIndex === 0) {
      onClose();
      return;
    }
    setStep(STEPS[stepIndex - 1]);
  };

  const confirm = async () => {
    const intent = buildRouteIntent(draft);
    if (!intent || !isRouteIntentComplete(draft)) return;
    await saveLastRouteIntent(intent);
    track('route_intent_confirmed', {
      cityId: intent.cityId,
      distanceKm: intent.distanceKm,
      style: intent.style,
    });
    onConfirmed(intent);
  };

  const useCurrentLocation = async () => {
    if (!draft.city) return;
    setLocating(true);
    setLocationHint(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      track('location_permission', { status });
      if (status !== 'granted') {
        setLocationHint('Sin ubicación: elige un punto de la lista. El flujo sigue.');
        return;
      }

      // Web/desktop a menudo cuelga en getCurrentPosition — timeout + lastKnown
      const timeoutMs = 8000;
      const pos = await Promise.race([
        (async () => {
          const last = await Location.getLastKnownPositionAsync();
          if (last) return last;
          return Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        })(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);

      if (!pos) {
        setLocationHint(
          'GPS tardó demasiado. Elige un punto de la lista (en web es lo más fiable).',
        );
        track('location_timeout', { cityId: draft.city.id });
        return;
      }

      const raw = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: 'Estoy aquí',
      };
      const snapped = snapStartToCity(raw, draft.city);
      const wasOutside = snapped.lat !== raw.lat || snapped.lng !== raw.lng;
      setDraft((d) => ({ ...d, start: snapped }));
      if (wasOutside) {
        setLocationHint('Estabas fuera de la ciudad — usamos el centro como partida.');
      } else {
        setLocationHint('Listo: partimos desde tu ubicación.');
      }
    } catch {
      setLocationHint('No pudimos leer el GPS. Elige un punto de la lista.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <BatlloBackground>
      <View style={[styles.shell, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12}>
            <Text style={styles.back}>{stepIndex === 0 ? 'Cerrar' : '← Atrás'}</Text>
          </Pressable>
          <Text style={styles.stepCount}>
            {stepIndex + 1}/{STEPS.length}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[styles.progressSeg, i <= stepIndex && styles.progressSegOn]}
            />
          ))}
        </View>

        <Text style={styles.title}>{STEP_TITLE[step]}</Text>
        <Text style={styles.subtitle}>
          {step === 'style'
            ? 'Default: Highlights — cámbialo si quieres otra vibra.'
            : 'Distance is a constraint. Experience is the objective.'}
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'city' && (
            <View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar ciudad… (cualquier ciudad)"
                placeholderTextColor={colors.secondaryText}
                style={styles.search}
                autoCorrect={false}
                onSubmitEditing={() => void resolveTypedCity()}
              />
              <View style={styles.cityActions}>
                <Pressable
                  style={[styles.cityActionBtn, resolvingCity && styles.pressed]}
                  onPress={() => void resolveTypedCity()}
                  disabled={resolvingCity}
                >
                  {resolvingCity ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.cityActionLabel}>✦ Descubrir ciudad</Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.cityActionGhost}
                  onPress={() => void loadAiCities()}
                  disabled={resolvingCity}
                >
                  <Text style={styles.cityActionGhostLabel}>✦ Sugerir ciudades</Text>
                </Pressable>
              </View>
              {cityHint ? <Text style={styles.hint}>{cityHint}</Text> : null}
              {aiCities.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    setQuery(name);
                    void (async () => {
                      setResolvingCity(true);
                      try {
                        const city = await resolveCityQuery(name);
                        if (city) {
                          setDraft((d) => ({
                            ...d,
                            city,
                            start: undefined,
                            locale: city.locales[0],
                          }));
                          setQuery(city.name);
                          track('city_selected', { cityId: city.id, source: 'ai_suggest' });
                        }
                      } finally {
                        setResolvingCity(false);
                      }
                    })();
                  }}
                  style={styles.cityRow}
                >
                  <Text style={styles.cityName}>✦ {name}</Text>
                </Pressable>
              ))}
              {cities.map((city) => {
                const selected = draft.city?.id === city.id;
                return (
                  <Pressable
                    key={city.id}
                    onPress={() => {
                      setDraft((d) => ({
                        ...d,
                        city,
                        start: undefined,
                        locale: city.locales[0],
                      }));
                      track('city_selected', { cityId: city.id });
                    }}
                    style={[styles.cityRow, selected && styles.cityRowOn]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityName}>{city.name}</Text>
                      <Text style={styles.cityMeta}>
                        {city.country}
                        {city.id.startsWith('dyn-') ? ' · dinámica' : ''}
                      </Text>
                    </View>
                    {!city.supported ? (
                      <Text style={styles.soon}>Próximamente</Text>
                    ) : selected ? (
                      <Text style={styles.check}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 'start' && draft.city && (
            <View>
              <View style={styles.mapCard}>
                <View style={styles.mapBlob} />
                <Text style={styles.mapCity}>{draft.city.name}</Text>
                <Text style={styles.mapPin}>
                  {draft.start?.label ?? 'Elige un punto de partida'}
                </Text>
                {draft.start ? (
                  <Text style={styles.mapCoords}>
                    {draft.start.lat.toFixed(4)}, {draft.start.lng.toFixed(4)}
                  </Text>
                ) : null}
              </View>

              <Pressable
                style={({ pressed }) => [styles.hereBtn, pressed && styles.pressed]}
                onPress={useCurrentLocation}
                disabled={locating}
              >
                {locating ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.hereLabel}>Estoy aquí</Text>
                )}
              </Pressable>
              {locating ? (
                <Text style={styles.hint}>Buscando GPS… máx. 8 s (en web mejor elige un POI)</Text>
              ) : null}
              {locationHint ? <Text style={styles.hint}>{locationHint}</Text> : null}

              <Text style={styles.sectionLabel}>Sugerencias</Text>
              {startSuggestions.map((s) => {
                const selected = draft.start?.label === s.label;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        start: { lat: s.lat, lng: s.lng, label: s.label },
                      }))
                    }
                    style={[styles.cityRow, selected && styles.cityRowOn]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityName}>{s.label}</Text>
                      <Text style={styles.cityMeta}>{s.kind}</Text>
                    </View>
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 'distance' && (
            <View style={styles.chipWrap}>
              {DISTANCE_KM.map((km) => (
                <Chip
                  key={km}
                  label={distanceLabel(km)}
                  selected={draft.distanceKm === km}
                  onPress={() => {
                    setDraft((d) => ({ ...d, distanceKm: km as DistanceKm }));
                    track('distance_selected', { distanceKm: km });
                  }}
                />
              ))}
              {draft.distanceKm === 42 ? (
                <Text style={styles.hint}>
                  42K: si corre de noche, prioriza rutas bien iluminadas. La seguridad va primero.
                </Text>
              ) : null}
            </View>
          )}

          {step === 'style' && (
            <View style={styles.chipWrap}>
              {ROUTE_STYLES.map((style) => (
                <Chip
                  key={style}
                  label={ROUTE_STYLE_LABELS[style]}
                  selected={draft.style === style}
                  onPress={() => {
                    setDraft((d) => ({ ...d, style: style as RouteStyle }));
                    track('style_selected', { style });
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              !canContinue && styles.ctaDisabled,
              pressed && canContinue && styles.pressed,
            ]}
            disabled={!canContinue}
            onPress={goNext}
          >
            <Text style={styles.ctaLabel}>
              {step === 'style' ? '✦ Crear mi ruta' : 'Continuar'}
            </Text>
          </Pressable>
        </View>
      </View>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.secondaryText,
  },
  stepCount: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.secondaryText,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borders,
  },
  progressSegOn: {
    backgroundColor: colors.terracotta,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    letterSpacing: -0.56,
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 18,
  },
  scroll: { flex: 1 },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 12,
  },
  cityActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  cityActionBtn: {
    backgroundColor: colors.terracotta,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    minWidth: 140,
    alignItems: 'center',
  },
  cityActionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
  cityActionGhost: {
    borderWidth: 1,
    borderColor: colors.borders,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  cityActionGhostLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 36,
  },
  cityRowOn: {
    borderColor: colors.terracotta,
    backgroundColor: '#fff3ea',
  },
  cityName: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
  },
  cityMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  soon: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.amber,
  },
  check: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.terracotta,
  },
  mapCard: {
    backgroundColor: colors.mediterraneanBlue,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
    minHeight: 140,
    justifyContent: 'flex-end',
    ...radii.cardSoft,
  },
  mapBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    right: -30,
    top: -40,
    backgroundColor: colors.seaGreen,
    opacity: 0.35,
    borderRadius: 80,
  },
  mapCity: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: 'rgba(255,248,239,0.75)',
    marginBottom: 6,
  },
  mapPin: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.3,
  },
  mapCoords: {
    marginTop: 6,
    fontFamily: fonts.mono,
    fontSize: 11,
    color: 'rgba(255,248,239,0.7)',
  },
  hereBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
    marginBottom: 8,
  },
  hereLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.white,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 12,
    lineHeight: 18,
  },
  sectionLabel: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 10,
    marginTop: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  footer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  cta: {
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    ...radii.primaryButton,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
  pressed: { opacity: 0.88 },
});
