import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AccountInput } from '@assetanchor/shared';
import type { AccountsStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../accountsStore';
import {
  cashDisplay,
  setAccountActive,
  toCashBalances,
  updateAccount,
  updateCashBalances,
} from '../accountService';
import AccountForm from '../components/AccountForm';
import { Button, Input } from '../../../core/ui';
import { colors, fontSize, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

export default function AccountDetailScreen({
  route,
  navigation,
}: AccountsStackScreenProps<'AccountDetail'>) {
  const { accountId } = route.params;
  const uid = useAuthStore((s) => s.user?.uid);
  const account = useAccountsStore((s) => s.accounts.find((a) => a.account_id === accountId));

  const [usd, setUsd] = useState(cashDisplay(account?.cash_balances.USD, 'USD'));
  const [twd, setTwd] = useState(cashDisplay(account?.cash_balances.TWD, 'TWD'));
  const [cashError, setCashError] = useState<string | null>(null);

  if (!account || !uid) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{zhTW.accounts.notFound}</Text>
      </View>
    );
  }

  // Capture narrowed consts so the async closures below keep the non-null types.
  const acct = account;
  const userId = uid;

  const initial = {
    account_name: acct.account_name,
    broker: acct.broker,
    account_type: acct.account_type,
    base_currency: acct.base_currency,
    market: acct.market,
    color: acct.color,
    notes: acct.notes,
  };

  async function onEdit(input: AccountInput) {
    await updateAccount(userId, accountId, input);
    navigation.goBack();
  }

  async function onSaveCash() {
    setCashError(null);
    try {
      const balances = toCashBalances({ USD: usd, TWD: twd });
      await updateCashBalances(userId, accountId, balances);
      Alert.alert(zhTW.accounts.actions.saved, zhTW.accounts.cash.saved);
    } catch {
      setCashError(zhTW.accounts.cash.invalid);
    }
  }

  async function onToggleActive() {
    await setAccountActive(userId, accountId, !acct.is_active);
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.c}>
      <AccountForm initial={initial} submitLabel={zhTW.accounts.actions.save} onSubmit={onEdit} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zhTW.accounts.cash.title}</Text>
        <Input
          label={zhTW.accounts.cash.usd}
          value={usd}
          onChangeText={setUsd}
          keyboardType="decimal-pad"
          error={cashError}
        />
        <Input
          label={zhTW.accounts.cash.twd}
          value={twd}
          onChangeText={setTwd}
          keyboardType="decimal-pad"
        />
        <Button title={zhTW.accounts.cash.save} variant="secondary" onPress={onSaveCash} />
      </View>

      <View style={styles.section}>
        <Button
          title={
            acct.is_active ? zhTW.accounts.actions.deactivate : zhTW.accounts.actions.reactivate
          }
          variant={acct.is_active ? 'danger' : 'primary'}
          onPress={onToggleActive}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { padding: spacing.lg, gap: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, fontSize: fontSize.body },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.heading, fontWeight: '600', color: colors.text },
});
