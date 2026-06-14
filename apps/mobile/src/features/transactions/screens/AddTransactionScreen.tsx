import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import type { TransactionInput } from '@assetanchor/shared';
import type { RootStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../../accounts/accountsStore';
import { writeTransaction } from '../transactionService';
import TransactionForm from '../components/TransactionForm';
import { colors, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

// design.md §1：EditTransaction = reuse AddTransaction 同一個 sheet（標題改「編輯交易」）。
// 兩條路由共用此元件，故 props 型別涵蓋兩者；目前僅用共通的 navigation.goBack()，
// Phase 4 接「編輯帶值」時再依 route.name / route.params 分流。
export default function AddTransactionScreen({
  navigation,
}: RootStackScreenProps<'AddTransaction'> | RootStackScreenProps<'EditTransaction'>) {
  const uid = useAuthStore((s) => s.user?.uid);
  const accounts = useAccountsStore((s) => s.accounts);
  const activeAccounts = accounts.filter((a) => a.is_active);

  // offline-first：本地寫入當下即持久化、listener 會即時更新清單，因此立刻關閉 modal，
  // 不把畫面卡在「等 Firestore 伺服器確認」上（該 await 在 emulator 可能延遲/卡住）。
  function onSubmit(input: TransactionInput) {
    if (!uid) return;
    navigation.goBack();
    void writeTransaction(uid, input).catch(() => {
      Alert.alert('交易記錄失敗', '請稍後再試。');
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.c}>
      {activeAccounts.length === 0 ? (
        <Text style={styles.note}>{zhTW.transactions.noAccount}</Text>
      ) : (
        <TransactionForm
          accounts={activeAccounts}
          defaultAccountId={activeAccounts[0]?.account_id}
          submitLabel={zhTW.transactions.actions.create}
          onSubmit={onSubmit}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { padding: spacing.lg },
  note: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
