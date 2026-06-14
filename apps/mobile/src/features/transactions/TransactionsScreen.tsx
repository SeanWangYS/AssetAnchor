import { useLayoutEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Money, type TransactionDocument } from '@assetanchor/shared';
import type { MainTabsModalScreenProps } from '../../core/navigation/types';
import { useTransactionsStore } from './transactionsStore';
import { ListItem } from '../../core/ui';
import { colors, fontSize, spacing } from '../../core/theme';
import { zhTW } from '../../i18n/zh-TW';

/** 顯示原幣別金額為 2 位小數（儲存仍 10 位）。 */
function displayPrice(t: TransactionDocument): string {
  return Money.fromDecimalString(t.price, t.currency).toDisplayString();
}

function displayQty(t: TransactionDocument): string {
  return Money.fromDecimalString(t.quantity, t.currency).toDisplayString();
}

export default function TransactionsScreen({
  navigation,
}: MainTabsModalScreenProps<'Transactions'>) {
  const transactions = useTransactionsStore((s) => s.transactions);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('AddTransaction')}>
          <Text style={styles.add}>＋</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <ScrollView>
      {transactions.length === 0 ? (
        <Text style={styles.empty}>{zhTW.transactions.empty}</Text>
      ) : (
        transactions.map((t) => (
          <ListItem
            key={t.transaction_id}
            title={`${t.symbol} · ${displayQty(t)} 股`}
            subtitle={`${t.transaction_date} · ${displayPrice(t)} ${t.currency}`}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  add: { fontSize: fontSize.title, color: colors.primary, paddingHorizontal: spacing.sm },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
});
