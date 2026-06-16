import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AccountDocument, Currency } from '@assetanchor/shared';
import type { AccountsStackScreenProps } from '../../../core/navigation/types';
import { useAccountsStore } from '../accountsStore';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import { Avatar, EmptyState, Fab, Icon, ListItem } from '../../../core/ui';
import { colors, fontFamily, fontSize, numericStyle, spacing } from '../../../core/theme';
import {
  accountMonogram,
  brokerLabel,
  currencyPrefix,
  holdingsForAccount,
  holdingsValueByCurrency,
} from '../accountDisplay';
import { PlusIcon } from '../components/AccountIcons';

/**
 * AccountListScreen —— 帳戶清單（設定 → 帳戶管理子頁；design.md §1、accounts §0/A2/A3）。
 * row：帳戶識別色圓標（Avatar，非小圓點）＋帳戶名／券商·市場，右側＝該帳戶持股市值（原幣別）。
 * 已停用帳戶收在底部獨立區、灰階降明度。新增帳戶入口 = FAB（已接 AddAccount，header ＋ 已移除）。
 */
export default function AccountListScreen({ navigation }: AccountsStackScreenProps<'AccountList'>) {
  const accounts = useAccountsStore((s) => s.accounts);
  const transactions = useTransactionsStore((s) => s.transactions);

  const { active, inactive } = useMemo(() => {
    const a: AccountDocument[] = [];
    const i: AccountDocument[] = [];
    for (const acc of accounts) (acc.is_active ? a : i).push(acc);
    return { active: a, inactive: i };
  }, [accounts]);

  /** 右側市值（原幣別）。持股可能多幣別 → 各幣別一列；無持股顯示 — 。 */
  function valueText(accountId: string): string {
    const positions = holdingsForAccount(transactions, accountId);
    const sums = holdingsValueByCurrency(positions);
    const parts: string[] = [];
    for (const [ccy, money] of Object.entries(sums)) {
      if (!money) continue;
      parts.push(`${currencyPrefix(ccy as Currency)} ${money.toDisplayString()}`);
    }
    return parts.length === 0 ? '—' : parts.join('\n');
  }

  function row(a: AccountDocument) {
    return (
      <ListItem
        key={a.account_id}
        title={a.account_name}
        subtitle={`${brokerLabel(a.broker)} · ${a.market}`}
        left={<Avatar symbol={accountMonogram(a.account_name)} color={a.color} size={40} />}
        dimmed={!a.is_active}
        right={
          <Text style={[styles.value, !a.is_active ? styles.valueDim : null]}>
            {valueText(a.account_id)}
          </Text>
        }
        onPress={() => navigation.navigate('AccountDetail', { accountId: a.account_id })}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {accounts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={<PlusIcon size={26} color={colors.accent} />}
              title="尚無帳戶"
              subtitle="點右下角 ＋ 新增第一個帳戶"
            />
          </View>
        ) : (
          <>
            {active.map(row)}

            {inactive.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>已停用</Text>
                {inactive.map(row)}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <Fab
        onPress={() => navigation.navigate('AddAccount')}
        accessibilityLabel="新增帳戶"
        icon={<Icon name="plus" color={colors.onPrimary} size={28} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1, paddingTop: spacing.sm, paddingBottom: 96 },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.label,
    color: colors.textWeak,
    letterSpacing: 0.4,
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.sm,
  },
  value: {
    fontFamily: fontFamily.num.semibold,
    fontSize: fontSize.text,
    color: colors.textPrimary,
    textAlign: 'right',
    ...numericStyle,
  },
  valueDim: { color: colors.textWeak },
});
