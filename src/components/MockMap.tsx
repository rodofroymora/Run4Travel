import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { colors, fonts, radii } from '../theme';

type Marker = {
  id: string;
  lng: number;
  lat: number;
  kind: 'story' | 'photo' | 'user';
  index?: number;
  label?: string;
};

type Props = {
  coordinates: [number, number][];
  markers?: Marker[];
  height?: number;
  label?: string;
  selectedMarkerId?: string | null;
  showLegend?: boolean;
};

function project(
  coords: [number, number][],
  markers: Marker[],
  width: number,
  height: number,
  pad = 28,
) {
  const points = [
    ...coords,
    ...markers.map((m) => [m.lng, m.lat] as [number, number]),
  ];
  if (!points.length) {
    return {
      poly: '',
      markers: [] as {
        x: number;
        y: number;
        kind: Marker['kind'];
        id: string;
        index?: number;
      }[],
      start: null as { x: number; y: number } | null,
      end: null as { x: number; y: number } | null,
    };
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

  const poly = coords
    .map(([lng, lat]) => {
      const { x, y } = toXY(lng, lat);
      return `${x},${y}`;
    })
    .join(' ');

  const start = coords[0] ? toXY(coords[0][0], coords[0][1]) : null;
  const end = coords.length
    ? toXY(coords[coords.length - 1][0], coords[coords.length - 1][1])
    : null;

  return {
    poly,
    markers: markers.map((m) => ({
      ...toXY(m.lng, m.lat),
      kind: m.kind,
      id: m.id,
      index: m.index,
    })),
    start,
    end,
  };
}

function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

export function MockMap({
  coordinates,
  markers = [],
  height = 260,
  label = 'Mapa · demo',
  selectedMarkerId = null,
  showLegend = true,
}: Props) {
  const width = 340;
  const projected = project(coordinates, markers, width, height);

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} fill={colors.ink} rx={28} />
        <Rect
          x={10}
          y={10}
          width={width - 20}
          height={height - 20}
          fill="#2f2418"
          rx={22}
        />
        {/* Trama suave tipo calles */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Line
            key={`h-${i}`}
            x1={18}
            y1={28 + i * ((height - 48) / 5)}
            x2={width - 18}
            y2={28 + i * ((height - 48) / 5)}
            stroke="rgba(234,217,189,0.07)"
            strokeWidth={1}
          />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <Line
            key={`v-${i}`}
            x1={30 + i * ((width - 56) / 4)}
            y1={18}
            x2={30 + i * ((width - 56) / 4)}
            y2={height - 18}
            stroke="rgba(234,217,189,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Halo de ruta */}
        {projected.poly ? (
          <Polyline
            points={projected.poly}
            fill="none"
            stroke="rgba(226,96,60,0.28)"
            strokeWidth={9}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
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

        {projected.start ? (
          <Circle
            cx={projected.start.x}
            cy={projected.start.y}
            r={6}
            fill={colors.seaGreen}
            stroke={colors.surface}
            strokeWidth={2}
          />
        ) : null}
        {projected.end && projected.start ? (
          <Circle
            cx={projected.end.x}
            cy={projected.end.y}
            r={6}
            fill={colors.terracotta}
            stroke={colors.surface}
            strokeWidth={2}
          />
        ) : null}

        {projected.markers.map((m) => {
          const selected = m.id === selectedMarkerId;
          if (m.kind === 'photo') {
            const r = selected ? 8 : 6;
            return (
              <Polygon
                key={m.id}
                points={diamondPoints(m.x, m.y, r)}
                fill={colors.mosaicYellow}
                stroke={selected ? colors.white : colors.surface}
                strokeWidth={selected ? 2.5 : 1.5}
              />
            );
          }
          if (m.kind === 'user') {
            return (
              <Circle
                key={m.id}
                cx={m.x}
                cy={m.y}
                r={7}
                fill={colors.seaGreen}
                stroke={colors.surface}
                strokeWidth={2}
              />
            );
          }
          const r = selected ? 11 : 9;
          return (
            <G key={m.id}>
              <Circle
                cx={m.x}
                cy={m.y}
                r={r}
                fill={colors.mediterraneanBlue}
                stroke={selected ? colors.mosaicYellow : colors.surface}
                strokeWidth={selected ? 2.5 : 1.5}
              />
              {m.index != null ? (
                <SvgText
                  x={m.x}
                  y={m.y + 3.5}
                  fill={colors.white}
                  fontSize={9}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {String(m.index)}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Svg>

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
