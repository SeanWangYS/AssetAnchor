import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money, type Market, type Position } from '@assetanchor/shared';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import { Avatar, Card, Chart, Icon, Pnl, Segmented, TimeTabs } from '../../../core/ui';
import { colors, fontFamily, fontSize, numericStyle, spacing } from '../../../core/theme';
import { useHoldings } from '../useHoldings';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import { useCountUp } from '../useCountUp';
import {
  DEMO_SERIES,
  DEMO_SUMMARY,
  DISPLAY_CURRENCY,
  avatarColor,
  currencyPrefix,
  fmtAmount,
  fmtMoney,
  fmtShares,
  marketLabel,
  mockMarketValue,
  mockReturnPct,
  symbolMeta,
  toDisplay,
} from '../holdingsDemo';

/** 清單分組模式（持股 / 帳戶 / 類別）。 */
type GroupMode = '持股' | '帳戶' | '類別';
const GROUP_OPTIONS: readonly { value: GroupMode }[] = [
  { value: '持股' },
  { value: '帳戶' },
  { value: '類別' },
];

/** 持倉走勢 timeframe（design §3.1 item 5）。 */
type Timeframe = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
const TIMEFRAMES: readonly Timeframe[] = ['1M', '3M', 'YTD', '1Y', 'ALL'];

interface GroupSection {
  key: string;
  label: string;
  count: number;
  /** 右側原幣別市值小計字（demo）。 */
  subtotal: string;
  positions: Position[];
}

/** 該組原幣別市值小計（混幣別時各幣別分列）。 */
function subtotalText(positions: Position[]): string {
  const byCcy = new Map<Position['currency'], Money>();
  for (const p of positions) {
    const mv = mockMarketValue(p);
    byCcy.set(p.currency, (byCcy.get(p.currency) ?? Money.zero(p.currency)).add(mv));
  }
  return [...byCcy.entries()].map(([ccy, sum]) => fmtMoney(sum, ccy)).join(' · ');
}

function buildSections(positions: Position[], mode: GroupMode): GroupSection[] {
  if (mode === '持股') {
    return [
      {
        key: 'all',
        label: '',
        count: positions.length,
        subtotal: '',
        positions,
      },
    ];
  }
  if (mode === '帳戶') {
    const byAccount = new Map<string, Position[]>();
    for (const p of positions) {
      const acct = symbolMeta(p.symbol).account;
      byAccount.set(acct, [...(byAccount.get(acct) ?? []), p]);
    }
    return [...byAccount.entries()].map(([acct, list]) => ({
      key: acct,
      label: acct,
      count: list.length,
      subtotal: subtotalText(list),
      positions: list,
    }));
  }
  // 類別：依市場分（台股 TWD / 美股 USD …）。
  const byMarket = new Map<Market, Position[]>();
  for (const p of positions) {
    byMarket.set(p.market, [...(byMarket.get(p.market) ?? []), p]);
  }
  return [...byMarket.entries()].map(([market, list]) => {
    const ccy = list[0]?.currency ?? 'TWD';
    return {
      key: market,
      label: `${marketLabel(market)} · ${ccy}`,
      count: list.length,
      subtotal: subtotalText(list),
      positions: list,
    };
  });
}

/** 三段式持股 row：圓標 + 名稱/代號 + (股數·均價) + 市值/報酬%（design §3.1 item 7）。 */
function HoldingRow({
  position,
  dense,
  onPress,
}: {
  position: Position;
  dense: boolean;
  onPress: () => void;
}) {
  const meta = symbolMeta(position.symbol);
  const mv = mockMarketValue(position);
  const retPct = mockReturnPct(position.symbol);
  const avg = Money.fromDecimalString(position.averageCost, position.currency);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <Avatar
        symbol={position.symbol}
        color={avatarColor(position.symbol, colors.accent)}
        size={dense ? 34 : 40}
      />
      <View style={styles.rowMid}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {meta.name}
          </Text>
          <Text style={styles.rowSymbol}>{position.symbol}</Text>
        </View>
        <Text style={styles.rowSub} numberOfLines={1}>
          {fmtShares(position.quantity, position.currency)} 股 · 均價{' '}
          {currencyPrefix(position.currency)}
          {fmtAmount(avg, position.currency)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{fmtMoney(mv, position.currency)}</Text>
        <Pnl value={retPct} display={`${Math.abs(retPct).toFixed(2)}%`} size={12} />
      </View>
    </Pressable>
  );
}

