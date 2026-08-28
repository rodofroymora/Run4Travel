import { useMemo, createElement } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { getMapboxToken } from '../services/routing';
import {
  buildMapboxGlHtml,
  buildMapboxStaticUrl,
  type MapMarker,
} from '../services/mapboxMap';
import { MockMap } from './MockMap';

type Props = {
  coordinates: [number, number][];
  markers?: MapMarker[];
  height?: number;
  label?: string;
  selectedMarkerId?: string | null;
  showLegend?: boolean;
  /** Prefer interactive GL when token present (default true). */
  interactive?: boolean;
  /** Keep map centered on the user marker during an active run. */
  followUser?: boolean;
};

function MapHtmlSurface({ html, style }: { html: string; style: object }) {
  if (Platform.OS === 'web') {
    // react-native-webview is native-only; iframe works in the browser.
    return createElement('iframe', {
      srcDoc: html,
      style: {
        border: 'none',
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
      },
      title: 'Run4Travel map',
      sandbox: 'allow-scripts allow-same-origin',
    });
  }

  // Lazy require so web never mounts the stub WebView.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview') as typeof import('react-native-webview');
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={style}
      scrollEnabled={false}
      setSupportMultipleWindows={false}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
    />
  );
}

/**
 * Mapbox map when EXPO_PUBLIC_MAPBOX_TOKEN is set; otherwise Batlló MockMap.
 * Does not invent geometry — only renders router coordinates + catalog markers.
 */
export function RouteMap({
  coordinates,
  markers = [],
  height = 260,
  label,
  selectedMarkerId = null,
  showLegend = true,
  interactive = true,
  followUser = false,
}: Props) {
  const token = getMapboxToken();
  const html = useMemo(
    () =>
      interactive
        ? buildMapboxGlHtml({ coordinates, markers, selectedMarkerId, followUser })
        : null,
    [coordinates, markers, selectedMarkerId, interactive, followUser],
  );
  const staticUrl = useMemo(
    () => buildMapboxStaticUrl({ coordinates, markers, width: 680, height: height * 2 }),
    [coordinates, markers, height],
  );

  if (!token) {
    return (
      <MockMap
        coordinates={coordinates}
        markers={markers}
        height={height}
        label={label ?? 'Mapa · demo'}
        selectedMarkerId={selectedMarkerId}
        showLegend={showLegend}
      />
    );
  }

  if (html) {
    return (
      <View style={[styles.wrap, { height }]}>
        <MapHtmlSurface html={html} style={styles.webview} />
        {showLegend ? (
          <View style={styles.legend} pointerEvents="none">
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.mediterraneanBlue }]} />
              <Text style={styles.legendText}>Historias</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.diamond, { backgroundColor: colors.mosaicYellow }]} />
              <Text style={styles.legendText}>Foto</Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.label}>{label ?? 'Mapbox · walking'}</Text>
      </View>
    );
  }

  if (staticUrl) {
    return (
      <View style={[styles.wrap, { height }]}>
        <Image source={{ uri: staticUrl }} style={styles.image} resizeMode="cover" />
        <Text style={styles.label}>{label ?? 'Mapbox · static'}</Text>
      </View>
    );
  }

  return (
    <MockMap
      coordinates={coordinates}
      markers={markers}
      height={height}
      label={label ?? 'Mapa · demo'}
      selectedMarkerId={selectedMarkerId}
      showLegend={showLegend}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    ...radii.cardSoft,
    backgroundColor: colors.ink,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(43,29,18,0.55)',
    backgroundColor: 'rgba(255,248,239,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  legend: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(43,29,18,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: 'rgba(255,248,239,0.8)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  diamond: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },
});
