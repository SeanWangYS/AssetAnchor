import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  aggregateHoldings,
  buildAnalysisInput,
  deriveHoldingsSafe,
  type AssetType,
  type Money,
  type Position,
  type RateMap,
} from '@assetanchor/shared';
import type { AnalysisStackScreenProps } from '../../../core/navigation/types';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import { usePreferencesStore } from '../../../services/preferences';
import {
  quoteFor,
  useQuotes,
  useQuotesStore,
  useRefreshQuotesOnFocus,
} from '../../../services/quotes';
import { symbolNameOf, symbolTargetsFromTransactions, useSymbols } from '../../../services/symbols';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import {
  Card,
  Donut,
  DualBar,
  EmptyState,
  ErrorState,
  HBar,
  Icon,
  LoadingView,
  Pnl,
  ScreenHeader,
  Segmented,
  Toast,
  type DualBarDatum,
  type HBarRow,
} from '../../../core/ui';
import { chartCategory, colors, fontFamily, fontSize, radius, spacing } from '../../../core/theme';
import {
  DEMO_RATES,
  formatAmount,
  formatPercent,
  formatSignedAmount,
  fxFootnoteRate,
  toDisplay,
  type AnalysisAggregate,
  type AssetClass,
  type DisplayCurrency,
} from '../analysisData';

/**
 * AnalysisOverviewScreen —— 分析頁（版型 A：單頁垂直捲動，hero + 5 圖表卡，靜態無 drill-down）。
 *
 * 對齊 design.md §1（分析 tab）/ analysis-page-spec.md §3。資料為**真實持倉 × 報價**
 * （wire-analysis-real-data）：持倉由 transactions 經 shared `deriveHoldings` 推導（零新增監聽），
 * 市值 = 現價 × 股數（shared `buildAnalysisInput`），聚合走 shared `aggregateHoldings`（TWD 基準），
 * 跨幣別於顯示時以最新 exchange_rates 即時換算（未就緒退 DEMO_RATES，design §5）。
 * 報價降級對齊持倉頁（resilient-quote-display）：缺報價排除 + 揭露「N 檔報價更新中」、
 * 全缺顯示「報價載入中…」、過期揭露「最後已知報價（延遲）」；不以假值充數。
 *
 * 邊界：本頁不 import 其他 feature 的元件/衍生 hook；transactions 僅讀 zustand store
 * （codebase 既有慣例，見 change design D1），其餘消費 core/ui + core/theme + services/* + shared。
 */

const DONUT_SIZE = 168;
const DONUT_THICK = 28;
const COUNT_UP_MS = 950;

const CLASS_COLOR: Record<AssetClass, string> = {
  個股: chartCategory.stock,
  ETF: chartCategory.etf,
};

