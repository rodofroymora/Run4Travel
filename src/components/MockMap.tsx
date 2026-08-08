import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';
import { colors, fonts, radii } from '../theme';

type Marker = {
  id: string;
  lng: number;
  lat: number;
  kind: 'story' | 'photo' | 'user';
};

type Props = {
  coordinates: [number, number][];
  markers?: Marker[];
  height?: number;
  label?: string;
};

function project(
  coords: [number, number][],
  markers: Marker[],
  width: number,
  height: number,
  pad = 24,
) {
  const points = [
    ...coords,
    ...markers.map((m) => [m.lng, m.lat] as [number, number]),
  ];
  if (!points.length) {
    return { poly: '', markers: [] as { x: number; y: number; kind: Marker['kind']; id: string }[] };
  }
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const dx = Math.max(maxLng - minLng, 0.0001);
  const dy = Math.max(maxLat - minLat, 0.0001);

  const toXY = (lng: number, lat: number) => ({
    x: pad + ((lng - minLng) / dx) * (width - pad * 2),
    y: pad + (1 - (lat - minLat) / dy) * (height - pad * 2),
  });

  const poly = coords.map(([lng, lat]) => {
    const { x, y } = toXY(lng, lat);
    return `${x},${y}`;
  }).join(' ');

  return {
    poly,
    markers: markers.map((m) => ({ ...toXY(m.lng, m.lat), kind: m.kind, id: m.id })),
  };
}

export function MockMap({
  coordinates,
  markers = [],
  height = 220,
  label = 'Mapa · demo',
}: Props) {
  const width = 320;
  const projected = project(coordinates, markers, width, height);

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} fill={colors.ink} rx={28} />
        <Rect x={12} y={12} width={width - 24} height={height - 24} fill="#3a2a1c" rx={22} />
        {projected.poly ? (
          <Polyline
            points={projected.poly}
            fill="none"
            stroke={colors.terracotta}
            strokeWidth={3.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {projected.markers.map((m) => (
          <Circle
            key={m.id}
            cx={m.x}
            cy={m.y}
            r={m.kind === 'user' ? 7 : 5}
            fill={
              m.kind === 'photo'
                ? colors.mosaicYellow
                : m.kind === 'user'
                  ? colors.seaGreen
                  : colors.mediterraneanBlue
            }
            stroke={colors.surface}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    ...radii.cardSoft,
    backgroundColor: colors.ink,
  },
  label: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,248,239,0.55)',
  },
});
