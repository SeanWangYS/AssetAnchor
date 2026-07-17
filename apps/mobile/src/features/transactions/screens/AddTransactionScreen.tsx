import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, type TransactionDocument, type TransactionInput } from '@assetanchor/shared';
import type { RootStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../../accounts/accountsStore';
import { useTransactionsStore } from '../transactionsStore';
import { updateTransaction, writeTransaction } from '../transactionService';
import { ensureSymbol } from '../../../services/symbols';
import TransactionForm, { type TransactionFormDefaults } from '../components/TransactionForm';
import { colors, fontFamily, fontSize, radius, spacing } from '../../../core/theme';

/** YYYY-MM-DD（本機今天）。複製上一筆時交易日改回今天。 */
function todayLocal(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** 取 transaction_date 最大者（不假設已排序）。 */
function mostRecent(transactions: TransactionDocument[]): TransactionDocument | undefined {
  return transactions.reduce<TransactionDocument | undefined>(
    (best, t) => (!best || t.transaction_date > best.transaction_date ? t : best),
    undefined,
  );
}

/**
 * TransactionDocument → 表單字串初值（編輯帶值）。
 * price 循規則表「單價一律 2 位」：恆 2 位、不掉尾零（512.30 顯示 512.30）；
 * quantity/fee/tax 維持 ≤4 位去尾零回填。
 */
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
    price: Money.fromDecimalString(t.price, t.currency).toDisplayString(2),
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
  const allTransactions = useTransactionsStore((s) => s.transactions);
  const existing = editId ? allTransactions.find((t) => t.transaction_id === editId) : undefined;
  // SELL 可賣股數推導：編輯時排除被編輯的該筆，避免自身重複計入。
  const transactionsForSellable = editId
    ? allTransactions.filter((t) => t.transaction_id !== editId)
    : allTransactions;

  // 複製上一筆：將最近一筆映射成表單初值，覆寫交易日為今天、清空股數/備註；
  // 以遞增 key 強制 TransactionForm 重新掛載，套用新初值。
  const [copyDefaults, setCopyDefaults] = useState<TransactionFormDefaults | null>(null);
  const [copyKey, setCopyKey] = useState(0);
  const lastTransaction = mostRecent(allTransactions);

  function onCopyLast() {
    if (!lastTransaction) return;
    setCopyDefaults({
      ...toFormDefaults(lastTransaction),
      transaction_date: todayLocal(),
      quantity: '',
      notes: '',
    });
    setCopyKey((k) => k + 1);
  }

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
    // Sprint 6：確保該代號有 symbols 文件並補 metadata（fire-and-forget；失敗不影響交易）。
    void ensureSymbol({
      market: input.market,
      symbol: input.symbol,
      assetType: input.asset_type,
      currency: input.currency,
    });
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
      {!isEdit && lastTransaction ? (
        <Pressable accessibilityRole="button" style={styles.copyChip} onPress={onCopyLast}>
          <Text style={styles.copyChipText}>複製上一筆（{lastTransaction.symbol}）</Text>
        </Pressable>
      ) : null}
      <TransactionForm
        key={copyKey}
        accounts={activeAccounts}
        transactions={transactionsForSellable}
        {...(existing
          ? { initialValues: toFormDefaults(existing) }
          : copyDefaults
            ? { initialValues: copyDefaults }
            : {})}
        submitLabel={isEdit ? '儲存變更' : '記錄交易'}
        onSubmit={onSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.page, paddingBottom: spacing.xxl },
  copyChip: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  copyChipText: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.label,
    color: colors.textPrimary,
  },
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
