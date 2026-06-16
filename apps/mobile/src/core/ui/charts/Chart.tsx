import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../../theme';

/**
 * Chart —— 走勢 sparkline（aa-core.jsx:107 `chartPath` + 121 `Chart`），react-native-svg 自繪。
 * 平滑三次貝茲曲線 + accent 面積漸層 + accent 線漸層 + 末端點 + 虛線基準。
 * （prototype 的 gaussian-blur 光暈濾鏡跨平台不穩，故省略；視覺主體靠漸層 + 末點。）
 *
 * 純展示：`data` 為已備好的數列（screens 以 `toNumber()` 出圖，charting 容許失精度）。
 */
interface ChartProps {
  data: readonly number[];
  width?: number;
  height?: number;
  /** 線 / 面積色（預設 accent）。 */
  color?: string;
  dot?: boolean;
  baseline?: boolean;
}

interface ChartGeometry {
  line: string;
  area: string;
  last: readonly [number, number];
}

function buildPath(
  vals: readonly number[],
  w: number,
  h: number,
  pad: number,
): ChartGeometry | null {
  const n = vals.length;
  if (n < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const xs = (i: number) => pad + (i * (w - pad * 2)) / (n - 1);
  const ys = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const pts: [number, number][] = vals.map((v, i) => [xs(i), ys(v)]);

  const first = pts[0];
  const last = pts[n - 1];
  if (!first || !last) return null;

  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    if (!p0 || !p1) continue;
    const cx = (p0[0] + p1[0]) / 2;
    d += ` C ${cx} ${p0[1]} ${cx} ${p1[1]} ${p1[0]} ${p1[1]}`;
  }
  return {
    line: d,
    area: `${d} L ${last[0]} ${h} L ${first[0]} ${h} Z`,
    last,
  };
}

export default function Chart({
  data,
  width = 320,
  height = 150,
  color = colors.accent,
  dot = true,
  baseline = true,
}: ChartProps) {
  const id = useId();
  const geo = buildPath(data, width, height, 12);

  if (!geo) return <View style={{ width: '100%', height }} />;

  const areaId = `${id}-area`;
  const lineId = `${id}-line`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.34} />
          <Stop offset="55%" stopColor={color} stopOpacity={0.1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={color} stopOpacity={0.65} />
          <Stop offset="100%" stopColor={color} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      {baseline ? (
        <Line
          x1="0"
          y1={height - 12}
          x2={width}
          y2={height - 12}
          stroke={colors.divider}
          strokeWidth={1}
          strokeDasharray="2 5"
        />
      ) : null}
      <Path d={geo.area} fill={`url(#${areaId})`} />
      <Path
        d={geo.line}
        fill="none"
        stroke={`url(#${lineId})`}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {dot ? (
        <>
          <Circle cx={geo.last[0]} cy={geo.last[1]} r={6.5} fill={color} opacity={0.22} />
          <Circle
            cx={geo.last[0]}
            cy={geo.last[1]}
            r={3.4}
            fill={colors.onPrimary}
            stroke={color}
            strokeWidth={2}
          />
        </>
      ) : null}
    </Svg>
  );
}
