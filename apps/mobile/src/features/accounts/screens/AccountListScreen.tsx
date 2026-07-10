import { useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, type AccountDocument, type Currency } from '@assetanchor/shared';
import type { AccountsStackScreenProps } from '../../../core/navigation/types';
import { useAccountsStore } from '../accountsStore';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import { Avatar, EmptyState, ErrorState, Fab, Icon, ListItem, LoadingView } from '../../../core/ui';
import { colors, fontFamily, fontSize, numericStyle, spacing } from '../../../core/theme';
import { accountMonogram, brokerLabel, formatMoney, holdingsForAccount } from '../accountDisplay';
import {
  quoteFor,
  useQuotes,
  useRefreshQuotesOnFocus,
  type QuoteTarget,
} from '../../../services/quotes';
import { positionValuation } from '../../../services/valuation';
import { PlusIcon } from '../components/AccountIcons';

/**
 * AccountListScreen —— 帳戶清單（設定 → 帳戶管理子頁；design.md §1、accounts §0/A2/A3）。
 * row：帳戶識別色圓標（Avatar，非小圓點）＋帳戶名／券商·市場，右側＝該帳戶持股市值（原幣別）。
 * 已停用帳戶收在底部獨立區、灰階降明度。新增帳戶入口 = FAB（已接 AddAccount，header ＋ 已移除）。
 */
export default function AccountListScreen({ navigation }: AccountsStackScreenProps<'AccountList'>) {
  const accounts = useAccountsStore((s) => s.accounts);
  const loading = useAccountsStore((s) => s.loading);
  const error = useAccountsStore((s) => s.error);
  const transactions = useTransactionsStore((s) => s.transactions);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回設定"
          hitSlop={10}
          onPress={() => navigation.goBack()}
        >
          <Icon name="back" size={22} color={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const { active, inactive } = useMemo(() => {
    const a: AccountDocument[] = [];
    const i: AccountDocument[] = [];
    for (const acc of accounts) (acc.is_active ? a : i).push(acc);
    return { active: a, inactive: i };
  }, [accounts]);

  // 報價（A2）：為所有帳戶持股的聯集 on-demand 載入 + focus 檢查新鮮度；row 右側改真實市值。
  const allTargets = useMemo(() => {
    const seen = new Set<string>();
    const t: QuoteTarget[] = [];
    for (const acc of accounts) {
      for (const p of holdingsForAccount(transactions, acc.account_id).positions) {
        const k = `${p.market}_${p.symbol}`;
        if (seen.has(k)) continue;
        seen.add(k);
        t.push({ market: p.market, symbol: p.symbol, currency: p.currency });
      }
    }
    return t;
  }, [accounts, transactions]);
  const quotes = useQuotes(allTargets);
  useRefreshQuotesOnFocus(allTargets);

  /** 右側市值（原幣別，真實報價）。多幣別各一列；缺報價標「N 檔更新中」；無持股顯示 — 。 */
  function valueText(accountId: string): string {
    const { positions } = holdingsForAccount(transactions, accountId);
    const byCcy = new Map<Currency, Money>();
    let pending = 0;
    for (const p of positions) {
      const v = positionValuation(p, quoteFor(quotes, p.market, p.symbol), Date.now());
      if (!v) {
        pending += 1;
        continue;
      }
      byCcy.set(p.currency, (byCcy.get(p.currency) ?? Money.zero(p.currency)).add(v.marketValue));
    }
    const parts = [...byCcy.entries()].map(([ccy, m]) => formatMoney(m.toDecimalString(), ccy));
    if (pending > 0) parts.push(`${pending} 檔更新中`);
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
        {accounts.length === 0 && error ? (
          <View style={styles.emptyWrap}>
            <ErrorState message="載入失敗" subtitle="請稍後再試" />
          </View>
        ) : accounts.length === 0 && loading ? (
          <View style={styles.emptyWrap}>
            <LoadingView label="載入帳戶中…" />
          </View>
        ) : accounts.length === 0 ? (
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
