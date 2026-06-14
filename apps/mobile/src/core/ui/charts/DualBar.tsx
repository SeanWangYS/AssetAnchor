import { aNice } from '@assetanchor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../../theme';

/**
 * DualBar —— 直向雙柱分組圖（aa-analysis-charts.jsx:124 `ABarsVC`），純 RN View 自繪。
 * 預設用途：每標的「投入成本 vs 目前市值」。nice-number 軸頂（`aNice`，shared）+
 * 1.0 / 0.5 兩條虛線網格 + 短數字刻度 + x 軸標籤 + 圖例。
 *
 * 純展示：`data[].primary/secondary` 為已備好的數（screens 以 `toNumber()` 出圖）；
 * primary（accent 漸層）＝目前市值、secondary（淡）＝投入成本，可由 props 覆寫。
 */
export interface DualBarDatum {
  label: string;
  primary: number;
  secondary: number;
}

interface DualBarProps {
  data: readonly DualBarDatum[];
  height?: number;
  primaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

const SECONDARY = 'rgba(255,255,255,0.20)';

function shortNum(v: number): string {
  if (v >= 1000) {
    const k = v / 1000;
    return `${k % 1 ? k.toFixed(1) : k}K`;
  }
  return String(Math.round(v));
}

export default function DualBar({
  data,
  height = 126,
  primaryColor = colors.accent,
  primaryLabel = '目前市值',
  secondaryLabel = '投入成本',
}: DualBarProps) {
  const maxVal = data.reduce((m, d) => Math.max(m, d.primary, d.secondary), 0);
  const ceiling = aNice(maxVal) || 1;
  const pct = (v: number): `${number}%` => `${Math.max((v / ceiling) * 100, 0)}%`;

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {[1, 0.5].map((f) => (
          <View key={f} style={[styles.gridLine, { top: (1 - f) * height }]}>
            <Text style={styles.gridLabel}>{shortNum(ceiling * f)}</Text>
          </View>
        ))}
        <View style={styles.bars}>
          {data.map((d) => (
            <View key={d.label} style={styles.group}>
              <View
                style={[styles.bar, { height: pct(d.secondary), backgroundColor: SECONDARY }]}
              />
              <LinearGradient
                colors={[primaryColor, `${primaryColor}77`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.bar, { height: pct(d.primary) }]}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.axis} />
      <View style={styles.labels}>
        {data.map((d) => (
          <Text key={d.label} style={styles.xLabel} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <Legend color={SECONDARY} label={secondaryLabel} />
        <Legend color={primaryColor} label={primaryLabel} />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { position: 'relative', marginTop: 18 },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    borderStyle: 'dashed',
  },
  gridLabel: {
    position: 'absolute',
    right: 0,
    top: -13,
    fontFamily: fontFamily.num.medium,
    fontSize: 8.5,
    color: colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  bars: { flexDirection: 'row', gap: 6, height: '100%', alignItems: 'flex-end' },
  group: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: '100%',
  },
  bar: { width: 9, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  axis: { height: 1, backgroundColor: colors.divider },
  labels: { flexDirection: 'row', gap: 6, marginTop: 6 },
  xLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.num.medium,
    fontSize: 9,
    color: colors.textWeak,
    fontVariant: ['tabular-nums'],
  },
  legend: { flexDirection: 'row', gap: 16, marginTop: 11, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2.5 },
  legendLabel: {
    fontFamily: fontFamily.text.regular,
    fontSize: 10.5,
    color: colors.textWeak,
  },
});
