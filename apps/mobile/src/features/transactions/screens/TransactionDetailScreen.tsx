import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TransactionsStackScreenProps } from '../../../core/navigation/types';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * TransactionDetailScreen —— 單筆交易檢視/編輯/刪除（design.md §1 交易：List → push Detail）。
 *
 * TODO(Phase 4 WP-B)：顯示完整欄位 + 編輯（EditTransaction sheet 帶值）+ 刪除（ConfirmDialog）。
 * 目前僅為可導航的 themed 佔位，回傳收到的 transactionId 以驗證路由參數打通。
 */
export default function TransactionDetailScreen({
  route,
}: TransactionsStackScreenProps<'TransactionDetail'>) {
  const { transactionId } = route.params;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>交易詳情</Text>
        <Text style={styles.subtitle}>交易 ID：{transactionId}</Text>
        <Text style={styles.subtitle}>檢視 / 編輯 / 刪除將於 Phase 4 補上</Text>
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
