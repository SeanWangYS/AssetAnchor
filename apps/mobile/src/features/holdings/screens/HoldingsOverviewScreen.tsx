import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DISPLAY_CURRENCIES,
  Money,
  deriveHoldingsByAccount,
  type AccountRef,
  type DisplayCurrency,
  type Market,
  type Position,
  type RateMap,
  type TransactionDocument,
} from '@assetanchor/shared';
import type { HoldingsStackScreenProps } from '../../../core/navigation/types';
import {
  Avatar,
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
import { useHoldings, useRealizedEvents } from '../useHoldings';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import { usePreferencesStore } from '../../../services/preferences';
import {
  quoteErrorFor,
  quoteFor,
  useQuotes,
  useQuotesStore,
  useRefreshQuotesOnFocus,
  type QuoteEntry,
} from '../../../services/quotes';
import { quoteMoneyIn } from '../../../services/valuation';
import { useSymbols, symbolNameOf, symbolTargetsFromTransactions } from '../../../services/symbols';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import { useCountUp } from '../useCountUp';
import { useTrendSeries } from '../useTrendSeries';
import {
  avatarColor,
  currencyPrefix,
  displayDecimals,
  fmtAmount,
  fmtMoney,
  fmtShares,
  marketLabel,
  toDisplay,
} from '../holdingsDemo';
import { computeHoldingsHero, countQuoteNotFound, realizedInMonth } from '../holdingsHero';
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

interface GroupSection {
  key: string;
  label: string;
  count: number;
  /** 右側原幣別市值小計字（demo）。 */
  subtotal: string;
  positions: Position[];
}

/** 該組原幣別市值小計（混幣別時各幣別分列）；以真實報價計，缺報價者排除並標「N 檔更新中」。 */
function subtotalText(
  positions: Position[],
  quotes: Record<string, QuoteEntry>,
  rates: RateMap | null,
): string {
  const byCcy = new Map<Position['currency'], Money>();
  let pending = 0;
  for (const p of positions) {
    const q = quoteFor(quotes, p.market, p.symbol);
    if (!q) {
      pending += 1;
      continue;
    }
    // 報價幣別由市場決定（D9）：先換算到 lot 幣別再乘股數；無法換算＝更新中。
    const priceP = quoteMoneyIn(q.price, q, p.currency, rates);
    if (!priceP) {
      pending += 1;
      continue;
    }
    const mv = priceP.multiply(p.quantity);
    byCcy.set(p.currency, (byCcy.get(p.currency) ?? Money.zero(p.currency)).add(mv));
  }
  const parts = [...byCcy.entries()].map(([ccy, sum]) => fmtMoney(sum, ccy));
  if (pending > 0) parts.push(`${pending} 檔更新中`);
  return parts.join(' · ');
}

function buildSections(
  positions: Position[],
  mode: GroupMode,
  quotes: Record<string, QuoteEntry>,
  transactions: TransactionDocument[],
  accounts: AccountRef[],
  rates: RateMap | null,
): GroupSection[] {
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
    // 依**真實 account_id** 分群（per-account 推導），取代已移除的 symbol→帳戶 demo 表。
    // orphan account_id 歸「未分類」；某帳戶內髒資料 symbol 被 fail-soft 跳過並在小計標「N 檔資料異常」。
    return deriveHoldingsByAccount(transactions, accounts).map((g) => ({
      key: g.accountId || '__unassigned__',
      label: g.accountName,
      count: g.positions.length,
      subtotal: [
        subtotalText(g.positions, quotes, rates),
        g.skipped.length > 0 ? `${g.skipped.length} 檔資料異常` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      positions: g.positions,
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
      subtotal: subtotalText(list, quotes, rates),
      positions: list,
    };
  });
}

/** 三段式持股 row：圓標 + 名稱/代號 + (股數·均價) + 市值/報酬%（design §3.1 item 7）。 */
function HoldingRow({
  position,
  name,
  dense,
  quote,
  rates,
  notFound,
  onPress,
}: {
  position: Position;
  name: string;
  dense: boolean;
  quote: QuoteEntry | undefined;
  rates: RateMap | null;
  /** 查無報價代號（symbol_not_found）：顯示明確標示而非「更新中…」。 */
  notFound?: boolean;
  onPress: () => void;
}) {
  const avg = Money.fromDecimalString(position.averageCost, position.currency);
  // 報價就緒→真值市值/報酬%；未就緒→「更新中…」（與 Hero/AssetDetail 一致，不顯示 demo 假值）。
  const priceM = quote ? quoteMoneyIn(quote.price, quote, position.currency, rates) : null;
  const mv = priceM ? priceM.multiply(position.quantity) : null;
  const retPct =
    priceM && !avg.isZero()
      ? priceM.subtract(avg).divide(position.averageCost).multiply('100').toNumber()
      : null;

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
            {name}
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
        {mv !== null ? (
          <>
            <Text style={styles.rowValue}>{fmtMoney(mv, position.currency)}</Text>
            {retPct !== null ? (
              <Pnl value={retPct} display={`${Math.abs(retPct).toFixed(2)}%`} size={12} />
            ) : (
              <Text style={styles.rowPending}>—</Text>
            )}
          </>
        ) : notFound ? (
          // 永久錯誤出口：代號在該市場查無報價（多為市場選錯），引導修正而非無限等待。
          <Text style={styles.rowNotFound}>查無代號</Text>
        ) : (
          <Text style={styles.rowPending}>更新中…</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function HoldingsOverviewScreen({
  navigation,
}: HoldingsStackScreenProps<'HoldingsOverview'>) {
  const positions = useHoldings();
  const realizedEvents = useRealizedEvents();
  // Symbol 名稱真值（Sprint 6）：以交易清單（含 asset_type）為來源 enrich + 顯示。
  const transactions = useTransactionsStore((s) => s.transactions);
  const accounts = useAccountsStore((s) => s.accounts);
  const txLoading = useTransactionsStore((s) => s.loading);
  const txError = useTransactionsStore((s) => s.error);
  const symbolTargets = useMemo(() => symbolTargetsFromTransactions(transactions), [transactions]);
  const symbols = useSymbols(symbolTargets);
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
  // 同時放通知圓鈕（design §3.1 item 2）。自繪 ScreenHeader（unify-screen-headers），
  // a11y label「通知」「新增交易」維持原值（Maestro e2e 依此選取）。
  const headerActions = (
    <>
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
    </>
  );

  const sections = useMemo(
    () => buildSections(positions, mode, quotes, transactions, accounts, rates),
    [positions, mode, quotes, transactions, accounts, rates],
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

  // 「本月已實現損益」真值（§4）：當月 SELL 已實現，各原幣別換算成顯示幣別後加總（純函式）。
  // count === 0 ⇒ 本月無賣出 → bento 顯示中性空狀態（不以綠色 ▲ NT$ 0 誤導為上漲）。
  const realized = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return realizedInMonth(realizedEvents, monthPrefix, rates, displayCcy);
  }, [realizedEvents, rates, displayCcy]);

  // 總資產 Hero count-up：報價就緒跑真值總市值，否則 0（顯示「報價載入中…」不跑數字）。
  const totalAssets = useCountUp(hero?.value ?? 0);

  // 真實跨幣別「總成本」：以使用者顯示幣別偏好為基準，rates（或 demo 匯率退回）即時換算加總。
  // 部分渲染：單檔無法換算則跳過（不因一檔回 null 而整體不顯示）；rates 未就緒才回 null。
  const grandCost = useMemo(() => {
    if (rates === null) return null;
    let sum = Money.zero(displayCcy);
    for (const p of positions) {
      const conv = toDisplay(Money.fromDecimalString(p.totalCost, p.currency), rates, displayCcy);
      if (conv === null) continue;
      sum = sum.add(conv);
    }
    return sum;
  }, [positions, rates, displayCcy]);

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
        {/* 總資產 Hero（報價真值；未就緒顯示載入中） */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>總資產（{displayCcy}）</Text>
          {hero ? (
            <>
              <Text style={styles.heroValue} numberOfLines={1}>
                {currencyPrefix(displayCcy)}{' '}
                {totalAssets.toLocaleString('en-US', {
                  minimumFractionDigits: dp,
                  maximumFractionDigits: dp,
                })}
              </Text>
              <View style={styles.heroChange}>
                <Pnl value={hero.unrealized} display={fmtCcy(hero.unrealized)} size={14} />
                <Pnl
                  value={hero.returnPct}
                  display={`${Math.abs(hero.returnPct).toFixed(2)}%`}
                  signMode="plusminus"
                  size={13}
                />
                <Text style={styles.heroPeriod}>全期</Text>
              </View>
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
          {/* 降級揭露：部分缺報價（更新中）/ 查無代號 / 含過期值（顯示最後已知）+ 重試。 */}
          {hero && (hero.pendingCount > 0 || hero.notFoundCount > 0 || hero.anyStale) ? (
            <View style={styles.heroStaleRow}>
              <Text style={styles.heroStaleText} numberOfLines={1}>
                {[
                  hero.pendingCount > 0 ? `${hero.pendingCount} 檔報價更新中` : null,
                  hero.notFoundCount > 0 ? `${hero.notFoundCount} 檔查無代號` : null,
                  hero.anyStale ? '部分為最後已知報價（延遲）' : null,
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
          <Text style={styles.demoNote}>
            市值/今日為報價即時計算（延遲 15 分鐘）；成本與已實現來自實際交易
          </Text>
        </View>

        {/* 2×2 摘要 Bento */}
        <View style={styles.bento}>
          <Card glow padding={spacing.cardInner} style={styles.bentoCell}>
            <Text style={styles.bentoLabel}>總報酬率</Text>
            <View style={styles.bentoVal}>
              {hero ? (
                <Pnl
                  value={hero.returnPct}
                  display={`${Math.abs(hero.returnPct).toFixed(2)}%`}
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
                <Pnl value={hero.unrealized} display={fmtCcy(hero.unrealized)} size={18} />
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
                  display={`${Math.abs(hero.todayPct).toFixed(2)}%`}
                  signMode="plusminus"
                  size={12}
                />
              </View>
            ) : null}
          </Card>
          <Card padding={spacing.cardInner} style={styles.bentoCell}>
            <Text style={styles.bentoLabel}>本月已實現損益</Text>
            <View style={styles.bentoVal}>
              {realized.count === 0 ? (
                // 本月無賣出：中性「—」（比照今日損益 pending），不顯示綠色 ▲ NT$ 0 誤導為上漲
                <Text style={styles.bentoPending}>—</Text>
              ) : (
                <Pnl
                  value={realized.sum.toNumber()}
                  display={fmtCcy(realized.sum.toNumber())}
                  size={18}
                />
              )}
            </View>
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
              <Chart data={trend.series} height={108} />
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

        {/* 真實「總成本」快照（以顯示幣別偏好呈現） */}
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>總成本（{displayCcy}）</Text>
          <Text style={styles.costValue}>
            {grandCost === null
              ? '匯率未就緒'
              : `${currencyPrefix(displayCcy)} ${fmtAmount(grandCost, displayCcy)}`}
          </Text>
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
                  key={`${p.market}_${p.symbol}_${p.currency}`}
                  position={p}
                  name={symbolNameOf(symbols, p.market, p.symbol)}
                  dense={mode !== '持股'}
                  quote={quoteFor(quotes, p.market, p.symbol)}
                  rates={rates}
                  notFound={quoteErrorFor(quoteErrors, p.market, p.symbol) === 'symbol_not_found'}
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
  heroChange: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
  heroPeriod: { fontFamily: fontFamily.text.regular, fontSize: 12, color: colors.textWeak },
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
  rowPending: { fontFamily: fontFamily.text.regular, fontSize: 13, color: colors.textFaint },
  rowNotFound: { fontFamily: fontFamily.text.regular, fontSize: 13, color: colors.danger },

  bottomSpacer: { height: spacing.lg },
});
