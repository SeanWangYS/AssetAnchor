import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * AnalysisOverviewScreen —— 分析頁（單頁垂直捲動，hero + 5 圖表卡，靜態無 drill-down）。
 *
 * TODO(Phase 4 WP-C)：填入 hero + 5 圖表卡（Donut 資產類別 / DualBar / HBar …）+ refresh 圓鈕→toast、
 * TWD/USD 切換、aNice 軸刻度（design.md §1「分析」/ §7 WP-C / analysis-page-spec.md）。
 * 目前僅為可導航的 themed 佔位，使 分析 tab 成形。
 */
export default function AnalysisOverviewScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>分析</Text>
        <Text style={styles.subtitle}>圖表與績效分析將於 Phase 4 補上</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1, padding: spacing.page },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  title: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.cardTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textWeak,
  },
});
