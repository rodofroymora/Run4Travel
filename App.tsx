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
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActiveRunScreen } from './src/screens/ActiveRunScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { ClubsScreen } from './src/screens/ClubsScreen';
import { CreateRouteScreen } from './src/screens/CreateRouteScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { GeneratingRouteScreen } from './src/screens/GeneratingRouteScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RoutePreviewScreen } from './src/screens/RoutePreviewScreen';
import { ShareScreen } from './src/screens/ShareScreen';
import { StravaScreen } from './src/screens/StravaScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { loadLastRouteIntent } from './src/services/routeIntentStorage';
import type { DiscoveryRoute } from './src/types/discovery';
import type { City, RouteIntent, RouteStyle } from './src/types/routeIntent';
import type { RunSession } from './src/types/run';
import { colors, type TabId } from './src/theme';

type Screen =
  | 'home'
  | 'explore'
  | 'clubs'
  | 'profile'
  | 'create'
  | 'generating'
  | 'preview'
  | 'run'
  | 'summary'
  | 'album'
  | 'share'
  | 'strava';

export default function App() {
  const [fontsLoaded] = useFonts({
    Gabarito_700Bold,
    Gabarito_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const [screen, setScreen] = useState<Screen>('home');
  const [tab, setTab] = useState<TabId>('Hoy');
  const [intent, setIntent] = useState<RouteIntent | null>(null);
  const [cityName, setCityName] = useState('Barcelona');
  const [route, setRoute] = useState<DiscoveryRoute | null>(null);
  const [session, setSession] = useState<RunSession | null>(null);
  const [createSeed, setCreateSeed] = useState<{
    city?: City;
    style?: RouteStyle;
  } | null>(null);

  useEffect(() => {
    loadLastRouteIntent().then((last) => {
      if (last) {
        setIntent(last);
        setCityName(last.cityName);
      }
    });
  }, []);

  const goHome = useCallback(() => {
    setTab('Hoy');
    setScreen('home');
  }, []);
  const goCreate = useCallback((city?: City, style?: RouteStyle) => {
    setCreateSeed(city || style ? { city, style } : null);
    if (city) setCityName(city.name);
    setScreen('create');
  }, []);

  const onTabChange = useCallback((next: TabId) => {
    setTab(next);
    if (next === 'Hoy') setScreen('home');
    else if (next === 'Explorar') setScreen('explore');
    else if (next === 'Perfil') setScreen('profile');
  }, []);

  const onConfirmed = useCallback((next: RouteIntent) => {
    setIntent(next);
    setCityName(next.cityName);
    setCreateSeed(null);
    setScreen('generating');
  }, []);

  const onRouteReady = useCallback((next: DiscoveryRoute) => {
    setRoute(next);
    setScreen('preview');
  }, []);

  const onRunFinished = useCallback((next: RunSession) => {
    setSession(next);
    setScreen('summary');
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
          onTabChange={onTabChange}
          onCreateRoute={() => goCreate()}
          onStartRun={() => {
            if (route) setScreen('preview');
            else goCreate();
          }}
          readyRoute={route}
        />
      )}
      {screen === 'explore' && (
        <ExploreScreen
          activeTab={tab}
          onTabChange={onTabChange}
          onCreateRoute={(city, style) => goCreate(city, style)}
        />
      )}
      {screen === 'clubs' && (
        <ClubsScreen
          cityId={intent?.cityId ?? route?.intent.cityId ?? 'barcelona'}
          cityName={cityName}
          activeTab={tab}
          onTabChange={onTabChange}
        />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          activeTab={tab}
          onTabChange={onTabChange}
          onCreateRoute={() => goCreate()}
          hasRecentSession={Boolean(session)}
          onOpenStrava={() => {
            if (session) setScreen('strava');
          }}
        />
      )}
      {screen === 'create' && (
        <CreateRouteScreen
          initialCityName={createSeed?.city?.name}
          initialCity={createSeed?.city}
          initialStyle={createSeed?.style}
          onClose={goHome}
          onConfirmed={onConfirmed}
        />
      )}
      {screen === 'generating' && intent && (
        <GeneratingRouteScreen
          intent={intent}
          onReady={onRouteReady}
          onCancel={goHome}
        />
      )}
      {screen === 'preview' && route && (
        <RoutePreviewScreen
          route={route}
          onBack={goHome}
          onStart={() => {
            setScreen('run');
          }}
        />
      )}
      {screen === 'run' && route && (
        <ActiveRunScreen
          route={route}
          onFinished={onRunFinished}
          onDiscard={() => setScreen('preview')}
        />
      )}
      {screen === 'summary' && session && route && (
        <SummaryScreen
          session={session}
          route={route}
          onBack={goHome}
          onShare={() => setScreen('share')}
          onSave={goHome}
          onViewAlbum={() => setScreen('album')}
          onStrava={() => setScreen('strava')}
        />
      )}
      {screen === 'album' && session && (
        <AlbumScreen
          runId={session.id}
          onBack={() => setScreen('summary')}
          onShare={() => setScreen('share')}
        />
      )}
      {screen === 'share' && session && route && (
        <ShareScreen
          runId={session.id}
          routeName={route.name}
          cityName={route.intent.cityName}
          onBack={() => setScreen(session ? 'summary' : 'home')}
          onDone={() => setScreen('summary')}
        />
      )}
      {screen === 'strava' && session && (
        <StravaScreen session={session} onBack={() => setScreen('summary')} />
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
