import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * AssetTransactionsScreen —— 個股完整交易歷史（design.md §1 持倉：AssetDetail → push 此頁）。
 *
 * TODO(Phase 4 WP-A)：列出該 market+symbol 的全部交易（時間軸 + 買/賣膠囊），對齊 AssetDetail 對帳清單。
 * 目前為可導航的 themed 佔位，回傳收到的 market/symbol 以驗證路由參數打通。
 */
export default function AssetTransactionsScreen({
  route,
}: HoldingsStackScreenProps<'AssetTransactions'>) {
  const { market, symbol } = route.params;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>
          {symbol}（{market}）交易歷史
        </Text>
        <Text style={styles.subtitle}>完整交易歷史將於 Phase 4 補上</Text>
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
