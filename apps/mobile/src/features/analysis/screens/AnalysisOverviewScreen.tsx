import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Money, RateMap } from '@assetanchor/shared';
import type { AnalysisStackScreenProps } from '../../../core/navigation/types';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import {
  Card,
  Donut,
  DualBar,
  HBar,
  Icon,
  Pnl,
  Segmented,
  Toast,
  type DualBarDatum,
  type HBarRow,
} from '../../../core/ui';
import { chartCategory, colors, fontFamily, fontSize, radius, spacing } from '../../../core/theme';
import {
  DEMO_RATES,
  aggregateAnalysis,
  formatAmount,
  formatPercent,
  formatSignedAmount,
  toDisplay,
  type AnalysisAggregate,
  type AssetClass,
  type DisplayCurrency,
} from '../analysisData';

/**
 * AnalysisOverviewScreen —— 分析頁（版型 A：單頁垂直捲動，hero + 5 圖表卡，靜態無 drill-down）。
 *
 * 對齊 design.md §1（分析 tab）/ analysis-page-spec.md §3。資料為本地 mock 聚合
 * （analysisData.ts；市值需報價、報價未串接 → Non-goals），跨幣別於顯示時以最新
 * exchange_rates 即時換算（rates 未就緒退回 DEMO_RATES 1 USD = 30.95，design §5）。
 *
 * 邊界：本頁不 import 其他 feature（holdings/transactions）；只消費 core/ui + core/theme
 * + services/exchange-rates + @assetanchor/shared。
 */

const DONUT_SIZE = 168;
const DONUT_THICK = 28;
const COUNT_UP_MS = 950;

const CLASS_COLOR: Record<AssetClass, string> = {
  個股: chartCategory.stock,
  ETF: chartCategory.etf,
};

