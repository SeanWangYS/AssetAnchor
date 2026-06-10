import { Alert, ScrollView, StyleSheet } from 'react-native';
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

  // offline-first：本地寫入即持久化、listener 即時更新清單，故立刻關閉 modal，
  // 不把關閉卡在「等 Firestore 伺服器確認」上（見 AddTransactionScreen 同樣處理）。
  function onSubmit(input: AccountInput) {
    if (!uid) return;
    const opts = { displayOrder: nextDisplayOrder(accounts), isFirst: accounts.length === 0 };
    navigation.goBack();
    void createAccount(uid, input, opts).catch(() => {
      Alert.alert('帳戶建立失敗', '請稍後再試。');
    });
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
