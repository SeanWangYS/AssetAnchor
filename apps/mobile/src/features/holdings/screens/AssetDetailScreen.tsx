import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, isFresh, deriveHoldingsByAccount, type Currency } from '@assetanchor/shared';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import { Button, Card, Chart, EmptyState, Pnl, Segmented, TimeTabs } from '../../../core/ui';
import { colors, fontFamily, numericStyle, spacing } from '../../../core/theme';
import { useHoldings } from '../useHoldings';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import { quoteFor, useQuotes, useRefreshQuotesOnFocus } from '../../../services/quotes';
import { useSymbolMap, symbolNameOf, symbolEnglishOf } from '../../../services/symbols';
import { useSymbolTrendSeries } from '../useTrendSeries';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import { useAccountsStore } from '../../accounts/accountsStore';
import {
  currencyPrefix,
  displayDecimals,
  fmtShares,
  marketLabel,
  toDisplay,
} from '../holdingsDemo';

/** AssetDetail 走勢 timeframe（design §3.2 item 3）。 */
type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
const TIMEFRAMES: readonly Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

/** TWD / USD 顯示切換（design §3.2 item 4）。 */
const CCY_OPTIONS: readonly { value: Currency }[] = [{ value: 'TWD' }, { value: 'USD' }];

export default function AssetDetailScreen({
  route,
  navigation,
}: HoldingsStackScreenProps<'AssetDetail'>) {
  const { market, symbol } = route.params;
  const positions = useHoldings();
  const rates = useExchangeRatesStore((s) => s.rates);
  const rateDate = useExchangeRatesStore((s) => s.date);

  const position = positions.find((p) => p.market === market && p.symbol === symbol);

  // 帳戶分布（真實資料，取代已移除的 accountOf demo）：列出目前實際持有此 (market, symbol) 的帳戶名。
  const transactions = useTransactionsStore((s) => s.transactions);
  const accounts = useAccountsStore((s) => s.accounts);
  const accountDistribution = useMemo(() => {
    const names = deriveHoldingsByAccount(transactions, accounts)
      .filter((g) => g.positions.some((p) => p.market === market && p.symbol === symbol))
      .map((g) => g.accountName);
    return names.length > 0 ? names.join('、') : '—';
  }, [transactions, accounts, market, symbol]);
  // 名稱真值（Sprint 6）：唯讀訂閱 symbols store（持倉總覽進入時已 enrich）；缺值 fallback 代號。
  const symbols = useSymbolMap();
  const displayName = symbolNameOf(symbols, market, symbol);
  const enName = symbolEnglishOf(symbols, market, symbol);

  // 報價（ADR-0006 雙層 cache）：on-demand 載入本 symbol；focus / 回前景時再檢查新鮮度。
  const quoteTargets = position ? [{ market, symbol, currency: position.currency }] : [];
  const quotes = useQuotes(quoteTargets);
  useRefreshQuotesOnFocus(quoteTargets);

  const [tf, setTf] = useState<Timeframe>('1M');
  const [displayCcy, setDisplayCcy] = useState<Currency>(position?.currency ?? 'TWD');

  // 走勢圖真值（ADR-0010）：原幣別價格序列；1D/1W 盤中即抓即回、其餘讀 price_history。
  // 現價（fresh 或最後已知）作為日線 tabs 的今日點。hook 需在 early return 之前呼叫。
  const nativeCcy = position?.currency ?? 'TWD';
  const quote = quoteFor(quotes, market, symbol);
  const trend = useSymbolTrendSeries(
    market,
    symbol,
    nativeCcy,
    tf,
    quote ? new Money(quote.price, nativeCcy).toNumber() : null,
  );

  // header：中央顯示「代號 名稱」+ 副標（英文名 · 台股|美股）。
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleMain} numberOfLines={1}>
            <Text style={styles.headerSymbol}>{symbol}</Text> {displayName}
          </Text>
          <Text style={styles.headerTitleSub} numberOfLines={1}>
            {enName} · {marketLabel(market)}
          </Text>
        </View>
      ),
    });
  }, [navigation, symbol, displayName, enName, market]);

  // 把原幣別 Money 換算成 displayCcy 並格式化（rates 優先、退 demo 匯率；缺率回原幣別）。
  const nativeCurrency = position?.currency ?? 'TWD';
  const show = useMemo(() => {
    return (native: Money): string => {
      const converted = toDisplay(native, rates, displayCcy);
      const target = converted ?? native;
      const ccy = converted ? displayCcy : nativeCurrency;
      return `${currencyPrefix(ccy)} ${target.toNumber().toLocaleString('en-US', {
        minimumFractionDigits: displayDecimals(ccy),
        maximumFractionDigits: displayDecimals(ccy),
      })}`;
    };
  }, [nativeCurrency, rates, displayCcy]);

  if (!position) {
    return (
      <View style={styles.notFoundWrap}>
        <EmptyState title="找不到持倉" subtitle="此標的目前無持倉" />
      </View>
    );
  }

  // 現價/市值/未實現損益：報價真值（ADR-0006）。無報價 → null（降級顯示「更新中…」）；過期仍顯示最後已知值。
  const priceM = quote ? new Money(quote.price, position.currency) : null;
  const marketValue = priceM ? priceM.multiply(position.quantity) : null;
  const totalCostM = Money.fromDecimalString(position.totalCost, position.currency);
  const unrealized = marketValue ? marketValue.subtract(totalCostM) : null;
  const avgCostM = Money.fromDecimalString(position.averageCost, position.currency);
  const retPct =
    priceM && !avgCostM.isZero()
      ? priceM.subtract(avgCostM).divide(position.averageCost).multiply('100').toNumber()
      : null;
  const realized = Money.fromDecimalString(position.realizedPnl, position.currency);
  // 報價新鮮度（15min TTL）：過期報價仍顯示現價/市值（最後已知值），但今日漲跌只用新鮮報價。
  const quoteFresh = quote ? isFresh(quote.fetchedAtMs, Date.now()) : false;
  const asOfLabel =
    quote && !quoteFresh
      ? `最後更新 ${new Date(quote.fetchedAtMs).getHours().toString().padStart(2, '0')}:${new Date(
          quote.fetchedAtMs,
        )
          .getMinutes()
          .toString()
          .padStart(2, '0')} · 延遲`
      : null;
  // 今日漲跌（每股）：現價 − 前收（僅新鮮報價）。缺 prevClose 或過期則不顯示今日列。
  const prevCloseM =
    quoteFresh && quote?.prevClose ? new Money(quote.prevClose, position.currency) : null;
  const todayDelta = priceM && prevCloseM ? priceM.subtract(prevCloseM) : null;
  const todayPct =
    priceM && prevCloseM && !prevCloseM.isZero()
      ? priceM.subtract(prevCloseM).divide(prevCloseM.toDecimalString()).multiply('100').toNumber()
      : null;

  const priceCcyPrefix = currencyPrefix(position.currency);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 現價 hero */}
      <Text style={styles.priceLabel}>目前股價</Text>
      {priceM ? (
        <Text style={styles.priceValue} numberOfLines={1}>
          {priceCcyPrefix}{' '}
          {priceM.toNumber().toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ) : (
        <Text style={styles.priceValue} numberOfLines={1}>
          更新中…
        </Text>
      )}
      {priceM && todayDelta && todayPct !== null ? (
        <View style={styles.todayLine}>
          <Pnl
            value={todayPct}
            display={`${priceCcyPrefix} ${Math.abs(todayDelta.toNumber()).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            size={14}
          />
          <Pnl
            value={todayPct}
            display={`${Math.abs(todayPct).toFixed(2)}%`}
            signMode="plusminus"
            size={13}
          />
          <Text style={styles.todayWord}>今日</Text>
        </View>
      ) : null}
      <Text style={styles.delayNote}>{asOfLabel ?? '資料延遲 15 分鐘 · Yahoo Finance'}</Text>

      {/* 走勢圖 + 時間 tabs（真值：1D/1W 盤中、其餘日線；載入/空態不畫假線） */}
      <View style={styles.chart}>
        {trend.state === 'ready' ? (
          <Chart data={trend.series} height={164} />
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              {trend.state === 'loading' ? '歷史資料回補中…' : '暫無走勢資料'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.timeTabs}>
        <TimeTabs items={TIMEFRAMES} value={tf} onChange={setTf} />
      </View>

      {/* TWD / USD 顯示切換 */}
      <View style={styles.ccyToggle}>
        <Segmented options={CCY_OPTIONS} value={displayCcy} onChange={setDisplayCcy} />
      </View>

      {/* 我的持倉卡 */}
      <Card style={styles.posCard}>
        <Text style={styles.posTitle}>我的持倉</Text>
        <Kv k="持有股數" v={`${fmtShares(position.quantity, position.currency)} 股`} />
        <Kv
          k="平均成本"
          v={show(Money.fromDecimalString(position.averageCost, position.currency))}
        />
        <Kv k="市值" v={marketValue ? show(marketValue) : '更新中…'} />
        <Kv
          k="未實現損益"
          v={
            unrealized && retPct !== null ? (
              <View style={styles.unrealRow}>
                <Pnl
                  value={unrealized.toNumber()}
                  display={show(unrealized.isNegative() ? unrealized.negate() : unrealized)}
                  size={13}
                />
                <Pnl
                  value={retPct}
                  display={`${Math.abs(retPct).toFixed(2)}%`}
                  signMode="plusminus"
                  size={12}
                />
              </View>
            ) : (
              '更新中…'
            )
          }
        />
        <Kv
          k="已實現損益"
          v={
            <Pnl
              value={realized.toNumber()}
              display={show(realized.isNegative() ? realized.negate() : realized)}
              size={13}
            />
          }
        />
        <Kv k="帳戶分布" v={accountDistribution} last />
      </Card>
      {displayCcy !== position.currency ? (
        <Text style={styles.fxNote}>
          {rates !== null && rateDate !== null
            ? `跨幣別以 ${rateDate} 最新匯率換算`
            : '跨幣別以 demo 匯率 1 USD = 30.95 TWD 換算'}
        </Text>
      ) : null}

      {/* 動作鈕 */}
      <View style={styles.actions}>
        <Button
          title="＋ 為此標的新增交易"
          variant="gradient"
          onPress={() => navigation.navigate('AddTransaction')}
        />
        <Button
          title="查看完整交易歷史"
          variant="secondary"
          onPress={() => navigation.navigate('AssetTransactions', { market, symbol })}
        />
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

/** 鍵值列（label 左 / 值右；最後一列無底線）。 */
function Kv({ k, v, last }: { k: string; v: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.kv, last ? null : styles.kvDivider]}>
      <Text style={styles.kvKey}>{k}</Text>
      {typeof v === 'string' ? <Text style={styles.kvValue}>{v}</Text> : v}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.page, paddingBottom: spacing.xl },

  headerTitle: { alignItems: 'center', maxWidth: 220 },
  headerTitleMain: { fontFamily: fontFamily.text.bold, fontSize: 15, color: colors.textPrimary },
  headerSymbol: { fontFamily: fontFamily.num.bold, ...numericStyle },
  headerTitleSub: { fontFamily: fontFamily.text.regular, fontSize: 11, color: colors.textWeak },

  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screen,
  },

  // 現價 hero
  priceLabel: {
    fontFamily: fontFamily.text.regular,
    fontSize: 12,
    color: colors.textWeak,
    marginTop: spacing.xs,
  },
  priceValue: {
    fontFamily: fontFamily.num.extrabold,
    fontSize: 33,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
    ...numericStyle,
  },
  todayLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
  todayWord: { fontFamily: fontFamily.text.regular, fontSize: 12, color: colors.textWeak },
  delayNote: {
    fontFamily: fontFamily.text.regular,
    fontSize: 10.5,
    color: colors.textFaint,
    marginTop: 5,
  },

  chart: { marginTop: spacing.lg },
  chartPlaceholder: { height: 164, alignItems: 'center', justifyContent: 'center' },
  chartPlaceholderText: {
    fontFamily: fontFamily.text.regular,
    fontSize: 12,
    color: colors.textFaint,
  },
  timeTabs: { marginTop: spacing.sm },
  ccyToggle: { marginTop: spacing.lg + 2 },

  // 我的持倉卡
  posCard: { marginTop: spacing.md + 2 },
  posTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  kvDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  kvKey: { fontFamily: fontFamily.text.regular, fontSize: 13, color: colors.textWeak },
  kvValue: {
    fontFamily: fontFamily.num.semibold,
    fontSize: 13.5,
    color: colors.textPrimary,
    ...numericStyle,
  },
  unrealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fxNote: {
    fontFamily: fontFamily.text.regular,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: spacing.sm,
  },

  actions: { marginTop: spacing.lg, gap: spacing.md },
  bottomSpacer: { height: spacing.lg },
});
