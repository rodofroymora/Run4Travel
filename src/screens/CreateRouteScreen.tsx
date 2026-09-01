import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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
import { getCurrentCoords } from '../services/currentLocation';
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
  type StartSuggestion,
} from '../types/routeIntent';

const START_KIND_LABEL: Record<StartSuggestion['kind'], string> = {
  zone: 'Zona',
  plaza: 'Plaza',
  landmark: 'Punto',
  hotel: 'Hotel',
  station: 'Estación',
};

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
  const [step, setStep] = useState<Step>('city');
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

  const zoneStarts = useMemo(
    () => startSuggestions.filter((s) => s.kind === 'zone'),
    [startSuggestions],
  );
  const otherStarts = useMemo(
    () => startSuggestions.filter((s) => s.kind !== 'zone'),
    [startSuggestions],
  );

  const pickStart = (s: StartSuggestion) => {
    setDraft((d) => ({
      ...d,
      start: { lat: s.lat, lng: s.lng, label: s.label },
    }));
    track('start_selected', { startId: s.id, kind: s.kind });
  };

  const stepIndex = STEPS.indexOf(step);
  const canContinue =
    (step === 'city' && (!!draft.city || query.trim().length >= 2)) ||
    (step === 'start' && !!draft.start) ||
    (step === 'distance' && !!draft.distanceKm) ||
    (step === 'style' && !!draft.style);

  const resolveTypedCity = async (): Promise<City | null> => {
    const q = query.trim();
    if (draft.city && (!q || draft.city.name.toLowerCase() === q.toLowerCase())) {
      return draft.city;
    }
    if (q.length < 2) {
      if (draft.city) return draft.city;
      return null;
    }
    // Already selected this city — no need to geocode again
    if (draft.city && draft.city.name.toLowerCase() === q.toLowerCase()) {
      return draft.city;
    }
    setResolvingCity(true);
    setCityHint(null);
    try {
      const city = await resolveCityQuery(q);
      if (!city) {
        setCityHint('No encontramos esa ciudad. Prueba otro nombre o pulsa ✦ Descubrir ciudad.');
        return null;
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
          : `Ciudad lista · ${city.name}`,
      );
      track('city_selected', { cityId: city.id, source: 'geocode' });
      return city;
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

  const goNext = async () => {
    if (step === 'city') {
      let city: City | null | undefined = draft.city;
      const q = query.trim();
      // Selected from list but search box empty/outdated → keep selection
      const selectionOk =
        city &&
        (!q ||
          city.name.toLowerCase() === q.toLowerCase() ||
          city.name.toLowerCase().includes(q.toLowerCase()));
      if (!selectionOk) {
        city = await resolveTypedCity();
      } else if (city) {
        setQuery(city.name);
      }
      if (!city) {
        setCityHint('Elige una ciudad de la lista o escribe su nombre.');
        return;
      }
      if (!city.supported) {
        Alert.alert('Próximamente', `${city.name} aún no está disponible. ¡Te avisamos!`);
        return;
      }
    }
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1]!);
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
        setLocationHint('Sin GPS: elige una zona (recomendado en web).');
        return;
      }

      const coords = await getCurrentCoords(9000);
      if (!coords) {
        setLocationHint(
          'GPS no respondió a tiempo. Elige una zona — Angelópolis, Centro…',
        );
        track('location_timeout', { cityId: draft.city.id });
        return;
      }

      const raw = {
        lat: coords.lat,
        lng: coords.lng,
        label: 'Estoy aquí',
      };
      const snapped = snapStartToCity(raw, draft.city);
      const wasOutside = snapped.lat !== raw.lat || snapped.lng !== raw.lng;
      setDraft((d) => ({ ...d, start: snapped }));
      if (wasOutside) {
        setLocationHint('Estabas fuera — usamos el centro. Mejor elige una zona.');
      } else {
        setLocationHint('Listo: partimos desde tu ubicación.');
      }
    } catch {
      setLocationHint('No pudimos leer el GPS. Elige una zona de la lista.');
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
          {step === 'city'
            ? 'Escribe Guanajuato, Puebla… y Continuar (o ✦ Descubrir ciudad).'
            : step === 'style'
              ? 'Default: Highlights — o Cafés si quieres un coffee run con descuento al terminar.'
              : step === 'start'
                ? 'Elige una zona primero (Angelópolis, Centro…). GPS es opcional.'
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
                      setQuery(city.name);
                      setCityHint(null);
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
              <Pressable
                onPress={() => {
                  setStep('city');
                  setLocationHint(null);
                }}
                style={styles.changeCityBtn}
              >
                <Text style={styles.changeCityLabel}>
                  Ciudad: {draft.city.name} · Cambiar
                </Text>
              </Pressable>

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

              <Text style={styles.sectionLabel}>Zonas</Text>
              <Text style={styles.hint}>
                Elige de dónde sales — en web es más fiable que el GPS.
              </Text>
              {zoneStarts.map((s) => {
                const selected = draft.start?.label === s.label;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => pickStart(s)}
                    style={[styles.cityRow, selected && styles.cityRowOn]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityName}>{s.label}</Text>
                      <Text style={styles.cityMeta}>{START_KIND_LABEL[s.kind]}</Text>
                    </View>
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}

              {otherStarts.length > 0 ? (
                <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Puntos</Text>
              ) : null}
              {otherStarts.map((s) => {
                const selected = draft.start?.label === s.label;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => pickStart(s)}
                    style={[styles.cityRow, selected && styles.cityRowOn]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityName}>{s.label}</Text>
                      <Text style={styles.cityMeta}>{START_KIND_LABEL[s.kind]}</Text>
                    </View>
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}

              <Pressable
                style={({ pressed }) => [
                  styles.hereBtnGhost,
                  pressed && styles.pressed,
                  locating && styles.ctaDisabled,
                ]}
                onPress={useCurrentLocation}
                disabled={locating}
              >
                {locating ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <Text style={styles.hereGhostLabel}>
                    {Platform.OS === 'web'
                      ? 'Intentar GPS (poco fiable en web)'
                      : 'Estoy aquí (GPS)'}
                  </Text>
                )}
              </Pressable>
              {locating ? (
                <Text style={styles.hint}>Buscando GPS… máx. 8 s</Text>
              ) : null}
              {locationHint ? <Text style={styles.hint}>{locationHint}</Text> : null}
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
              (!canContinue || resolvingCity) && styles.ctaDisabled,
              pressed && canContinue && !resolvingCity && styles.pressed,
            ]}
            disabled={!canContinue || resolvingCity}
            onPress={() => void goNext()}
          >
            <Text style={styles.ctaLabel}>
              {resolvingCity && step === 'city'
                ? '✦ Buscando ciudad…'
                : step === 'style'
                  ? '✦ Crear mi ruta'
                  : 'Continuar'}
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
  hereBtnGhost: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.borders,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
    marginBottom: 8,
  },
  hereGhostLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
  },
  changeCityBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  changeCityLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.terracotta,
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
