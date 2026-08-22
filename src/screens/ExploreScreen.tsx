import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { Chip } from '../components/Chip';
import { TabBar } from '../components/TabBar';
import { CITIES } from '../data/cities';
import { searchCities } from '../services/citiesApi';
import { track } from '../services/analytics';
import {
  ROUTE_STYLE_LABELS,
  ROUTE_STYLES,
  type City,
  type RouteStyle,
} from '../types/routeIntent';
import { colors, fonts, radii, spacing, type TabId } from '../theme';

type Props = {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  onCreateRoute?: (city?: City, style?: RouteStyle) => void;
};

export function ExploreScreen({
  activeTab = 'Explorar',
  onTabChange,
  onCreateRoute,
}: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState<RouteStyle>('highlights');

  useEffect(() => {
    track('explore_viewed', {});
  }, []);

  const cities = useMemo(() => searchCities(query), [query]);

  const pickCity = useCallback(
    (city: City) => {
      if (!city.supported) return;
      track('explore_city_selected', { cityId: city.id });
      onCreateRoute?.(city, style);
    },
    [onCreateRoute, style],
  );

  return (
    <BatlloBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Explorar</Text>
        <Text style={styles.subtitle}>
          Ciudades con alma · elige vibra y ✦ crea tu ruta
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar ciudad…"
          placeholderTextColor={colors.secondaryText}
          style={styles.search}
          autoCorrect={false}
        />

        <Text style={styles.section}>Estilo de ruta</Text>
        <View style={styles.chips}>
          {ROUTE_STYLES.map((s) => (
            <Chip
              key={s}
              label={ROUTE_STYLE_LABELS[s]}
              selected={style === s}
              onPress={() => {
                setStyle(s);
                track('explore_style_tapped', { style: s });
              }}
            />
          ))}
        </View>

        <Text style={styles.section}>Ciudades</Text>
        {cities.map((city) => (
          <Pressable
            key={city.id}
            style={[styles.cityCard, !city.supported && styles.citySoon]}
            onPress={() => pickCity(city)}
            disabled={!city.supported}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cityName}>{city.name}</Text>
              <Text style={styles.cityMeta}>{city.country}</Text>
            </View>
            <Text style={city.supported ? styles.cta : styles.soon}>
              {city.supported ? '✦ Correr' : 'Próximamente'}
            </Text>
          </Pressable>
        ))}

        <Text style={styles.hint}>
          {CITIES.filter((c) => c.supported).length} ciudades listas · estilo:{' '}
          {ROUTE_STYLE_LABELS[style]}
        </Text>
      </ScrollView>
      <TabBar active={activeTab} onChange={onTabChange} />
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 32,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 8,
  },
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
  },
  section: {
    marginTop: 10,
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.ink,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...radii.cardSoft,
  },
  citySoon: { opacity: 0.65 },
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
  },
  cta: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.terracotta,
  },
  soon: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.amber,
  },
  hint: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
});
