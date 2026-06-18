import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { create } from 'zustand';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { isFresh, type Currency, type Market } from '@assetanchor/shared';
import { db, functionsBaseUrl } from '../firebase';

/**
 * 報價雙層 cache（ADR-0006）。in-memory（本 store）+ Firestore `quotes/{symbolId}`（共用、後端寫）；
 * miss/過期時以 HTTP fetch 觸發 Cloud Function `fetchQuote`（onRequest）抓取 + 寫 cache，再回填。
 * 註：ADR-0006 的本機持久層 MMKV 為原生模組（需 prebuild），本輪先用 in-memory（重啟後由 Firestore
 * cache 在 TTL 內回填，行為近似）；MMKV 為後續 native-build 增強。原幣別價格，顯示層再換算。
 */
export interface QuoteEntry {
  price: string; // Money 10 位小數 string（原幣別）
  /** 前一交易日收盤（算今日漲跌；缺值 null）。 */
  prevClose: string | null;
  currency: Currency;
  fetchedAtMs: number;
}

export interface QuoteTarget {
  market: Market;
  symbol: string;
  currency: Currency;
}

function keyOf(market: Market, symbol: string): string {
  return `${market}_${symbol}`;
}

async function readFirestoreCache(
  symbolId: string,
  currency: Currency,
): Promise<QuoteEntry | null> {
  try {
    const snap = await getDoc(doc(db, 'quotes', symbolId));
    if (!snap.exists()) return null;
    const data = snap.data() as {
      price?: string;
      prev_close?: string | null;
      fetched_at?: { toMillis?: () => number };
    };
    const fetchedAtMs = data.fetched_at?.toMillis?.() ?? 0;
    return data.price
      ? { price: data.price, prevClose: data.prev_close ?? null, currency, fetchedAtMs }
      : null;
  } catch {
    return null;
  }
}

async function triggerFetchQuote(t: QuoteTarget): Promise<QuoteEntry | null> {
  try {
    const url =
      `${functionsBaseUrl}/fetchQuote?market=${t.market}` +
      `&symbol=${encodeURIComponent(t.symbol)}&currency=${t.currency}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      ok?: boolean;
      price?: string;
      prevClose?: string | null;
      fetchedAtMs?: number;
    };
    if (!json.ok || !json.price) return null;
    return {
      price: json.price,
      prevClose: json.prevClose ?? null,
      currency: t.currency,
      fetchedAtMs: json.fetchedAtMs ?? Date.now(),
    };
  } catch {
    return null;
  }
}

interface QuotesState {
  quotes: Record<string, QuoteEntry>;
  /** 為一組持倉載入報價：in-memory 新鮮→略過；Firestore 新鮮→用；否則觸發 fetchQuote。force 略過新鮮判定（pull-to-refresh）。 */
  loadFor: (targets: QuoteTarget[], opts?: { force?: boolean }) => Promise<void>;
}

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: {},
  loadFor: async (targets, opts) => {
    const force = opts?.force ?? false;
    const now = Date.now();
    const resolved = await Promise.all(
      targets.map(async (t): Promise<readonly [string, QuoteEntry] | null> => {
        const id = keyOf(t.market, t.symbol);
        const inMem = get().quotes[id];
        // in-memory 已新鮮（且非強制刷新）→ 無事可做。
        if (!force && inMem && isFresh(inMem.fetchedAtMs, now)) return null;
        // 讀 Firestore cache（任何新鮮度都讀回，作為降級候選）。
        const cached = await readFirestoreCache(id, t.currency);
        if (!force && cached && isFresh(cached.fetchedAtMs, now)) return [id, cached] as const;
        // 過期 / 缺 / 強制刷新 → 觸發後端抓取。
        const fetched = await triggerFetchQuote(t);
        if (fetched) return [id, fetched] as const;
        // 刷新失敗（來源 / 函式不可用）→ 降級：保留「最後已知值」。
        // 以 Firestore 過期報價回填（若比 in-memory 新），讓畫面顯示 stale 值 + asOf，
        // 而非永久卡「報價載入中…」。in-memory 既有值由下方 merge 只增不刪保住。
        if (cached && (!inMem || cached.fetchedAtMs > inMem.fetchedAtMs)) {
          return [id, cached] as const;
        }
        return null;
      }),
    );
    const updates: Record<string, QuoteEntry> = {};
    for (const r of resolved) if (r) updates[r[0]] = r[1];
    if (Object.keys(updates).length > 0) {
      set((s) => ({ quotes: { ...s.quotes, ...updates } }));
    }
  },
}));

/** 取某 (market, symbol) 的報價（原幣別 price string；未就緒回 undefined）。 */
export function quoteFor(
  quotes: Record<string, QuoteEntry>,
  market: Market,
  symbol: string,
): QuoteEntry | undefined {
  return quotes[keyOf(market, symbol)];
}

/**
 * Hook：為一組持倉自動載入報價並回傳目前 quotes map。targets 變動時重載（on-demand）。
 */
export function useQuotes(targets: QuoteTarget[]): Record<string, QuoteEntry> {
  const quotes = useQuotesStore((s) => s.quotes);
  const loadFor = useQuotesStore((s) => s.loadFor);
  const depKey = targets.map((t) => keyOf(t.market, t.symbol)).join(',');
  // depKey 涵蓋 targets 內容（market_symbol 串接）；loadFor 為 zustand 穩定參考。
  // 僅依 depKey 重載（targets 每次 render 為新陣列，故不入 deps，避免每 render 重打）。
  useEffect(() => {
    if (targets.length > 0) void loadFor(targets);
  }, [depKey, loadFor]);
  return quotes;
}

/** 兩次觸發的最小間隔（ms）：去抖快速切分頁 / 前景跳動。實際外呼仍受 15min TTL 把關。 */
const FOCUS_REFRESH_THROTTLE_MS = 5_000;

/**
 * Hook：「每次打開都檢查新鮮度」——畫面 focus（切回分頁）與 App 自背景回前景（AppState 'active'）
 * 時觸發 `loadFor`（非 force，靠 15min TTL + 共用 cache 去抖；過期才真的打 fetchQuote）。
 * 與 `useQuotes` 互補：useQuotes 管 targets 變動 / 訂閱 map，本 hook 管「打開」這個時機。
 */
export function useRefreshQuotesOnFocus(targets: QuoteTarget[]): void {
  const loadFor = useQuotesStore((s) => s.loadFor);
  const depKey = targets.map((t) => keyOf(t.market, t.symbol)).join(',');
  // targets 每次 render 為新陣列；用 ref 取最新值，hook deps 只放 depKey（穩定）。
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const lastRunRef = useRef(0);

  const refresh = useCallback(() => {
    const list = targetsRef.current;
    if (list.length === 0) return;
    const now = Date.now();
    if (now - lastRunRef.current < FOCUS_REFRESH_THROTTLE_MS) return;
    lastRunRef.current = now;
    void loadFor(list);
    // depKey 代表 targets 內容（market_symbol 串接）；targets 由 ref 取最新值。
  }, [depKey, loadFor]);

  // 畫面 focus（含首次 mount 與切回分頁）。
  useFocusEffect(refresh);

  // App 自背景回前景。
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);
}
