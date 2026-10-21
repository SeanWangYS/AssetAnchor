import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DISPLAY_CURRENCIES,
  classifyQuoteStaleness,
  formatAxisTick,
  formatDisplayDate,
  formatPercent,
  type DisplayCurrency,
} from '@assetanchor/shared';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import {
  Card,
  Chart,
  EmptyState,
  ErrorState,
  Icon,
  LoadingView,
  Pnl,
  ScreenHeader,
  Segmented,
  TimeTabs,
  Toast,
} from '../../../core/ui';
import { colors, fontFamily, fontSize, numericStyle, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';
import { useHoldings } from '../useHoldings';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import { usePreferencesStore } from '../../../services/preferences';
import {
  quoteErrorFor,
  quoteFor,
  useQuotes,
  useQuotesStore,
  useRefreshQuotesOnFocus,
} from '../../../services/quotes';
import { useSymbols, symbolTargetsFromTransactions } from '../../../services/symbols';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import { useCountUp } from '../useCountUp';
import { useTrendSeries } from '../useTrendSeries';
import { currencyPrefix, displayDecimals } from '../holdingsDemo';
import { computeHoldingsHero, countQuoteNotFound } from '../holdingsHero';
import { usePortfolioReturn } from '../usePortfolioReturn';
import { useHoldingsSort, useHoldingsTable } from '../useHoldingsTable';
import { HoldingsTable } from '../components/HoldingsTable';
import { staleNoticeFor } from '../staleNotice';
import { useAccountsStore } from '../../accounts/accountsStore';

/** 清單分組模式（持股 / 帳戶 / 類別）。 */
type GroupMode = '持股' | '帳戶' | '類別';
const GROUP_OPTIONS: readonly { value: GroupMode }[] = [
  { value: '持股' },
  { value: '帳戶' },
  { value: '類別' },
];

/** 顯示幣別切換選項（label = value）。此切換＝全 app 顯示幣別偏好控制（持久化）。 */
const CCY_OPTIONS = DISPLAY_CURRENCIES.map((value) => ({ value }));

/** 持倉走勢 timeframe（design §3.1 item 5）。 */
type Timeframe = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
const TIMEFRAMES: readonly Timeframe[] = ['1M', '3M', 'YTD', '1Y', 'ALL'];

export default function HoldingsOverviewScreen({
  navigation,
}: HoldingsStackScreenProps<'HoldingsOverview'>) {
  const positions = useHoldings();
  // Symbol 名稱真值（Sprint 6）：以交易清單（含 asset_type）為來源 enrich + 顯示。
  const transactions = useTransactionsStore((s) => s.transactions);
  const accounts = useAccountsStore((s) => s.accounts);
  const txLoading = useTransactionsStore((s) => s.loading);
  const txError = useTransactionsStore((s) => s.error);
  const symbolTargets = useMemo(() => symbolTargetsFromTransactions(transactions), [transactions]);
  // Called for its side effect: it enriches symbol metadata (names used by AssetDetail).
  // The table shows symbols only, so the returned map is not needed here.
  useSymbols(symbolTargets);
  const rates = useExchangeRatesStore((s) => s.rates);
  const displayCcy = usePreferencesStore((s) => s.preferredDisplayCurrency);
  const changeDisplayCurrency = usePreferencesStore((s) => s.changeDisplayCurrency);
  const [mode, setMode] = useState<GroupMode>('持股');
  const [tf, setTf] = useState<Timeframe>('1Y');
  const [ccyToast, setCcyToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 報價（ADR-0006 雙層 cache）：為目前持倉 on-demand 載入；pull-to-refresh 強制刷新。
  const quoteTargets = positions.map((p) => ({
    market: p.market,
    symbol: p.symbol,
    currency: p.currency,
  }));
  const quotes = useQuotes(quoteTargets);
  // Stale-quote notice (design spec D8): judged by the OLDEST quote among held targets.
  // Only iterate quoteTargets, never the whole store — quotes of fully sold symbols would
  // otherwise trigger the notice. The 60s tick only bumps local `now` so a screen left
  // open still escalates fresh -> soft -> hard; it must never be wired to loadFor (zero I/O).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  // quoteTargets is a new array every render, so key the memo on its content instead.
  const targetsKey = quoteTargets.map((t) => `${t.market}_${t.symbol}`).join(',');
  const staleNotice = useMemo(() => {
    const fetchedAt: number[] = [];
    for (const t of quoteTargets) {
      const q = quoteFor(quotes, t.market, t.symbol);
      if (q && q.fetchedAtMs > 0) fetchedAt.push(q.fetchedAtMs);
    }
    return staleNoticeFor(classifyQuoteStaleness(fetchedAt, now));
  }, [quotes, targetsKey, now]);
  // per-symbol 報價錯誤（symbol_not_found → 查無代號降級；成功即清除）。
  const quoteErrors = useQuotesStore((s) => s.errors);
  // 「每次打開」都檢查新鮮度：切回分頁 focus + App 回前景（非 force、TTL 去抖）。
  useRefreshQuotesOnFocus(quoteTargets);
  async function onRefresh() {
    setRefreshing(true);
    try {
      await useQuotesStore.getState().loadFor(quoteTargets, { force: true });
    } finally {
      setRefreshing(false);
    }
  }

  // 顯示幣別切換＝全 app 偏好控制：樂觀更新 + 持久化（失敗 store 自動還原，這裡提示）。
  async function onChangeCurrency(next: DisplayCurrency) {
    const ok = await changeDisplayCurrency(next);
    if (!ok) setCcyToast('更新失敗，已還原');
  }

  // 持倉是唯一保留標題列 ＋ 的 tab（design §1）：新增交易 → Root modal AddTransaction。
  // 通知鈴鐺已移除（visual-audit P2-14：通知未實作、死控制項不見客；owner 拍板項）。
  // a11y label「新增交易」維持原值（Maestro e2e 依此選取）。
  const headerActions = (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="新增交易"
        hitSlop={8}
        onPress={() => navigation.navigate('AddTransaction')}
      >
        <Icon name="plus" color={colors.accent} size={24} />
      </Pressable>
    </>
  );

  // Hero / bento 彙總（報價）：部分渲染——有報價（新鮮或過期）的持倉先加總，缺者標「更新中」。
  // 純函式 computeHoldingsHero（已單元測試）；今日損益僅全數新鮮時呈現，否則 null。
  // 僅當「可納入數 === 0」（或無持倉 / 匯率未就緒）才回 null → 畫面顯示「報價載入中…」。
  const hero = useMemo(
    () =>
      computeHoldingsHero(
        positions,
        (market, symbol) => quoteFor(quotes, market, symbol),
        rates,
        displayCcy,
        Date.now(),
        (market, symbol) => quoteErrorFor(quoteErrors, market, symbol),
      ),
    [positions, quotes, quoteErrors, rates, displayCcy],
  );

  // hero=null（完全無可納入報價）時：有 symbol_not_found → 顯示查無降級文案而非永遠載入中。
  const heroNotFound = useMemo(
    () =>
      hero
        ? 0
        : countQuoteNotFound(
            positions,
            (market, symbol) => quoteFor(quotes, market, symbol),
            (market, symbol) => quoteErrorFor(quoteErrors, market, symbol),
          ),
    [hero, positions, quotes, quoteErrors],
  );

  // Bento slot 4 (design spec D9): whole-portfolio XIRR, or the cumulative return while
  // the average years invested is under one year. `null` (shown as "—") until every
  // holding has a quote and historical FX is fully loaded.
  const performance = usePortfolioReturn(hero, displayCcy);
  // decimal string -> percent number only at this UI boundary (constitution #2).
  const performancePct = performance === null ? null : Number(performance.rate) * 100;

  // Holdings table (design spec D10): sort choice lives on the device (MMKV); rows are
  // sorted within each group and per-row returns reuse the trend chart's FX series.
  const [sort, onSort] = useHoldingsSort();
  const tableSections = useHoldingsTable({
    mode,
    sort,
    positions,
    transactions,
    accounts,
    quotes,
    quoteErrors,
    rates,
    displayCurrency: displayCcy,
    totalValue: hero?.valueMoney ?? null,
  });

  // 持股市值 Hero count-up：報價就緒跑真值總市值，否則 0（顯示「報價載入中…」不跑數字）。
  const totalAssets = useCountUp(hero?.value ?? 0);

  // 顯示幣別的金額格式（前綴 + 小數位）；Pnl display 取絕對值（正負由 Pnl 自行呈現）。
  const dp = displayDecimals(displayCcy);
  const fmtCcy = (n: number): string =>
    `${currencyPrefix(displayCcy)} ${Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    })}`;

  // 走勢圖真值（ADR-0010）：組合證券市值序列（不含現金）；hero.value 為今日即時點。
  const trend = useTrendSeries(tf, displayCcy, hero?.value ?? null);

  return (
    <>
      <ScreenHeader title={zhTW.holdings.overviewTitle} right={headerActions} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/*
          Holdings value hero (design spec D7): label + value only. Value is computed from live
          quotes (delayed about 15 minutes) and excludes account cash (the label says 持股市值,
          visual-audit P1-4); cost and realized P&L come from recorded transactions. These notes
          used to be an on-screen caption, removed by the owner on 2026-10-21 for a cleaner hero.
        */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>持股市值（{displayCcy}）</Text>
          {hero ? (
            <>
              <Text
                style={[
                  styles.heroValue,
                  staleNotice?.kind === 'hard' ? styles.heroValueStale : null,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {currencyPrefix(displayCcy)}{' '}
                {totalAssets.toLocaleString('en-US', {
                  minimumFractionDigits: dp,
                  maximumFractionDigits: dp,
                })}
              </Text>
              {staleNotice?.kind === 'soft' ? (
                <Text style={styles.staleSoft}>{staleNotice.text}</Text>
              ) : null}
              {staleNotice?.kind === 'hard' ? (
                <View style={styles.staleHard}>
                  <Text style={styles.staleHardText} numberOfLines={2}>
                    ⚠︎ {staleNotice.text}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="重試報價"
                    hitSlop={6}
                    onPress={onRefresh}
                  >
                    <Text style={styles.heroRetry}>重試</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : heroNotFound > 0 ? (
            // 永久錯誤降級：全部持倉皆無可用報價且含查無代號者——顯示引導而非無限載入。
            <Text style={styles.heroNotFound} numberOfLines={2}>
              {heroNotFound} 檔查無報價代號{'\n'}請檢查交易的市場/代號設定
            </Text>
          ) : (
            <Text style={styles.heroValue} numberOfLines={1}>
              報價載入中…
            </Text>
          )}
          {/* Degraded disclosure: quotes still updating / symbols not found, with retry. Stale
              values are covered by the two-level notice above (D8), not repeated here. */}
          {hero && (hero.pendingCount > 0 || hero.notFoundCount > 0) ? (
            <View style={styles.heroStaleRow}>
              <Text style={styles.heroStaleText} numberOfLines={1}>
                {[
                  hero.pendingCount > 0 ? `${hero.pendingCount} 檔報價更新中` : null,
                  hero.notFoundCount > 0 ? `${hero.notFoundCount} 檔查無代號` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重試報價"
                hitSlop={6}
                onPress={onRefresh}
              >
                <Text style={styles.heroRetry}>重試</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* 2×2 摘要 Bento */}
        <View style={styles.bento}>
          <Card glow padding={spacing.cardInner} style={styles.bentoCell}>
            <Text style={styles.bentoLabel}>總報酬率</Text>
            <View style={styles.bentoVal}>
              {hero ? (
                <Pnl
                  value={hero.returnPct}
                  display={formatPercent(hero.returnPct, { signed: false })}
                  signMode="plusminus"
                  size={21}
                  weight="extrabold"
                />
              ) : (
                <Text style={styles.bentoPending}>—</Text>
              )}
            </View>
          </Card>
          <Card padding={spacing.cardInner} style={styles.bentoCell}>
            <Text style={styles.bentoLabel}>總未實現損益</Text>
            <View style={styles.bentoVal}>
              {hero ? (
                <Pnl value={hero.unrealized} display={fmtCcy(hero.unrealized)} size={18} fit />
              ) : (
                <Text style={styles.bentoPending}>—</Text>
              )}
            </View>
          </Card>
          <Card padding={spacing.cardInner} style={styles.bentoCell}>
            <Text style={styles.bentoLabel}>今日損益</Text>
            <View style={styles.bentoVal}>
              {hero && hero.today !== null ? (
                <Pnl value={hero.today} display={fmtCcy(hero.today)} size={16} />
              ) : (
                <Text style={styles.bentoPending}>—</Text>
              )}
            </View>
            {hero && hero.today !== null && hero.todayPct !== null ? (
              <View style={styles.bentoSub}>
                <Pnl
                  value={hero.todayPct}
                  display={formatPercent(hero.todayPct, { signed: false })}
                  signMode="plusminus"
                  size={12}
                />
              </View>
            ) : null}
          </Card>
          <Card padding={spacing.cardInner} style={styles.bentoCell}>
            <Text style={styles.bentoLabel}>
              {performance?.kind === 'cumulative' ? '累積報酬率' : '年化報酬率'}
            </Text>
            <View style={styles.bentoVal}>
              {performancePct === null ? (
                <Text style={styles.bentoPending}>—</Text>
              ) : (
                <Pnl
                  value={performancePct}
                  display={formatPercent(performancePct, { signed: false })}
                  signMode="plusminus"
                  size={18}
                  fit
                />
              )}
            </View>
            {performance?.kind === 'cumulative' ? (
              <View style={styles.bentoSub}>
                <Text style={styles.bentoSubNote}>投入未滿一年，暫不年化</Text>
              </View>
            ) : null}
          </Card>
        </View>

        {/* 顯示幣別切換（全 app 偏好控制；置於走勢圖之上）*/}
        <View style={styles.ccyRow}>
          <Text style={styles.ccyLabel}>顯示幣別</Text>
          <Segmented options={CCY_OPTIONS} value={displayCcy} onChange={onChangeCurrency} />
        </View>

        {/* 走勢圖卡（真值：證券市值，不含現金；載入/空態不畫假線） */}
        <Card style={styles.trendCard} padding={spacing.lg - 2}>
          <View style={styles.trendHead}>
            <Text style={styles.trendTitle}>資產走勢</Text>
            <Text style={styles.trendTf}>{tf}</Text>
          </View>
          <View style={styles.trendChart}>
            {trend.state === 'ready' ? (
              <Chart
                data={trend.series}
                height={108}
                yTickFormat={(v) => formatAxisTick(v, displayCcy)}
                xLabels={
                  trend.startDate !== undefined && trend.endDate !== undefined
                    ? [formatDisplayDate(trend.startDate), formatDisplayDate(trend.endDate)]
                    : null
                }
              />
            ) : (
              <View style={styles.trendPlaceholder}>
                <Text style={styles.trendPlaceholderText}>
                  {trend.state === 'loading' ? '歷史資料回補中…' : '暫無走勢資料'}
                </Text>
              </View>
            )}
          </View>
          <TimeTabs items={TIMEFRAMES} value={tf} onChange={setTf} />
        </Card>

        {/* 分組切換 */}
        <View style={styles.segmentedWrap}>
          <Segmented options={GROUP_OPTIONS} value={mode} onChange={setMode} />
        </View>

        {/* 清單（cold start：error → loading → empty → content） */}
        {transactions.length === 0 && txError ? (
          <ErrorState message="載入失敗" subtitle="請下拉重新整理" />
        ) : transactions.length === 0 && txLoading ? (
          <LoadingView label="載入持倉中…" />
        ) : positions.length === 0 ? (
          <EmptyState
            title="尚無持倉"
            subtitle="先到「交易」分頁記錄一筆買入"
            icon={<Icon name="txn" size={26} color={colors.accent} />}
          />
        ) : (
          <HoldingsTable
            sections={tableSections}
            sort={sort}
            onSort={onSort}
            onPressRow={(row) =>
              navigation.navigate('AssetDetail', { market: row.market, symbol: row.symbol })
            }
          />
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      <Toast
        visible={ccyToast !== null}
        message={ccyToast ?? ''}
        onHide={() => setCcyToast(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.page, paddingBottom: spacing.xl },

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
  // Hard stale level dims the value so it reads as unreliable at a glance (D8).
  heroValueStale: { opacity: 0.55 },
  staleSoft: {
    fontFamily: fontFamily.text.regular,
    fontSize: 11.5,
    color: colors.textWeak,
    marginTop: 4,
  },
  staleHard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    // 12% fill / 35% border of colors.warning (#F5A623).
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderColor: 'rgba(245,166,35,0.35)',
  },
  staleHardText: {
    flex: 1,
    fontFamily: fontFamily.text.medium,
    fontSize: 12.5,
    color: colors.warning,
  },
  heroStaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  heroStaleText: { fontFamily: fontFamily.text.regular, fontSize: 11, color: colors.textSecondary },
  heroNotFound: {
    fontFamily: fontFamily.text.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  heroRetry: { fontFamily: fontFamily.text.bold, fontSize: 11, color: colors.accent },

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
  bentoSubNote: { fontFamily: fontFamily.text.regular, fontSize: 11, color: colors.textFaint },
  bentoPending: {
    fontFamily: fontFamily.num.semibold,
    fontSize: 18,
    color: colors.textFaint,
    ...numericStyle,
  },

  // 顯示幣別切換（走勢圖之上）
  ccyRow: { marginTop: spacing.lg, gap: spacing.sm },
  ccyLabel: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },

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
  trendPlaceholder: { height: 108, alignItems: 'center', justifyContent: 'center' },
  trendPlaceholderText: {
    fontFamily: fontFamily.text.regular,
    fontSize: 12,
    color: colors.textFaint,
  },

  segmentedWrap: { marginTop: spacing.lg },

  bottomSpacer: { height: spacing.lg },
});
