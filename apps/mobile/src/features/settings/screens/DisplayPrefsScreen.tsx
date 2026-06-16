import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { DISPLAY_CURRENCIES, isDisplayCurrency, type DisplayCurrency } from '@assetanchor/shared';
import { Card, Segmented, Toast } from '../../../core/ui';
import { getUserDoc, updateDisplayCurrency } from '../../auth/userDoc';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/** 顯示幣別 Segmented 選項（label = value；對齊 holdings/analysis 切換）。 */
const CURRENCY_OPTIONS = DISPLAY_CURRENCIES.map((value) => ({ value, label: value }));

/**
 * DisplayPrefsScreen —— 顯示偏好（design.md §1 設定「偏好 / 顯示偏好」、§2 缺畫面①）。
 *
 * - 幣別：TWD / USD Segmented，持久化 users/{uid}.preferred_display_currency（顯示層合計換算偏好；
 *   Model B / ADR-0005 只在顯示時換算）。mount 載入現值，切換採樂觀更新→寫回→失敗還原。
 *   跨畫面消費（holdings/analysis 以此為預設）屬 Sprint 6，本頁僅負責持久化偏好本身。
 * - 主題：深色模式 toggle —— app 目前 dark-first、無 light 主題可切，維持示意（不持久化）。
 */
export default function DisplayPrefsScreen() {
  const [currency, setCurrency] = useState<DisplayCurrency>('TWD');
  const [persisted, setPersisted] = useState<DisplayCurrency>('TWD');
  const [darkMode, setDarkMode] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // mount：載入已持久化的顯示幣別（缺值 / 非支援值預設 TWD）。
  useEffect(() => {
    let active = true;
    void getUserDoc().then((doc) => {
      if (!active) return;
      const ccy = doc?.preferred_display_currency;
      const next: DisplayCurrency = isDisplayCurrency(ccy) ? ccy : 'TWD';
      setCurrency(next);
      setPersisted(next);
    });
    return () => {
      active = false;
    };
  }, []);

  async function onChangeCurrency(next: DisplayCurrency) {
    if (next === persisted) return;
    const prev = persisted;
    setCurrency(next); // 樂觀更新
    try {
      await updateDisplayCurrency(next);
      setPersisted(next);
    } catch {
      setCurrency(prev); // 失敗還原為前一個已持久化值
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

      <Text style={styles.footnote}>深色模式為目前唯一主題，切換僅示意（尚未持久化）。</Text>

      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
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
