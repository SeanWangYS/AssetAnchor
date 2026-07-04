import { useEffect, useMemo } from 'react';
import {
  Money,
  buildPortfolioSeries,
  buildSymbolSeries,
  mergeChunkCloses,
  timeframeStart,
  type Currency,
  type DailyTimeframe,
  type HistoryChunk,
  type Market,
  type TransactionDocument,
} from '@assetanchor/shared';
import { historyKeyOf, useHistoryStore, type HistoryTarget } from '../../services/history';
import { useTransactionsStore } from '../transactions/transactionsStore';

/**
 * 走勢圖真值 hooks（add-real-trend-series）。資料流：transactionsStore（既有 onSnapshot）
 * × historyStore（price_history 雙層 cache）→ shared 純函式重建序列 →
 * `toNumber()` 只在此邊界把 Money 轉 number[] 餵 Chart（ADR-0005 逃生門）。
 * 跨 feature 讀 transactionsStore 為 codebase 既有慣例（同 useHoldings design D3）。
 */

export type TrendState = 'loading' | 'ready' | 'empty';

export interface TrendSeries {
  series: number[];
  state: TrendState;
}

/** AssetDetail 走勢 timeframe（1D/1W 盤中粒度）。 */
export type AssetTimeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

/** 裝置時區的今天（en-CA locale 即 YYYY-MM-DD）。 */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date());
}

/**
 * 交易流 → 歷史序列目標：每個 (market, symbol) 的 lazy backfill 起點＝該 symbol
 * 最早交易日（含已全數賣出者——歷史市值仍需其價格）；另附 FX pseudo-symbol
 * （起點＝全域最早交易日，跨幣別換算歷史市值用）。
 */
function historyTargetsFrom(transactions: readonly TransactionDocument[]): {
  targets: HistoryTarget[];
  earliest: string | null;
} {
  const bySymbol = new Map<string, HistoryTarget>();
  let earliest: string | null = null;
  for (const t of transactions) {
    if (t.transaction_type !== 'BUY' && t.transaction_type !== 'SELL') continue;
    const id = historyKeyOf(t.market, t.symbol);
    const existing = bySymbol.get(id);
    if (existing === undefined || t.transaction_date < existing.from) {
      bySymbol.set(id, {
        market: t.market,
        symbol: t.symbol,
        currency: t.currency,
        from: t.transaction_date,
      });
    }
    if (earliest === null || t.transaction_date < earliest) earliest = t.transaction_date;
  }
  const targets = [...bySymbol.values()];
  if (targets.length > 0 && earliest !== null) {
    targets.push({ market: 'FX', symbol: 'USDTWD', currency: 'TWD', from: earliest });
  }
  return { targets, earliest };
}

/** 自 store 收集某 symbolId 的年度分塊並合併為 date→close map。 */
function closesOf(
  chunks: Record<string, { year: number; closes: Record<string, string> }>,
  symbolId: string,
): Record<string, string> {
  const list: HistoryChunk[] = [];
  const prefix = `${symbolId}_`;
  for (const [key, chunk] of Object.entries(chunks)) {
    if (key.startsWith(prefix)) list.push(chunk);
  }
  return mergeChunkCloses(list);
}

/**
 * 持倉總覽「資產走勢」：組合證券市值序列（顯示幣別；不含現金，ADR-0010 Non-goals）。
 * `todayValue`＝畫面已算好的即時總市值（hero.value，fresh 報價時），append 為今日點。
 */
