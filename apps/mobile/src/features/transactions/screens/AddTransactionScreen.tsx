import { ScrollView, StyleSheet, Text } from 'react-native';
import type { TransactionInput } from '@assetanchor/shared';
import type { RootStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../../accounts/accountsStore';
import { writeTransaction } from '../transactionService';
import TransactionForm from '../components/TransactionForm';
import { colors, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

export default function AddTransactionScreen({
  navigation,
}: RootStackScreenProps<'AddTransaction'>) {
  const uid = useAuthStore((s) => s.user?.uid);
  const accounts = useAccountsStore((s) => s.accounts);
  const activeAccounts = accounts.filter((a) => a.is_active);

  async function onSubmit(input: TransactionInput) {
    if (!uid) return;
    await writeTransaction(uid, input);
    navigation.goBack();
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
