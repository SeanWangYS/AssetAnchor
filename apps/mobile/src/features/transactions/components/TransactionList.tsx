import { Fragment, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TransactionDocument } from '@assetanchor/shared';
import { Pnl } from '../../../core/ui';
import { colors, fontFamily, fontSize, numericStyle, spacing } from '../../../core/theme';
import TxnPill from './TxnPill';
import {
  dayOfMonth,
  formatMoney,
  formatPrice,
  formatQuantity,
  groupByMonth,
} from '../transactionsView';

/**
 * TransactionList —— 時間軸版型 B（transactions-page-spec T1/T3）。
 * 左日期欄（日大字＋月小字，同日合併）＋ 按月分組 header（含筆數）＋ 每列：
 * 買/賣漸層膠囊 + 代號 + 股數×單價（左側細線分隔），右側總金額（原幣別、含手續費），
 * 賣出加「已實現 ±」（漲跌色）。純列表、無頁面統計（T8）。
 *
 * 已實現損益：MVP 的 TransactionDocument 尚無 realized 欄位（SELL 聚合為 Sprint 5），
 * 故僅當資料帶 realized 時才渲染該行；目前真實資料不會出現（見回報 flag）。
 */
interface TransactionListProps {
  transactions: TransactionDocument[];
  /** account_id → 識別色（Avatar / 視覺；列表本身不顯示帳戶名，T3）。 */
  onRowPress: (transactionId: string) => void;
}

export default function TransactionList({ transactions, onRowPress }: TransactionListProps) {
  const groups = useMemo(() => groupByMonth(transactions), [transactions]);

  return (
    <View style={styles.list}>
      {groups.map((g) => (
        <View key={g.key}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupLabel}>{g.label}</Text>
            <Text style={styles.groupCount}>{g.items.length} 筆</Text>
          </View>
          {g.items.map((t, i) => {
            const prev = g.items[i - 1];
            const showDate = i === 0 || prev?.transaction_date !== t.transaction_date;
            return <Row key={t.transaction_id} t={t} showDate={showDate} onPress={onRowPress} />;
          })}
        </View>
      ))}
    </View>
  );
}

interface RowProps {
  t: TransactionDocument;
  showDate: boolean;
  onPress: (transactionId: string) => void;
}

/** realized 為 forward-compatible 的可選欄位（目前 schema 無，UI 預留）。 */
function rowRealized(t: TransactionDocument): string | undefined {
  const maybe = (t as { realized?: string }).realized;
  return typeof maybe === 'string' ? maybe : undefined;
}

function Row({ t, showDate, onPress }: RowProps) {
  const realized = t.transaction_type === 'SELL' ? rowRealized(t) : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(t.transaction_id)}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.dateCol}>
        {showDate ? (
          <Fragment>
            <Text style={styles.day}>{dayOfMonth(t.transaction_date)}</Text>
            <Text style={styles.monthSmall}>{monthShort(t.transaction_date)}</Text>
          </Fragment>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <TxnPill type={t.transaction_type} />
          <Text style={styles.symbol} numberOfLines={1}>
            {t.symbol}
          </Text>
        </View>
        <Text style={styles.qtyPx} numberOfLines={1}>
          {formatQuantity(t.quantity, t.currency)} 股 × {formatPrice(t.price, t.currency)}
        </Text>
      </View>

      <View style={styles.amountCol}>
        <Text style={styles.total} numberOfLines={1}>
          {formatMoney(t.total, t.currency)}
        </Text>
        {realized !== undefined ? (
          <View style={styles.realizedWrap}>
            <Text style={styles.realizedLabel}>已實現 </Text>
            <Pnl
              value={Number(realized)}
              display={formatMoney(realized.replace('-', ''), t.currency)}
              signMode="plusminus"
              size={10.5}
              weight="bold"
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const MONTH_SHORT = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
] as const;

function monthShort(date: string): string {
  const idx = Number(date.slice(5, 7)) - 1;
  return MONTH_SHORT[idx] ?? '';
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingTop: spacing.lg - 1,
    paddingBottom: spacing.xs + 2,
    paddingHorizontal: 2,
  },
  groupLabel: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.footnote,
    color: colors.textPrimary,
  },
  groupCount: {
    fontFamily: fontFamily.num.medium,
    fontSize: 11,
    color: colors.textWeak,
    ...numericStyle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: 9,
    paddingHorizontal: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  dateCol: { width: 40, alignItems: 'center', alignSelf: 'flex-start', paddingTop: 2 },
  day: {
    fontFamily: fontFamily.num.extrabold,
    fontSize: fontSize.body,
    lineHeight: 18,
    color: colors.textPrimary,
    ...numericStyle,
  },
  monthSmall: {
    fontFamily: fontFamily.text.regular,
    fontSize: 9,
    color: colors.textWeak,
    marginTop: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
    paddingLeft: spacing.md,
  },
  titleRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  symbol: {
    flexShrink: 1,
    fontFamily: fontFamily.num.semibold,
    fontSize: 14,
    color: colors.textPrimary,
    ...numericStyle,
  },
  qtyPx: {
    fontFamily: fontFamily.num.medium,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 3,
    ...numericStyle,
  },
  amountCol: { alignItems: 'flex-end' },
  total: {
    fontFamily: fontFamily.num.bold,
    fontSize: 13.5,
    color: colors.textPrimary,
    ...numericStyle,
  },
  realizedWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  realizedLabel: {
    fontFamily: fontFamily.text.medium,
    fontSize: 10.5,
    color: colors.textWeak,
  },
});
