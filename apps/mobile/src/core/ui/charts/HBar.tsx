import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../../theme';

/**
 * HBar —— 橫向長條圖（aa-analysis-charts.jsx:159 `AHBars`），純 RN View 自繪。
 * 通用列：左（代號 + 名稱）｜中（軌道 + 漸層填充，寬度 = fraction）｜右（彩色數值）。
 * 分析頁的報酬率 / 未實現損益 / 市值佔比皆由此渲染（rows 由 screens 算好；正負分色亦由 screens 決定）。
 *
 * 純展示：`fraction` ∈ [0,1] 已正規化；`rightText` 預格式化；color 由 screens 帶 theme。
 */
export interface HBarRow {
  label: string;
  sublabel?: string;
  /** 條長比例（0–1，相對最大值正規化）。 */
  fraction: number;
  /** 填充色（漲跌色 / accent）。 */
  barColor: string;
  rightText: string;
  rightColor?: string;
}

interface HBarProps {
  rows: readonly HBarRow[];
  rowHeight?: number;
}

export default function HBar({ rows, rowHeight = 33 }: HBarProps) {
  return (
    <View style={styles.wrap}>
      {rows.map((r) => (
        <View key={r.label} style={[styles.row, { height: rowHeight }]}>
          <View style={styles.labels}>
            <Text style={styles.label} numberOfLines={1}>
              {r.label}
            </Text>
            {r.sublabel ? (
              <Text style={styles.sublabel} numberOfLines={1}>
                {r.sublabel}
              </Text>
            ) : null}
          </View>
          <View style={styles.track}>
            <LinearGradient
              colors={[`${r.barColor}99`, r.barColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${Math.max(r.fraction * 100, 2.5)}%` }]}
            />
          </View>
          <Text
            style={[styles.right, { color: r.rightColor ?? colors.textPrimary }]}
            numberOfLines={1}
          >
            {r.rightText}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labels: { width: 82, minWidth: 0 },
  label: {
    fontFamily: fontFamily.num.bold,
    fontSize: 11.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  sublabel: {
    fontFamily: fontFamily.text.regular,
    fontSize: 9.5,
    color: colors.textFaint,
  },
  track: {
    flex: 1,
    height: 9,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.055)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 100 },
  right: {
    width: 88,
    textAlign: 'right',
    fontFamily: fontFamily.num.bold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
