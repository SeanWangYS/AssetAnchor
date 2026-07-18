import { useLayoutEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Money,
  deriveHoldings,
  formatDisplayDate,
  formatPrice,
  transactionTotalWithFees,
  type Currency,
  type TransactionDocument,
  type TransactionType,
} from '@assetanchor/shared';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import { Card, EmptyState } from '../../../core/ui';
import {
  colors,
  fontFamily,
  gradientDirection,
  gradients,
  numericStyle,
  radius,
  spacing,
} from '../../../core/theme';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import { useSymbolMap, symbolNameOf } from '../../../services/symbols';
import { currencyPrefix, displayDecimals, fmtShares, marketLabel } from '../holdingsDemo';

/** 買/賣膠囊（design §2.2：買 紫→洋紅 / 賣 藍→青；非台股紅綠）。其餘類型用次文字底。 */
function TypePill({ type }: { type: TransactionType }) {
  if (type === 'BUY' || type === 'SELL') {
    const colorsStop = type === 'BUY' ? gradients.buy : gradients.sell;
    return (
      <LinearGradient
        colors={colorsStop}
        start={gradientDirection.diagonal135.start}
        end={gradientDirection.diagonal135.end}
        style={styles.pill}
      >
        <Text style={styles.pillText}>{type === 'BUY' ? '買入' : '賣出'}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.pill, styles.pillNeutral]}>
      <Text style={styles.pillText}>{type}</Text>
    </View>
  );
}

/** 金額顯示（含幣別前綴與小數位）。 */
function fmt(value: string, currency: Currency): string {
  return `${currencyPrefix(currency)} ${Money.fromDecimalString(value, currency)
    .toNumber()
    .toLocaleString('en-US', {
      minimumFractionDigits: displayDecimals(currency),
      maximumFractionDigits: displayDecimals(currency),
    })}`;
}

export default function AssetTransactionsScreen({
  route,
  navigation,
}: HoldingsStackScreenProps<'AssetTransactions'>) {
  const { market, symbol } = route.params;
  const allTx = useTransactionsStore((s) => s.transactions);
  // 名稱真值（Sprint 6）：唯讀訂閱 symbols store（自個股詳情進入時已 enrich）；缺值 fallback 代號。
  const symbols = useSymbolMap();

  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: `${symbol} 交易歷史` });
  }, [navigation, symbol]);

  // 該 (market, symbol) 全部交易，依日期由新到舊（顯示用）。
  const timeline = useMemo(
    () =>
      allTx
        .filter((t) => t.market === market && t.symbol === symbol)
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
    [allTx, market, symbol],
  );

  // 目前彙總：與全 app 單一事實來源 deriveHoldings 同口徑——BUY/SELL 時序淨額、加權平均、
  // 賣出減量（不可只加買入；否則賣出後股數對不上，見修復記錄）。全數賣出（qty=0）時
  // deriveHoldings 不回該 position → 視為持有 0、成本 0（交易歷史仍照常顯示明細）。
  const summary = useMemo(() => {
    const ccy: Currency = timeline[0]?.currency ?? 'TWD';
    const zero = Money.zero(ccy).toDecimalString();
    const pos = deriveHoldings(timeline).find((p) => p.market === market && p.symbol === symbol);
    return {
      ccy,
      qty: pos?.quantity ?? zero,
      cost: pos?.totalCost ?? zero,
      avg: pos?.averageCost ?? zero,
      buyCount: timeline.filter((t) => t.transaction_type === 'BUY').length,
      sellCount: timeline.filter((t) => t.transaction_type === 'SELL').length,
    };
  }, [timeline, market, symbol]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {timeline.length === 0 ? (
        <EmptyState title="此標的尚無交易紀錄" />
      ) : (
        <>
          {/* 目前彙總 */}
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              <Text style={styles.summarySymbol}>{symbol}</Text>{' '}
              {symbolNameOf(symbols, market, symbol)} · {marketLabel(market)}
            </Text>
            <Kv k="持有股數" v={`${fmtShares(summary.qty, summary.ccy)} 股`} />
            <Kv k="加權均價" v={formatPrice(summary.avg, summary.ccy)} />
            <Kv k="總成本" v={fmt(summary.cost, summary.ccy)} />
            <Kv k="交易筆數" v={`買 ${summary.buyCount} · 賣 ${summary.sellCount}`} last />
          </Card>

          {/* 交易明細時間軸 */}
          <Text style={styles.sectionTitle}>交易明細</Text>
          {timeline.map((t) => (
            <TxRow key={t.transaction_id} tx={t} />
          ))}
        </>
      )}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

/** 單筆交易列：日期 + 買/賣膠囊 + 股數@單價 + 手續費/稅。 */
function TxRow({ tx }: { tx: TransactionDocument }) {
  return (
    <View style={styles.txRow}>
      <View style={styles.txTop}>
        <TypePill type={tx.transaction_type} />
        <Text style={styles.txDate}>{formatDisplayDate(tx.transaction_date)}</Text>
        <Text style={styles.txTotal}>{fmt(transactionTotalWithFees(tx), tx.currency)}</Text>
      </View>
      <Text style={styles.txDetail} numberOfLines={1}>
        {fmtShares(tx.quantity, tx.currency)} 股 @ {formatPrice(tx.price, tx.currency)} · 手續費{' '}
        {fmt(tx.fee, tx.currency)}
        {Money.fromDecimalString(tx.tax, tx.currency).isZero()
          ? ''
          : ` · 稅 ${fmt(tx.tax, tx.currency)}`}
      </Text>
    </View>
  );
}

function Kv({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={[styles.kv, last ? null : styles.kvDivider]}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvValue}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.page, paddingVertical: spacing.lg },

  summaryCard: { marginBottom: spacing.lg },
  summaryTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  summarySymbol: { fontFamily: fontFamily.num.bold, ...numericStyle },

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

  sectionTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  txRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  txTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  txDate: {
    fontFamily: fontFamily.num.medium,
    fontSize: 12,
    color: colors.textWeak,
    ...numericStyle,
  },
  txTotal: {
    marginLeft: 'auto',
    fontFamily: fontFamily.num.bold,
    fontSize: 14,
    color: colors.textPrimary,
    ...numericStyle,
  },
  txDetail: {
    fontFamily: fontFamily.num.medium,
    fontSize: 12,
    color: colors.textWeak,
    marginTop: 5,
    ...numericStyle,
  },

  pill: {
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillNeutral: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider },
  pillText: { fontFamily: fontFamily.text.bold, fontSize: 11, color: colors.onPrimary },

  bottomSpacer: { height: spacing.lg },
});