export function useTrendSeries(
  tf: DailyTimeframe,
  displayCurrency: Currency,
  todayValue: number | null,
): TrendSeries {
  const transactions = useTransactionsStore((s) => s.transactions);
  const chunks = useHistoryStore((s) => s.chunks);
  const backfilling = useHistoryStore((s) => s.backfilling);
  const loadFor = useHistoryStore((s) => s.loadFor);

  const { targets, earliest } = useMemo(() => historyTargetsFrom(transactions), [transactions]);
  const depKey = targets.map((t) => `${historyKeyOf(t.market, t.symbol)}:${t.from}`).join(',');
  // depKey 涵蓋 targets 內容；loadFor 為 zustand 穩定參考（同 useQuotes 慣例）。
  useEffect(() => {
    if (targets.length > 0) void loadFor(targets);
  }, [depKey, loadFor]);

  return useMemo(() => {
    if (targets.length === 0) return { series: [], state: 'empty' as const };
    const today = localToday();
    const from = timeframeStart(tf, today, earliest);

    const closesBySymbol: Record<string, Record<string, string>> = {};
    for (const t of targets) {
      if (t.market === 'FX') continue;
      const id = historyKeyOf(t.market, t.symbol);
      const merged = closesOf(chunks, id);
      if (Object.keys(merged).length > 0) closesBySymbol[id] = merged;
    }
    // Mobile 消費邊界 fail-soft（同 useHoldings，ADR-0007）：壞資料（如同 key 混幣別的
    // 交易——onSnapshot 部分更新的暫態也會出現）讓走勢圖降級為空，不可白屏整頁。
    let points: ReturnType<typeof buildPortfolioSeries>;
    try {
      points = buildPortfolioSeries({
        transactions,
        closesBySymbol,
        fxUsdTwdCloses: closesOf(chunks, 'FX_USDTWD'),
        displayCurrency,
        from,
        to: today,
      });
    } catch (err) {
      console.warn(
        '[trend] buildPortfolioSeries 重建失敗，走勢圖降級為空：',
        err instanceof Error ? err.message : err,
      );
      return { series: [], state: 'empty' as const };
    }

    const series = points.map((p) => p.value.toNumber());
    const lastDate = points[points.length - 1]?.date;
    if (todayValue !== null && lastDate !== undefined && lastDate < today) {
      series.push(todayValue);
    }
    if (series.length >= 2) return { series, state: 'ready' as const };
    const anyBackfilling = targets.some(
      (t) => backfilling[historyKeyOf(t.market, t.symbol)] === true,
    );
    return { series, state: anyBackfilling ? ('loading' as const) : ('empty' as const) };
  }, [targets, earliest, chunks, backfilling, transactions, tf, displayCurrency, todayValue]);
}

/**
 * AssetDetail 個股走勢（原幣別價格序列）：日線 tabs 讀 price_history、
 * `ALL`＝自該 symbol 最早交易日（持有期）；`1D`/`1W` 走 fetchIntraday（記憶體 cache）。
 * `livePrice`＝現價（fresh 報價時），日線 tabs append 為今日點。
 */
export function useSymbolTrendSeries(
  market: Market,
  symbol: string,
  currency: Currency,
  tf: AssetTimeframe,
  livePrice: number | null,
): TrendSeries {
  const transactions = useTransactionsStore((s) => s.transactions);
  const chunks = useHistoryStore((s) => s.chunks);
  const backfilling = useHistoryStore((s) => s.backfilling);
  const intradayMap = useHistoryStore((s) => s.intraday);
  const loadFor = useHistoryStore((s) => s.loadFor);
  const loadIntraday = useHistoryStore((s) => s.loadIntraday);

  const symbolId = historyKeyOf(market, symbol);
  const isIntraday = tf === '1D' || tf === '1W';

  const from = useMemo(() => {
    let min: string | null = null;
    for (const t of transactions) {
      if (t.market !== market || t.symbol !== symbol) continue;
      if (t.transaction_type !== 'BUY' && t.transaction_type !== 'SELL') continue;
      if (min === null || t.transaction_date < min) min = t.transaction_date;
    }
    return min;
  }, [transactions, market, symbol]);

  useEffect(() => {
    if (isIntraday) {
      void loadIntraday({ market, symbol, currency }, tf as '1D' | '1W');
    } else if (from !== null) {
      void loadFor([{ market, symbol, currency, from }]);
    }
  }, [isIntraday, tf, market, symbol, currency, from, loadFor, loadIntraday]);

  return useMemo(() => {
    if (isIntraday) {
      const entry = intradayMap[`${symbolId}_${tf}`];
      if (entry === undefined) return { series: [], state: 'loading' as const };
      const series = entry.points.map((p) => new Money(p.close, currency).toNumber());
      return { series, state: series.length >= 2 ? ('ready' as const) : ('empty' as const) };
    }

    if (from === null) return { series: [], state: 'empty' as const };
    const today = localToday();
    // 邊界 fail-soft（同上）：壞 close 字串等資料問題降級為空，不白屏。
    let series: number[];
    try {
      const merged = closesOf(chunks, symbolId);
      const points = buildSymbolSeries([{ year: 0, closes: merged }], {
        from: timeframeStart(tf as DailyTimeframe, today, from),
        to: today,
      });
      series = points.map((p) => new Money(p.close, currency).toNumber());
      const lastDate = points[points.length - 1]?.date;
      if (livePrice !== null && lastDate !== undefined && lastDate < today) series.push(livePrice);
    } catch (err) {
      console.warn(
        '[trend] buildSymbolSeries 重建失敗，走勢圖降級為空：',
        err instanceof Error ? err.message : err,
      );
      return { series: [], state: 'empty' as const };
    }
    if (series.length >= 2) return { series, state: 'ready' as const };
    return {
      series,
      state: backfilling[symbolId] === true ? ('loading' as const) : ('empty' as const),
    };
  }, [isIntraday, intradayMap, symbolId, tf, currency, from, chunks, backfilling, livePrice]);
}
