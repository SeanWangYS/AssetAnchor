import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, type TransactionDocument, type TransactionInput } from '@assetanchor/shared';
import type { RootStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../../accounts/accountsStore';
import { useTransactionsStore } from '../transactionsStore';
import { updateTransaction, writeTransaction } from '../transactionService';
import TransactionForm, { type TransactionFormDefaults } from '../components/TransactionForm';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/** TransactionDocument → 表單字串初值（編輯帶值；金額以 display 精度回填，去尾零）。 */
function toFormDefaults(t: TransactionDocument): TransactionFormDefaults {
  const trim = (s: string): string => {
    const fixed = Money.fromDecimalString(s, t.currency).toDisplayString(4);
    return fixed.replace(/\.?0+$/, '');
  };
  return {
    account_id: t.account_id,
    symbol: t.symbol,
    market: t.market,
    asset_type: t.asset_type,
    transaction_type: t.transaction_type,
    transaction_date: t.transaction_date,
    currency: t.currency,
    quantity: trim(t.quantity),
    price: trim(t.price),
    fee: trim(t.fee),
    tax: trim(t.tax),
    notes: t.notes,
  };
}

/**
 * AddTransaction / EditTransaction —— 共用同一個 sheet 表單（transactions-page-spec T7：
 * 編輯複用新增 sheet 帶入原值，標題改「編輯交易」，標題由 RootStack 設定）。
 *
 * offline-first：本地寫入當下即持久化、listener 即時更新清單，故立刻關閉 modal，
 * 不卡在等 Firestore 伺服器確認（emulator 可能延遲）。
 */
export default function AddTransactionScreen({
  navigation,
  route,
}: RootStackScreenProps<'AddTransaction'> | RootStackScreenProps<'EditTransaction'>) {
  const uid = useAuthStore((s) => s.user?.uid);
  const accounts = useAccountsStore((s) => s.accounts);
  const activeAccounts = accounts.filter((a) => a.is_active);

  const isEdit = route.name === 'EditTransaction';
  const editId = isEdit ? (route.params as { transactionId: string }).transactionId : null;
  const existing = useTransactionsStore((s) =>
    editId ? s.transactions.find((t) => t.transaction_id === editId) : undefined,
  );

  function onSubmit(input: TransactionInput) {
    if (!uid) return;
    navigation.goBack();
    if (isEdit && editId) {
      void updateTransaction(uid, editId, input).catch(() => {
        Alert.alert('更新失敗', '請稍後再試。');
      });
    } else {
      void writeTransaction(uid, input).catch(() => {
        Alert.alert('交易記錄失敗', '請稍後再試。');
      });
    }
  }

  // 編輯但找不到該交易（已被刪 / 尚未同步）。
  if (isEdit && !existing) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>找不到這筆交易，無法編輯。</Text>
      </View>
    );
  }

  if (activeAccounts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>請先到「設定 → 帳戶管理」建立一個帳戶，才能記錄交易。</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TransactionForm
        accounts={activeAccounts}
        {...(existing ? { initialValues: toFormDefaults(existing) } : {})}
        submitLabel={isEdit ? '儲存變更' : '記錄交易'}
        onSubmit={onSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.page, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  note: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
