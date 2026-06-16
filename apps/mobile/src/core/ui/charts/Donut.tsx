import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Donut —— 甜甜圈圖（aa-analysis-charts.jsx:42 `ADonut`），react-native-svg 自繪。
 * 用於資產類別佔比（個股 / ETF）。各段 stroke 弧 + 段間 gap；可塞中心內容。
 *
 * 純展示：`segments[].value` 為相對權重（顯示佔比，內部換算 %，非 Money）；
 * `color` 由 screens 帶 theme `chartCategory`；中心金額 / 報酬率以 `center` 槽傳入。
 */
export interface DonutSegment {
  /** 相對權重（用於算佔比，非金額精度）。 */
  value: number;
  color: string;
  label?: string;
}

interface DonutProps {
  segments: readonly DonutSegment[];
  size?: number;
  thickness?: number;
  /** 中心內容（持股市值 / 報酬率），screens 預格式化後傳入。 */
  center?: ReactNode;
  /** 段間間隙（弧度）。 */
  gap?: number;
}

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export default function Donut({
  segments,
  size = 160,
  thickness = 26,
  center,
  gap = 0.055,
}: DonutProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0) || 1;

  let cursor = -Math.PI / 2;
  const arcs = segments.map((s) => {
    const sweep = (Math.max(s.value, 0) / total) * Math.PI * 2;
    const a0 = cursor + gap / 2;
    const a1 = cursor + sweep - gap / 2;
    cursor += sweep;
    const [x0, y0] = polar(cx, cy, r, a0);
    const [x1, y1] = polar(cx, cy, r, a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return {
      color: s.color,
      d: `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
    };
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((a, i) => (
          <Path
            key={i}
            d={a.d}
            fill="none"
            stroke={a.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
          />
        ))}
      </Svg>
      {center ? <View style={styles.center}>{center}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
