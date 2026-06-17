import { useEffect } from 'react';
import { create } from 'zustand';
import { doc, getDoc } from '@react-native-firebase/firestore';
import {
  symbolDisplayName,
  type AssetType,
  type Currency,
  type Market,
  type TransactionDocument,
} from '@assetanchor/shared';
import { db, functionsBaseUrl } from '../firebase';

/**
 * Symbol metadata 顯示層 cache（Sprint 6）。in-memory（本 store）+ Firestore `symbols/{symbolId}`
 * （共用、後端 fetchSymbolMeta 寫）。缺名稱時以 HTTP 觸發 Cloud Function enrich（onRequest），
 * 寫入 `symbols/{symbolId}` 後回讀。名稱缺值由 `symbolDisplayName` fallback raw ticker。
 * design D3：symbols 的寫入者為後端，client 僅讀 + 觸發。
 */
export interface SymbolMetaEntry {
  /** 英文 / 主要名稱（缺則 ''）。 */
  name: string;
  /** 中文名（缺則 ''）。 */
  nameZh: string;
}

export interface SymbolTarget {
  market: Market;
  symbol: string;
  assetType: AssetType;
  currency: Currency;
}

function keyOf(market: Market, symbol: string): string {
  return `${market}_${symbol}`;
}

/** 本 session 已觸發過 enrich 的 symbolId（去抖，避免重複轟炸後端）。 */
const enrichRequested = new Set<string>();

async function readSymbolDoc(symbolId: string): Promise<SymbolMetaEntry | null> {
  try {
    const snap = await getDoc(doc(db, 'symbols', symbolId));
    if (!snap.exists()) return null;
    const data = snap.data() as { name?: string; name_zh?: string };
    return { name: data.name ?? '', nameZh: data.name_zh ?? '' };
  } catch {
    return null;
  }
}

async function triggerEnrich(t: SymbolTarget): Promise<void> {
  try {
    const url =
      `${functionsBaseUrl}/fetchSymbolMeta?market=${t.market}` +
      `&symbol=${encodeURIComponent(t.symbol)}&assetType=${t.assetType}&currency=${t.currency}`;
    await fetch(url);
  } catch {
    // fail-soft：enrich 失敗則維持 raw ticker 顯示
  }
}

interface SymbolsState {
  symbols: Record<string, SymbolMetaEntry>;
  /** 為一組標的載入名稱：in-memory 有名稱→略過；Firestore 有名稱→用；否則觸發 enrich 後回讀。 */
  loadFor: (targets: SymbolTarget[]) => Promise<void>;
}

export const useSymbolsStore = create<SymbolsState>((set, get) => ({
  symbols: {},
  loadFor: async (targets) => {
    const resolved = await Promise.all(
      targets.map(async (t): Promise<readonly [string, SymbolMetaEntry] | null> => {
        const id = keyOf(t.market, t.symbol);
        const inMem = get().symbols[id];
        if (inMem && inMem.name) return null; // 已有名稱
        let entry = await readSymbolDoc(id);
        if ((!entry || !entry.name) && !enrichRequested.has(id)) {
          enrichRequested.add(id);
          await triggerEnrich(t);
          entry = await readSymbolDoc(id);
        }
        return entry ? ([id, entry] as const) : null;
      }),
    );
    const updates: Record<string, SymbolMetaEntry> = {};
    for (const r of resolved) if (r) updates[r[0]] = r[1];
    if (Object.keys(updates).length > 0) {
      set((s) => ({ symbols: { ...s.symbols, ...updates } }));
    }
  },
}));

/** 由交易清單推導去重的 symbol 標的（含 asset_type / currency，供 enrich）。 */
export function symbolTargetsFromTransactions(txs: TransactionDocument[]): SymbolTarget[] {
  const map = new Map<string, SymbolTarget>();
  for (const t of txs) {
    const id = keyOf(t.market, t.symbol);
    if (!map.has(id)) {
      map.set(id, {
        market: t.market,
        symbol: t.symbol,
        assetType: t.asset_type,
        currency: t.currency,
      });
    }
  }
  return [...map.values()];
}

/** 顯示名稱（繁中優先 name_zh、退 name、再退 raw symbol）。 */
export function symbolNameOf(
  symbols: Record<string, SymbolMetaEntry>,
  market: Market,
  symbol: string,
): string {
  const e = symbols[keyOf(market, symbol)];
  return symbolDisplayName(e ? { name: e.name, name_zh: e.nameZh } : undefined, symbol);
}

/** 英文 / 主要名稱（缺則 raw symbol）；用於副標。 */
export function symbolEnglishOf(
  symbols: Record<string, SymbolMetaEntry>,
  market: Market,
  symbol: string,
): string {
  const e = symbols[keyOf(market, symbol)];
  return e?.name?.trim() ? e.name : symbol;
}

/** 觸發單一標的 enrich（新增交易後呼叫；fire-and-forget）。 */
export async function ensureSymbol(target: SymbolTarget): Promise<void> {
  await useSymbolsStore.getState().loadFor([target]);
}

/**
 * Hook：為一組標的自動載入 + enrich 名稱並回傳目前 symbols map（targets 變動時重載）。
 */
export function useSymbols(targets: SymbolTarget[]): Record<string, SymbolMetaEntry> {
  const symbols = useSymbolsStore((s) => s.symbols);
  const loadFor = useSymbolsStore((s) => s.loadFor);
  const depKey = targets.map((t) => keyOf(t.market, t.symbol)).join(',');
  useEffect(() => {
    if (targets.length > 0) void loadFor(targets);
  }, [depKey, loadFor]);
  return symbols;
}

/** Hook：唯讀訂閱 symbols map（不觸發載入；給已由他處 enrich 的畫面用）。 */
export function useSymbolMap(): Record<string, SymbolMetaEntry> {
  return useSymbolsStore((s) => s.symbols);
}
