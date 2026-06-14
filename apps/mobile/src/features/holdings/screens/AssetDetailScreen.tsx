import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, type Currency } from '@assetanchor/shared';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import { Button, Card, Chart, Pnl, Segmented, TimeTabs } from '../../../core/ui';
import { colors, fontFamily, fontSize, numericStyle, spacing } from '../../../core/theme';
import { useHoldings } from '../useHoldings';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import {
  DEMO_SERIES,
  currencyPrefix,
  displayDecimals,
  fmtShares,
  marketLabel,
  mockMarketValue,
  mockPrice,
  mockReturnPct,
  mockTodayPct,
  mockUnrealized,
  symbolMeta,
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
  const meta = symbolMeta(symbol);

  const [tf, setTf] = useState<Timeframe>('1M');
  const [displayCcy, setDisplayCcy] = useState<Currency>(position?.currency ?? 'TWD');

  // header：中央顯示「代號 名稱」+ 副標（英文名 · 台股|美股）。
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleMain} numberOfLines={1}>
            <Text style={styles.headerSymbol}>{symbol}</Text> {meta.name}
          </Text>
          <Text style={styles.headerTitleSub} numberOfLines={1}>
            {meta.en} · {marketLabel(market)}
          </Text>
        </View>
      ),
    });
  }, [navigation, symbol, meta.name, meta.en, market]);

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
        <Text style={styles.notFound}>找不到持倉</Text>
      </View>
    );
  }

  const price = mockPrice(position);
  const marketValue = mockMarketValue(position);
  const unrealized = mockUnrealized(position);
  const retPct = mockReturnPct(symbol);
  const todayPct = mockTodayPct(symbol);
  // 今日漲跌金額（mock）= 現價 × 今日% （原幣別）。
  const todayDelta = price.multiply((todayPct / 100).toFixed(6));

  const series = DEMO_SERIES[tf] ?? [];
  const priceCcyPrefix = currencyPrefix(position.currency);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 現價 hero */}
      <Text style={styles.priceLabel}>目前股價</Text>
      <Text style={styles.priceValue} numberOfLines={1}>
        {priceCcyPrefix}{' '}
        {price.toNumber().toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>
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
      <Text style={styles.delayNote}>資料延遲 15 分鐘 · Yahoo Finance（示意）</Text>

      {/* 走勢圖 + 時間 tabs */}
      <View style={styles.chart}>
        <Chart data={series} height={164} />
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
        <Kv k="市值" v={show(marketValue)} />
        <Kv
          k="未實現損益"
          v={
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
          }
        />
        <Kv k="帳戶分布" v={meta.account} last />
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
  notFound: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textSecondary,
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