export default function HoldingsOverviewScreen({
  navigation,
}: HoldingsStackScreenProps<'HoldingsOverview'>) {
  const positions = useHoldings();
  const rates = useExchangeRatesStore((s) => s.rates);
  const [mode, setMode] = useState<GroupMode>('持股');
  const [tf, setTf] = useState<Timeframe>('1Y');

  // 持倉是唯一保留 header ＋ 的 tab（design §1）：新增交易 → Root modal AddTransaction。
  // 同時放通知圓鈕（design §3.1 item 2）。
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="通知" hitSlop={8}>
            <Icon name="bell" color={colors.textSecondary} size={22} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="新增交易"
            hitSlop={8}
            onPress={() => navigation.navigate('AddTransaction')}
          >
            <Icon name="plus" color={colors.accent} size={24} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const sections = useMemo(() => buildSections(positions, mode), [positions, mode]);

  // 總資產 Hero（mock 摘要；需報價，故 count-up 跑 demo 值）。
  const totalAssets = useCountUp(DEMO_SUMMARY.totalAssets);

  // 真實跨幣別「總成本（TWD）」：以 rates（或 demo 匯率退回）即時換算加總。
  const grandCost = useMemo(() => {
    let sum = Money.zero(DISPLAY_CURRENCY);
    for (const p of positions) {
      const conv = toDisplay(
        Money.fromDecimalString(p.totalCost, p.currency),
        rates,
        DISPLAY_CURRENCY,
      );
      if (conv === null) return null;
      sum = sum.add(conv);
    }
    return sum;
  }, [positions, rates]);

  const series = DEMO_SERIES[tf] ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 總資產 Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>總資產（TWD）</Text>
        <Text style={styles.heroValue} numberOfLines={1}>
          NT$ {Math.round(totalAssets).toLocaleString('en-US')}
        </Text>
        <View style={styles.heroChange}>
          <Pnl
            value={DEMO_SUMMARY.unrealized}
            display={`NT$ ${Math.abs(DEMO_SUMMARY.unrealized).toLocaleString('en-US')}`}
            size={14}
          />
          <Pnl
            value={DEMO_SUMMARY.totalReturnPct}
            display={`${Math.abs(DEMO_SUMMARY.totalReturnPct).toFixed(2)}%`}
            signMode="plusminus"
            size={13}
          />
          <Text style={styles.heroPeriod}>全期</Text>
        </View>
        <Text style={styles.demoNote}>
          市值與今日數據為示意（報價接入為後續），成本來自實際交易
        </Text>
      </View>

      {/* 2×2 摘要 Bento */}
      <View style={styles.bento}>
        <Card glow padding={spacing.cardInner} style={styles.bentoCell}>
          <Text style={styles.bentoLabel}>總報酬率</Text>
          <View style={styles.bentoVal}>
            <Pnl
              value={DEMO_SUMMARY.totalReturnPct}
              display={`${Math.abs(DEMO_SUMMARY.totalReturnPct).toFixed(2)}%`}
              size={21}
              weight="extrabold"
            />
          </View>
        </Card>
        <Card padding={spacing.cardInner} style={styles.bentoCell}>
          <Text style={styles.bentoLabel}>總未實現損益</Text>
          <View style={styles.bentoVal}>
            <Pnl
              value={DEMO_SUMMARY.unrealized}
              display={`NT$ ${Math.abs(DEMO_SUMMARY.unrealized).toLocaleString('en-US')}`}
              size={18}
            />
          </View>
        </Card>
        <Card padding={spacing.cardInner} style={styles.bentoCell}>
          <Text style={styles.bentoLabel}>今日損益</Text>
          <View style={styles.bentoVal}>
            <Pnl
              value={DEMO_SUMMARY.today}
              display={`NT$ ${Math.abs(DEMO_SUMMARY.today).toLocaleString('en-US')}`}
              size={16}
            />
          </View>
          <View style={styles.bentoSub}>
            <Pnl
              value={DEMO_SUMMARY.todayPct}
              display={`${Math.abs(DEMO_SUMMARY.todayPct).toFixed(2)}%`}
              signMode="plusminus"
              size={12}
            />
          </View>
        </Card>
        <Card padding={spacing.cardInner} style={styles.bentoCell}>
          <Text style={styles.bentoLabel}>本月已實現損益</Text>
          <View style={styles.bentoVal}>
            <Pnl
              value={DEMO_SUMMARY.realizedThisMonth}
              display={`NT$ ${Math.abs(DEMO_SUMMARY.realizedThisMonth).toLocaleString('en-US')}`}
              size={18}
            />
          </View>
        </Card>
      </View>

      {/* 走勢圖卡 */}
      <Card style={styles.trendCard} padding={spacing.lg - 2}>
        <View style={styles.trendHead}>
          <Text style={styles.trendTitle}>資產走勢</Text>
          <Text style={styles.trendTf}>{tf}</Text>
        </View>
        <View style={styles.trendChart}>
          <Chart data={series} height={108} />
        </View>
        <TimeTabs items={TIMEFRAMES} value={tf} onChange={setTf} />
      </Card>

      {/* 分組切換 */}
      <View style={styles.segmentedWrap}>
        <Segmented options={GROUP_OPTIONS} value={mode} onChange={setMode} />
      </View>

      {/* 真實「總成本（TWD）」快照 */}
      <View style={styles.costRow}>
        <Text style={styles.costLabel}>總成本（TWD）</Text>
        <Text style={styles.costValue}>
          {grandCost === null
            ? '匯率未就緒'
            : `NT$ ${grandCost.toNumber().toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        </Text>
      </View>

      {/* 清單 */}
      {positions.length === 0 ? (
        <Text style={styles.empty}>尚無持倉，先到「交易」分頁記錄一筆買入</Text>
      ) : (
        sections.map((section) => (
          <View key={section.key}>
            {section.label !== '' ? (
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{section.label}</Text>
                <Text style={styles.groupCount}>{section.count} 檔</Text>
                <Text style={styles.groupSubtotal} numberOfLines={1}>
                  {section.subtotal}
                </Text>
              </View>
            ) : null}
            {section.positions.map((p) => (
              <HoldingRow
                key={`${p.market}_${p.symbol}`}
                position={p}
                dense={mode !== '持股'}
                onPress={() =>
                  navigation.navigate('AssetDetail', { market: p.market, symbol: p.symbol })
                }
              />
            ))}
          </View>
        ))
      )}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.page, paddingBottom: spacing.xl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  // Hero
  hero: { paddingTop: spacing.sm },
  heroLabel: { fontFamily: fontFamily.text.regular, fontSize: 12.5, color: colors.textWeak },
  heroValue: {
    fontFamily: fontFamily.num.extrabold,
    fontSize: fontSize.hero,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 3,
    ...numericStyle,
  },
  heroChange: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
  heroPeriod: { fontFamily: fontFamily.text.regular, fontSize: 12, color: colors.textWeak },
  demoNote: {
    fontFamily: fontFamily.text.regular,
    fontSize: 10.5,
    color: colors.textFaint,
    marginTop: 6,
  },

  // Bento 2×2
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: spacing.lg,
  },
  bentoCell: { width: '48.5%' },
  bentoLabel: { fontFamily: fontFamily.text.medium, fontSize: 11.5, color: colors.textWeak },
  bentoVal: { marginTop: 7 },
  bentoSub: { marginTop: 3 },

  // 走勢圖卡
  trendCard: { marginTop: spacing.md },
  trendHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendTitle: { fontFamily: fontFamily.text.bold, fontSize: 13, color: colors.textPrimary },
  trendTf: {
    fontFamily: fontFamily.num.medium,
    fontSize: 11,
    color: colors.textWeak,
    ...numericStyle,
  },
  trendChart: { marginTop: spacing.sm + 2 },

  segmentedWrap: { marginTop: spacing.lg },

  // 總成本快照
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  costLabel: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },
  costValue: {
    fontFamily: fontFamily.num.bold,
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
    ...numericStyle,
  },

  // 分組標頭
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg - 1,
    paddingBottom: 7,
  },
  groupLabel: { fontFamily: fontFamily.text.bold, fontSize: 13, color: colors.textPrimary },
  groupCount: { fontFamily: fontFamily.text.regular, fontSize: 11, color: colors.textFaint },
  groupSubtotal: {
    marginLeft: 'auto',
    fontFamily: fontFamily.num.semibold,
    fontSize: 12,
    color: colors.textSecondary,
    ...numericStyle,
  },

  // 持股 row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  pressed: { opacity: 0.6 },
  rowMid: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  rowName: {
    fontFamily: fontFamily.text.semibold,
    fontSize: 15,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  rowSymbol: {
    fontFamily: fontFamily.num.medium,
    fontSize: 12,
    color: colors.textWeak,
    ...numericStyle,
  },
  rowSub: {
    fontFamily: fontFamily.num.medium,
    fontSize: 12,
    color: colors.textWeak,
    marginTop: 2,
    ...numericStyle,
  },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowValue: {
    fontFamily: fontFamily.num.bold,
    fontSize: 15,
    color: colors.textPrimary,
    ...numericStyle,
  },

  empty: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
  bottomSpacer: { height: spacing.lg },
});