export default function AnalysisOverviewScreen({
  navigation,
}: AnalysisStackScreenProps<'AnalysisOverview'>) {
  const storeRates = useExchangeRatesStore((s) => s.rates);
  const [display, setDisplay] = useState<DisplayCurrency>('TWD');
  const [toastVisible, setToastVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // rates 未就緒 → 退回 demo 匯率（仍可在 Simulator demo），就緒則用最新牌告。
  const rates: RateMap = storeRates ?? DEMO_RATES;

  // 聚合（全 TWD 基準）；匯率缺對應 key 時 convertMoney fail loud → 降級為空態。
  const agg = useMemo<AnalysisAggregate | null>(() => {
    try {
      return aggregateAnalysis(rates);
    } catch {
      return null;
    }
  }, [rates]);

  // 刷新圓鈕（header right）→ toast + 重觸 count-up（資料為 mock，僅示意「報價已更新」）。
  const handleRefresh = () => {
    setToastVisible(true);
    setRefreshKey((k) => k + 1);
  };
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="重新整理報價"
          onPress={handleRefresh}
          style={styles.refreshBtn}
        >
          <Icon name="refresh" color={colors.accent} size={20} />
        </Pressable>
      ),
    });
  }, [navigation]);

  if (!agg) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>匯率尚未就緒，暫時無法換算分析數據</Text>
      </View>
    );
  }

  const heroValue = toDisplay(agg.totals.value, display, rates);

  // —— 圓餅資料（資產類別維度）——
  const donutSegments = agg.byClass.map((c) => ({
    value: c.sharePct,
    color: CLASS_COLOR[c.cls],
    label: c.cls,
  }));

  // —— 市值 vs 成本（直向雙柱；依市值排序；toNumber 為出圖逃生門）——
  const vcData: DualBarDatum[] = [...agg.holdings]
    .sort((a, b) => b.value.toNumber() - a.value.toNumber())
    .map((h) => ({
      label: h.symbol,
      primary: toDisplay(h.value, display, rates).toNumber(),
      secondary: toDisplay(h.cost, display, rates).toNumber(),
    }));

  // —— 報酬率（橫條，依報酬率排序，正負分色）——
  const retMax = Math.max(...agg.holdings.map((h) => Math.abs(h.returnPct)), 1);
  const retRows: HBarRow[] = [...agg.holdings]
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((h) => {
      const c = h.returnPct >= 0 ? colors.up : colors.down;
      return {
        label: h.symbol,
        sublabel: h.name,
        fraction: Math.abs(h.returnPct) / retMax,
        barColor: c,
        rightText: formatPercent(h.returnPct, true),
        rightColor: c,
      };
    });

  // —— 未實現損益（橫條，依金額排序，正負分色，依幣別換算）——
  const pnlMax = Math.max(...agg.holdings.map((h) => Math.abs(h.pnl.toNumber())), 1);
  const pnlRows: HBarRow[] = [...agg.holdings]
    .sort((a, b) => b.pnl.toNumber() - a.pnl.toNumber())
    .map((h) => {
      const c = h.pnl.isNegative() ? colors.down : colors.up;
      return {
        label: h.symbol,
        sublabel: h.name,
        fraction: Math.abs(h.pnl.toNumber()) / pnlMax,
        barColor: c,
        rightText: formatSignedAmount(toDisplay(h.pnl, display, rates), display),
        rightColor: c,
      };
    });

  // —— 市值佔比（橫條，accent 單色，依市值排序）——
  const totalValueNum = agg.totals.value.toNumber() || 1;
  const shareMax = Math.max(...agg.holdings.map((h) => h.value.toNumber() / totalValueNum), 0.0001);
  const shareRows: HBarRow[] = [...agg.holdings]
    .sort((a, b) => b.value.toNumber() - a.value.toNumber())
    .map((h) => {
      const p = h.value.toNumber() / totalValueNum;
      return {
        label: h.symbol,
        sublabel: h.name,
        fraction: p / shareMax,
        barColor: colors.accent,
        rightText: formatPercent(p * 100),
        rightColor: colors.textPrimary,
      };
    });

  const prefix = display === 'USD' ? 'US$' : 'NT$';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* —— Hero（彙總）—— */}
        <Card glow style={styles.heroCard}>
          <Text style={styles.heroLabel}>持股市值（{display}）</Text>
          <CountUpAmount value={heroValue} prefix={prefix} resetKey={`${display}-${refreshKey}`} />
          <View style={styles.heroPnlRow}>
            <Pnl
              value={agg.totals.pnl.toNumber()}
              display={formatAmount(toDisplay(agg.totals.pnl, display, rates), display)}
              size={14}
            />
            <Pnl
              value={agg.totals.returnPct}
              display={formatPercent(agg.totals.returnPct)}
              signMode="plusminus"
              size={14}
            />
            <Text style={styles.heroSpan}>全期</Text>
          </View>
          <Text style={styles.heroFootnote}>不含現金 · 匯率 1 USD = 30.95 · 資料延遲 15 分鐘</Text>
        </Card>

        {/* —— 全頁幣別切換 —— */}
        <View style={styles.segmentWrap}>
          <Segmented<DisplayCurrency>
            options={[{ value: 'TWD' }, { value: 'USD' }]}
            value={display}
            onChange={setDisplay}
          />
        </View>

        {/* —— 卡 1：資產配置（圓餅 + 圖例）—— */}
        <ChartCard title="資產配置" note="依資產類別" glow>
          <Donut
            segments={donutSegments}
            size={DONUT_SIZE}
            thickness={DONUT_THICK}
            center={
              <View style={styles.donutCenter}>
                <Text style={styles.donutCenterLabel}>持股市值</Text>
                <Text style={styles.donutCenterValue} numberOfLines={1}>
                  {formatAmount(heroValue, display)}
                </Text>
                <Pnl
                  value={agg.totals.returnPct}
                  display={formatPercent(agg.totals.returnPct)}
                  signMode="plusminus"
                  size={11}
                />
              </View>
            }
          />
          <View style={styles.legend}>
            {agg.byClass.map((c, i) => (
              <View key={c.cls} style={[styles.legendRow, i > 0 && styles.legendRowDivider]}>
                <View style={[styles.legendDot, { backgroundColor: CLASS_COLOR[c.cls] }]} />
                <Text style={styles.legendName}>{c.cls}</Text>
                <Text style={styles.legendCount}>{c.count} 檔</Text>
                <Text style={styles.legendValue}>
                  {formatAmount(toDisplay(c.value, display, rates), display)}
                </Text>
                <Text style={styles.legendPct}>{formatPercent(c.sharePct)}</Text>
              </View>
            ))}
          </View>
        </ChartCard>

        {/* —— 卡 2：市值 vs 投入成本（直向雙柱）—— */}
        <ChartCard title="市值 vs 投入成本" note={prefix}>
          <DualBar data={vcData} />
        </ChartCard>

        {/* —— 卡 3：報酬率（橫條，正負分色）—— */}
        <ChartCard title="報酬率" note="由高至低">
          <HBar rows={retRows} />
        </ChartCard>

        {/* —— 卡 4：未實現損益（橫條，正負分色）—— */}
        <ChartCard title="未實現損益" note={prefix}>
          <HBar rows={pnlRows} />
        </ChartCard>

        {/* —— 卡 5：市值佔比（橫條，accent 單色）—— */}
        <ChartCard title="市值佔比" note="佔總市值">
          <HBar rows={shareRows} />
        </ChartCard>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message="報價已更新（demo）"
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

