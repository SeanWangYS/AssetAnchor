import { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, convertMoney, type Currency, type TransactionDocument } from '@assetanchor/shared';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import { useHoldings } from '../useHoldings';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import { colors, fontSize, radius, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

const H = zhTW.holdings;

/** MVP 支援的顯示幣別切換選項。 */
const TOGGLE_CURRENCIES: Currency[] = ['TWD', 'USD'];

function money(value: string, currency: TransactionDocument['currency']): string {
  return Money.fromDecimalString(value, currency).toDisplayString();
}

export default function AssetDetailScreen({
  route,
  navigation,
}: HoldingsStackScreenProps<'AssetDetail'>) {
  const { market, symbol } = route.params;
  const positions = useHoldings();
  const transactions = useTransactionsStore((s) => s.transactions);
  const rates = useExchangeRatesStore((s) => s.rates);

  const position = positions.find((p) => p.market === market && p.symbol === symbol);
  const [displayCcy, setDisplayCcy] = useState<Currency>(position?.currency ?? 'TWD');

  useLayoutEffect(() => {
    navigation.setOptions({ title: symbol });
  }, [navigation, symbol]);

  if (!position) {
    return <Text style={styles.empty}>{H.notFound}</Text>;
  }

  // 對帳 timeline：該股全部交易依 transaction_date 升冪（持股累積順序，design D6）。
  const timeline = transactions
    .filter((t) => t.market === market && t.symbol === symbol)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  // 以最新匯率把原幣別金額換算成 displayCcy（同幣別免匯率；無匯率則維持原幣別）。
  const converted = displayCcy !== position.currency && rates !== null;
  const shown = (value: string): string => {
    const native = Money.fromDecimalString(value, position.currency);
    return converted
      ? convertMoney(native, rates, displayCcy).toDisplayString()
      : native.toDisplayString();
  };
  const shownCurrency = converted ? displayCcy : position.currency;

  const summary: [string, string][] = [
    [
      H.fields.quantity,
      Money.fromDecimalString(position.quantity, position.currency).toNumber().toLocaleString(),
    ],
    [H.fields.averageCost, shown(position.averageCost)],
    [H.fields.totalCost, shown(position.totalCost)],
    [H.fields.currency, shownCurrency],
  ];

  return (
    <ScrollView contentContainerStyle={styles.c}>
      <View style={styles.toggle}>
        {TOGGLE_CURRENCIES.map((ccy) => {
          const disabled = ccy !== position.currency && rates === null;
          const active = ccy === displayCcy;
          return (
            <Pressable
              key={ccy}
              accessibilityRole="button"
              disabled={disabled}
              onPress={() => setDisplayCcy(ccy)}
              style={[styles.toggleBtn, active && styles.toggleBtnActive]}
            >
              <Text
                style={[
                  styles.toggleText,
                  active && styles.toggleTextActive,
                  disabled && styles.toggleTextDisabled,
                ]}
              >
                {ccy}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {converted && <Text style={styles.fxNote}>{H.fxAsOfNote}</Text>}

      <View style={styles.card}>
        {summary.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{H.timeline.title}</Text>
      {timeline.map((t) => (
        <View key={t.transaction_id} style={styles.txRow}>
          <Text style={styles.txDate}>{t.transaction_date}</Text>
          <Text style={styles.txDetail}>
            {Money.fromDecimalString(t.quantity, t.currency).toNumber().toLocaleString()} {H.shares}{' '}
            @ {money(t.price, t.currency)}
          </Text>
          <Text style={styles.txFee}>
            {H.timeline.fee} {money(t.fee, t.currency)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { padding: spacing.lg, gap: spacing.md },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: fontSize.caption, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.onPrimary },
  toggleTextDisabled: { color: colors.border },
  fxNote: { fontSize: fontSize.caption, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: fontSize.body, color: colors.textMuted },
  value: { fontSize: fontSize.body, color: colors.text, fontWeight: '600' },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txDate: { fontSize: fontSize.caption, color: colors.textMuted, width: 88 },
  txDetail: { fontSize: fontSize.body, color: colors.text, flex: 1 },
  txFee: { fontSize: fontSize.caption, color: colors.textMuted },
});
