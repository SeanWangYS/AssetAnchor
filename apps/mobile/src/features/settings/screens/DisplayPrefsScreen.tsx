import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, Segmented } from '../../../core/ui';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/** 顯示幣別（合計換算顯示用；對齊 analysis/holdings TWD|USD 切換）。 */
type DisplayCurrency = 'TWD' | 'USD';

const CURRENCY_OPTIONS = [
  { value: 'TWD' as const, label: 'TWD' },
  { value: 'USD' as const, label: 'USD' },
] satisfies readonly { value: DisplayCurrency; label: string }[];

/**
 * DisplayPrefsScreen —— 顯示偏好（design.md §1 設定「偏好 / 顯示偏好」、§2 缺畫面①）。
 *
 * - 幣別：TWD / USD Segmented（顯示層合計換算偏好；Model B / ADR-0005 只在顯示時換算）。
 * - 主題：深色模式 toggle（目前 app dark-first，僅示意）。
 *
 * Non-goal：持久化（不接 store / AsyncStorage）。本頁僅 local state 示意切換，
 * 重進畫面會重置 —— 對齊 WP-E「persistence 為 Non-goal」。
 */
export default function DisplayPrefsScreen() {
  const [currency, setCurrency] = useState<DisplayCurrency>('TWD');
  const [darkMode, setDarkMode] = useState(true);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.block}>
          <Text style={styles.rowTitle}>顯示幣別</Text>
          <Text style={styles.rowHint}>跨幣別合計以此幣別顯示（換算僅顯示層）</Text>
          <View style={styles.control}>
            <Segmented options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
          </View>
        </View>

        <View style={styles.hr} />

        <View style={[styles.block, styles.switchRow]}>
          <View style={styles.switchText}>
            <Text style={styles.rowTitle}>深色模式</Text>
            <Text style={styles.rowHint}>目前僅提供深色主題</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.surface, true: colors.accent }}
            thumbColor={colors.onPrimary}
            ios_backgroundColor={colors.surface}
          />
        </View>
      </Card>

      <Text style={styles.footnote}>偏好設定尚未持久化，重啟後恢復預設。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, gap: spacing.md },
  card: { gap: 0, paddingVertical: spacing.xs },
  block: { paddingVertical: spacing.md, gap: spacing.sm },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  control: { marginTop: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchText: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.text,
    color: colors.textPrimary,
  },
  rowHint: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  footnote: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textWeak,
    paddingHorizontal: spacing.xs,
  },
});
