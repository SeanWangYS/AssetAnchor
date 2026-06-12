import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, type Market, type Position } from '@assetanchor/shared';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import { useHoldings } from '../useHoldings';
import { ListItem } from '../../../core/ui';
import { colors, fontSize, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

const H = zhTW.holdings;

/** 市場分組（deriveHoldings 已依 market 升冪排序，TW 在 US 前）。 */
function groupByMarket(positions: Position[]): [Market, Position[]][] {
  const groups = new Map<Market, Position[]>();
  for (const p of positions) {
    const list = groups.get(p.market) ?? [];
    list.push(p);
    groups.set(p.market, list);
  }
  return [...groups.entries()];
}

/** 該市場原幣別總成本小計（混幣別資料異常時由 Money fail loud）。 */
function marketSubtotal(positions: Position[]): string {
  const first = positions[0];
  if (!first) return '';
  let sum = Money.zero(first.currency);
  for (const p of positions) {
    sum = sum.add(Money.fromDecimalString(p.totalCost, p.currency));
  }
  return `${first.currency} ${sum.toDisplayString()}`;
}

function money(value: string, currency: Position['currency']): string {
  return Money.fromDecimalString(value, currency).toDisplayString();
}

/** 股數顯示：整數股不帶小數、零股保留（toNumber 為 UI 顯示逃生門）。 */
function shares(quantity: string, currency: Position['currency']): string {
  return Money.fromDecimalString(quantity, currency).toNumber().toLocaleString();
}

export default function HoldingsOverviewScreen({
  navigation,
}: HoldingsStackScreenProps<'HoldingsOverview'>) {
  const positions = useHoldings();
  const groups = groupByMarket(positions);

  return (
    <ScrollView>
      {positions.length === 0 ? (
        <Text style={styles.empty}>{H.empty}</Text>
      ) : (
        groups.map(([market, list]) => (
          <View key={market}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{market}</Text>
              <Text style={styles.groupSubtotal}>
                {H.costSubtotal} {marketSubtotal(list)}
              </Text>
            </View>
            {list.map((p) => (
              <ListItem
                key={`${p.market}_${p.symbol}`}
                title={p.symbol}
                subtitle={`${shares(p.quantity, p.currency)} ${H.shares} · ${H.avgCost} ${money(p.averageCost, p.currency)}`}
                right={<Text style={styles.cost}>{money(p.totalCost, p.currency)}</Text>}
                onPress={() =>
                  navigation.navigate('AssetDetail', { market: p.market, symbol: p.symbol })
                }
              />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  groupTitle: { fontSize: fontSize.caption, fontWeight: '600', color: colors.textMuted },
  groupSubtotal: { fontSize: fontSize.caption, color: colors.textMuted },
  cost: { fontSize: fontSize.body, color: colors.text },
});
