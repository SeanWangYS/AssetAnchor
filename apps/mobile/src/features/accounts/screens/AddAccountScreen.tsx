import { ScrollView, StyleSheet } from 'react-native';
import type { AccountInput } from '@assetanchor/shared';
import type { RootStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../accountsStore';
import { createAccount } from '../accountService';
import { nextDisplayOrder } from '../accountOrdering';
import AccountForm from '../components/AccountForm';
import { spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

export default function AddAccountScreen({ navigation }: RootStackScreenProps<'AddAccount'>) {
  const uid = useAuthStore((s) => s.user?.uid);
  const accounts = useAccountsStore((s) => s.accounts);

  async function onSubmit(input: AccountInput) {
    if (!uid) return;
    await createAccount(uid, input, {
      displayOrder: nextDisplayOrder(accounts),
      isFirst: accounts.length === 0,
    });
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.c}>
      <AccountForm submitLabel={zhTW.accounts.actions.create} onSubmit={onSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { padding: spacing.lg },
});
