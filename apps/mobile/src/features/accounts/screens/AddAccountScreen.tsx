import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { AccountInput } from '@assetanchor/shared';
import type { RootStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../accountsStore';
import { createAccount } from '../accountService';
import { nextDisplayOrder } from '../accountOrdering';
import AccountForm from '../components/AccountForm';
import { ConfirmDialog } from '../../../core/ui';
import { colors, spacing } from '../../../core/theme';

/**
 * AddAccountScreen —— 新增帳戶（Root modal，帳戶 FAB 入口；design.md §1 / accounts A4）。
 * dark retrofit + 共用 AccountForm（base-currency Segmented、ColorSwatches、券商/類型 inline 選單）。
 */
export default function AddAccountScreen({ navigation }: RootStackScreenProps<'AddAccount'>) {
  const uid = useAuthStore((s) => s.user?.uid);
  const accounts = useAccountsStore((s) => s.accounts);
  const [failed, setFailed] = useState(false);

  // offline-first：本地寫入即持久化、listener 即時更新清單，故立刻關閉 modal，
  // 不把關閉卡在「等 Firestore 伺服器確認」上（見 AddTransactionScreen 同樣處理）。
  function onSubmit(input: AccountInput) {
    if (!uid) return;
    const opts = { displayOrder: nextDisplayOrder(accounts), isFirst: accounts.length === 0 };
    navigation.goBack();
    void createAccount(uid, input, opts).catch(() => setFailed(true));
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AccountForm submitLabel="建立帳戶" onSubmit={onSubmit} />
      </ScrollView>

      <ConfirmDialog
        visible={failed}
        danger
        title="帳戶建立失敗"
        message="請檢查網路連線後再試一次。"
        onClose={() => setFailed(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, paddingBottom: spacing.xxl },
});
