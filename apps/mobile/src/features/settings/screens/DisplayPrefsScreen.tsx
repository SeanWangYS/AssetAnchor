import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DISPLAY_CURRENCIES, type DisplayCurrency } from '@assetanchor/shared';
import { Card, Segmented, Toast } from '../../../core/ui';
import { usePreferencesStore } from '../../../core/preferences';
import { updateDisplayCurrency } from '../../auth/userDoc';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/** 顯示幣別 Segmented 選項（label = value；對齊 holdings/analysis 切換）。 */
const CURRENCY_OPTIONS = DISPLAY_CURRENCIES.map((value) => ({ value, label: value }));

/**
 * DisplayPrefsScreen —— 顯示偏好（design.md §1 設定「偏好 / 顯示偏好」、§2 缺畫面①）。
 *
 * 顯示幣別：TWD / USD。值來自跨切面 `preferencesStore`（登入時由 user doc 灌入），
 * 切換採樂觀更新（store 即時生效 → 持倉總覽合計 / 分析頁預設跟著切）+ 持久化
 * users/{uid}.preferred_display_currency；失敗還原前值。Model B / ADR-0005：換算僅顯示層。
 */
export default function DisplayPrefsScreen() {
  const currency = usePreferencesStore((s) => s.preferredDisplayCurrency);
  const setPreferred = usePreferencesStore((s) => s.setPreferredDisplayCurrency);
  const [toast, setToast] = useState<string | null>(null);

  async function onChangeCurrency(next: DisplayCurrency) {
    if (next === currency) return;
    const prev = currency;
    setPreferred(next); // 樂觀更新：store 即時生效，跨頁顯示同步切換
    try {
      await updateDisplayCurrency(next);
    } catch {
      setPreferred(prev); // 失敗還原為前一個已持久化值
      setToast('更新失敗，已還原');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.block}>
          <Text style={styles.rowTitle}>顯示幣別</Text>
          <Text style={styles.rowHint}>跨幣別合計以此幣別顯示（換算僅顯示層）</Text>
          <View style={styles.control}>
            <Segmented options={CURRENCY_OPTIONS} value={currency} onChange={onChangeCurrency} />
          </View>
        </View>
      </Card>

      <Text style={styles.footnote}>套用於持倉總覽「總成本」合計，以及分析頁的顯示幣別預設。</Text>

      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, gap: spacing.md },
  card: { gap: 0, paddingVertical: spacing.xs },
  block: { paddingVertical: spacing.md, gap: spacing.sm },
  control: { marginTop: spacing.xs },
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
