import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Gabarito_700Bold,
  Gabarito_800ExtraBold,
} from '@expo-google-fonts/gabarito';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CreateRouteScreen } from './src/screens/CreateRouteScreen';
import { GeneratingRouteScreen } from './src/screens/GeneratingRouteScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { loadLastRouteIntent } from './src/services/routeIntentStorage';
import type { RouteIntent } from './src/types/routeIntent';
import { colors, type TabId } from './src/theme';

type Screen = 'home' | 'create' | 'generating' | 'summary';

export default function App() {
  const [fontsLoaded] = useFonts({
    Gabarito_700Bold,
    Gabarito_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const [screen, setScreen] = useState<Screen>('home');
  const [tab, setTab] = useState<TabId>('Hoy');
  const [intent, setIntent] = useState<RouteIntent | null>(null);
  const [cityName, setCityName] = useState('Barcelona');

  useEffect(() => {
    loadLastRouteIntent().then((last) => {
      if (last) {
        setIntent(last);
        setCityName(last.cityName);
      }
    });
  }, []);

  const goHome = useCallback(() => setScreen('home'), []);
  const goCreate = useCallback(() => setScreen('create'), []);
  const goSummary = useCallback(() => setScreen('summary'), []);

  const onConfirmed = useCallback((next: RouteIntent) => {
    setIntent(next);
    setCityName(next.cityName);
    setScreen('generating');
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.terracotta} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen === 'home' && (
        <HomeScreen
          cityName={cityName}
          activeTab={tab}
          onTabChange={setTab}
          onCreateRoute={goCreate}
          onStartRun={goSummary}
        />
      )}
      {screen === 'create' && (
        <CreateRouteScreen
          initialCityName={cityName}
          onClose={goHome}
          onConfirmed={onConfirmed}
        />
      )}
      {screen === 'generating' && intent && (
        <GeneratingRouteScreen intent={intent} onDone={goHome} />
      )}
      {screen === 'summary' && (
        <SummaryScreen
          onBack={goHome}
          onShare={goHome}
          onSave={goHome}
          onViewAlbum={goHome}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