export default function AnalysisOverviewScreen(
  _props: AnalysisStackScreenProps<'AnalysisOverview'>,
) {
  const transactions = useTransactionsStore((s) => s.transactions);
  const txLoading = useTransactionsStore((s) => s.loading);
  const txError = useTransactionsStore((s) => s.error);
  const storeRates = useExchangeRatesStore((s) => s.rates);
  // 切換預設值＝使用者顯示幣別偏好（登入時灌入 store）；之後使用者可在本頁自行切換。
  const preferredDisplayCurrency = usePreferencesStore((s) => s.preferredDisplayCurrency);
  const [display, setDisplay] = useState<DisplayCurrency>(preferredDisplayCurrency);
  const [toastVisible, setToastVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 持倉真值（design D1）：跨 feature 只讀 store，推導委派 shared 純函式；
  // fail-soft 邊界同 features/holdings/useHoldings（資料不一致時降級空持倉，不白屏）。
  const positions = useMemo<Position[]>(() => {
    try {
      // 逐-symbol 容錯（enable-crypto-quotes D8）：單一 symbol 爛資料不清空整包。
      return deriveHoldingsSafe(transactions).positions;
    } catch (err) {
      console.warn(
        '[analysis] deriveHoldings 推導失敗，降級為空持倉：',
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }, [transactions]);

  // Symbol metadata：名稱 enrich（services/symbols）+ asset_type（自交易推導，同持倉頁語意）。
  const symbolTargets = useMemo(() => symbolTargetsFromTransactions(transactions), [transactions]);
  const symbols = useSymbols(symbolTargets);
  const assetTypes = useMemo(() => {
    const m = new Map<string, AssetType>();
    for (const t of symbolTargets) m.set(`${t.market}_${t.symbol}`, t.assetType);
    return m;
  }, [symbolTargets]);

  // 報價（ADR-0006 雙層 cache，與持倉頁共用）：targets 變動載入 + focus/回前景檢查新鮮度。
  const quoteTargets = positions.map((p) => ({
    market: p.market,
    symbol: p.symbol,
    currency: p.currency,
  }));
  const quotes = useQuotes(quoteTargets);
  useRefreshQuotesOnFocus(quoteTargets);
  // targets 每次 render 為新陣列；refresh handler 由 ref 取最新值（同 useRefreshQuotesOnFocus 模式）。
  const quoteTargetsRef = useRef(quoteTargets);
  quoteTargetsRef.current = quoteTargets;

  // rates 未就緒 → 退回 demo 匯率（仍可在 Simulator demo），就緒則用最新牌告。
  const rates: RateMap = storeRates ?? DEMO_RATES;

  // 聚合輸入（shared 純函式）：市值 = 現價 × 股數；缺報價排除 + pending/stale 計數。
  const input = useMemo(
    () =>
      buildAnalysisInput(
        positions,
        (market, symbol) => {
          const q = quoteFor(quotes, market, symbol);
          return q ? { price: q.price, fetchedAtMs: q.fetchedAtMs } : undefined;
        },
        (market, symbol) => {
          const name = symbolNameOf(symbols, market, symbol);
          const assetType = assetTypes.get(`${market}_${symbol}`);
          return assetType ? { name, assetType } : { name };
        },
        Date.now(),
      ),
    [positions, quotes, symbols, assetTypes],
  );

  // 聚合（全 TWD 基準）；匯率缺對應 key 時 convertMoney fail loud → 降級為匯率未就緒空態。
  const agg = useMemo<AnalysisAggregate | null>(() => {
    if (input.rawHoldings.length === 0) return null;
    try {
      return aggregateHoldings(input.rawHoldings, rates, 'TWD');
    } catch {
      return null;
    }
  }, [input, rates]);

  // 降級態「重試」→ 真實 force 刷新報價（略過 TTL）+ toast + 重觸 count-up。
  // （header 刷新圓鈕已移除——focus 依 TTL 自動刷新已涵蓋，owner 2026-07-04 拍板）
  const handleRefresh = () => {
    void useQuotesStore
      .getState()
      .loadFor(quoteTargetsRef.current, { force: true })
      .then(() => {
        setToastVisible(true);
        setRefreshKey((k) => k + 1);
      });
  };

  // —— 降級態（change design D3；語彙對齊持倉頁）——
  // 自繪 ScreenHeader（unify-screen-headers）：原生 header 已關，
  // 每個狀態（錯誤/載入/空/降級/資料）都要帶標題列，統一用 wrapper 包。
  const screen = (children: ReactNode) => (
    <View style={styles.screen}>
      <ScreenHeader title="分析" />
      {children}
    </View>
  );

  if (transactions.length === 0 && txError) {
    return screen(<ErrorState message="載入失敗" subtitle="請檢查網路後重新開啟" />);
  }
  if (transactions.length === 0 && txLoading) {
    return screen(<LoadingView label="載入持倉中…" />);
  }
  if (positions.length === 0) {
    return screen(
      <EmptyState
        title="尚無持倉"
        subtitle="先到「交易」分頁記錄一筆買入"
        icon={<Icon name="txn" size={26} color={colors.accent} />}
      />,
    );
  }
  if (input.includedCount === 0 || !agg) {
    // 全部缺報價（冷啟動尚未回填）或匯率換算失敗：無資料可畫，顯示載入/降級態 + 重試。
    const pendingQuotes = input.includedCount === 0;
    return screen(
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>
          {pendingQuotes ? '報價載入中…' : '匯率尚未就緒，暫時無法換算分析數據'}
        </Text>
        {pendingQuotes ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="重試報價"
            onPress={handleRefresh}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>重試</Text>
          </Pressable>
        ) : null}
        <Toast visible={toastVisible} message="報價已更新" onHide={() => setToastVisible(false)} />
      </View>,
    );
  }

  const heroValue = toDisplay(agg.totals.value, display, rates);

  // —— 圓餅資料（資產類別維度；單一類別時過濾 0 檔類別，避免空分段/空圖例列）——
  const classRollups = agg.byClass.filter((c) => c.count > 0);
  const donutSegments = classRollups.map((c) => ({
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
  const showDisclosure = input.pendingCount > 0 || input.anyStale;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="分析" />
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
          {/* 降級揭露（對齊持倉頁）：部分缺報價 / 含過期最後已知報價 + 重試。 */}
          {showDisclosure ? (
            <View style={styles.staleRow}>
              <Text style={styles.staleText} numberOfLines={1}>
                {input.pendingCount > 0 ? `${input.pendingCount} 檔報價更新中` : ''}
                {input.pendingCount > 0 && input.anyStale ? ' · ' : ''}
                {input.anyStale ? '部分為最後已知報價（延遲）' : ''}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重試報價"
                hitSlop={6}
                onPress={handleRefresh}
              >
                <Text style={styles.staleRetry}>重試</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.heroFootnote}>
            不含現金 · 匯率 1 USD = {fxFootnoteRate(rates)} · 資料延遲 15 分鐘
          </Text>
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
            {classRollups.map((c, i) => (
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

      <Toast visible={toastVisible} message="報價已更新" onHide={() => setToastVisible(false)} />
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

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textWeak,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  retryBtnText: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.label,
    color: colors.accent,
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
  staleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  staleText: { fontFamily: fontFamily.text.regular, fontSize: 11, color: colors.textSecondary },
  staleRetry: { fontFamily: fontFamily.text.bold, fontSize: 11, color: colors.accent },

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
