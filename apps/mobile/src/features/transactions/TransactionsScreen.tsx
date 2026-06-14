import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, type TransactionDocument } from '@assetanchor/shared';
import type { TransactionsStackScreenProps } from '../../core/navigation/types';
import { useTransactionsStore } from './transactionsStore';
import { Fab, Icon, ListItem } from '../../core/ui';
import { colors, spacing } from '../../core/theme';
import { zhTW } from '../../i18n/zh-TW';

/** 顯示原幣別金額為 2 位小數（儲存仍 10 位）。 */
function displayPrice(t: TransactionDocument): string {
  return Money.fromDecimalString(t.price, t.currency).toDisplayString();
}

function displayQty(t: TransactionDocument): string {
  return Money.fromDecimalString(t.quantity, t.currency).toDisplayString();
}

/**
 * TransactionList —— 交易 tab 落地頁（時間軸清單）。
 * 新增交易入口 = **FAB only**（design.md §1 / transactions-page-spec T4）；header ＋ 已移除。
 * Row 點擊導向 TransactionDetail（檢視/編輯/刪除）。
 *
 * TODO(Phase 4 WP-B)：時間軸分組 + 買/賣膠囊 + 期間篩選 sheet（DateRange）；目前為精簡清單。
 */
export default function TransactionsScreen({
  navigation,
}: TransactionsStackScreenProps<'TransactionList'>) {
  const transactions = useTransactionsStore((s) => s.transactions);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {transactions.length === 0 ? (
          <Text style={styles.empty}>{zhTW.transactions.empty}</Text>
        ) : (
          transactions.map((t) => (
            <ListItem
              key={t.transaction_id}
              title={`${t.symbol} · ${displayQty(t)} 股`}
              subtitle={`${t.transaction_date} · ${displayPrice(t)} ${t.currency}`}
              onPress={() =>
                navigation.navigate('TransactionDetail', { transactionId: t.transaction_id })
              }
            />
          ))
        )}
      </ScrollView>
      <Fab
        onPress={() => navigation.navigate('AddTransaction')}
        accessibilityLabel={zhTW.transactions.addTitle}
        icon={<Icon name="plus" color={colors.onPrimary} size={28} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1 },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
});
