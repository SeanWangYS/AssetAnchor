import { StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../../../core/navigation/types';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * DateRangeSheetScreen —— 期間篩選 sheet（全部 / 本月 / 近三月 / 今年 + 自訂）。
 *
 * TODO(Phase 4 WP-B)：選項清單 + 自訂日期範圍 + 回填呼叫端（交易清單 / 分析頁）。
 * design.md §1 Modal/bottom sheet「期間篩選 sheet」。目前為可導航的 themed 佔位（reserved 路由）。
 */
export default function DateRangeSheetScreen(_props: RootStackScreenProps<'DateRange'>) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>期間篩選</Text>
      <Text style={styles.subtitle}>期間選項將於 Phase 4 補上</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.screen, padding: spacing.page, gap: spacing.sm },
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