/** Hero 大數字 count-up（~0.95s）。換幣別 / 刷新時以 resetKey 重跑。 */
function CountUpAmount({
  value,
  prefix,
  resetKey,
}: {
  value: Money;
  prefix: string;
  resetKey: string;
}) {
  const target = Math.round(Math.abs(value.toNumber()));
  const [shown, setShown] = useState(target);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: t }) => setShown(Math.round(target * t)));
    Animated.timing(anim, {
      toValue: 1,
      duration: COUNT_UP_MS,
      useNativeDriver: true,
    }).start();
    return () => anim.removeListener(id);
    // resetKey 改變（幣別 / 刷新）時重跑；target 隨之變化
  }, [resetKey, target, anim]);

  return (
    <Text style={styles.heroValue} numberOfLines={1}>
      {prefix} {shown.toLocaleString('en-US')}
    </Text>
  );
}

/** 圖卡外殼：標題（13.5/700）+ 右側小註，內容由 children 渲染。 */
function ChartCard({
  title,
  note,
  glow = false,
  children,
}: {
  title: string;
  note?: string;
  glow?: boolean;
  children: ReactNode;
}) {
  return (
    <Card glow={glow} style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        {note ? <Text style={styles.chartNote}>{note}</Text> : null}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, paddingBottom: spacing.xxl, gap: spacing.lg },

  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textWeak,
    textAlign: 'center',
  },

  // —— Hero ——
  heroCard: { gap: spacing.xs },
  heroLabel: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
  },
  heroValue: {
    fontFamily: fontFamily.num.extrabold,
    fontSize: 32,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  heroPnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  heroSpan: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },
  heroFootnote: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textFaint,
    marginTop: spacing.xs,
  },

  segmentWrap: { marginTop: spacing.xs },

  // —— 圖卡通用 ——
  chartCard: { gap: spacing.sm },
  chartHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chartTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  chartNote: {
    fontFamily: fontFamily.num.medium,
    fontSize: fontSize.label,
    color: colors.textWeak,
    fontVariant: ['tabular-nums'],
  },

  // —— Donut 中心 ——
  donutCenter: { alignItems: 'center', gap: 2 },
  donutCenterLabel: {
    fontFamily: fontFamily.text.regular,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  donutCenterValue: {
    fontFamily: fontFamily.num.extrabold,
    fontSize: 16.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },

  // —— Donut 圖例 ——
  legend: { marginTop: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8.5 },
  legendRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendName: {
    fontFamily: fontFamily.text.semibold,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  legendCount: {
    fontFamily: fontFamily.text.regular,
    fontSize: 11,
    color: colors.textFaint,
  },
  legendValue: {
    marginLeft: 'auto',
    fontFamily: fontFamily.num.medium,
    fontSize: 12,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  legendPct: {
    width: 56,
    textAlign: 'right',
    fontFamily: fontFamily.num.extrabold,
    fontSize: 12.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
