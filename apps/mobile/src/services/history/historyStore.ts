import { create } from 'zustand';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { isFresh, priceHistoryDocumentSchema } from '@assetanchor/shared';
import { db, functionsBaseUrl } from '../firebase';
import {
  buildEnsureHistoryUrl,
  buildFetchIntradayUrl,
  historyKeyOf,
  parseEnsureHistoryResponse,
  parseIntradayResponse,
  yearsFor,
  type HistoryTarget,
} from './historyClient';

/**
 * 歷史日線雙層 cache（ADR-0010 D7）：in-memory（本 store）+ Firestore
 * `price_history/{symbolId}_{year}`（共用、後端寫）。stale-while-revalidate：
 * 先讀 Firestore 立即可畫，背景打 `ensureHistory` lazy 增量，lastDate 有前進才重讀。
 * 盤中（1D/1W）為記憶體 cache（TTL 15min，同報價慣例），不落地。
 */

/** 年度分塊（`${symbolId}_${year}`）的 in-memory 形狀；對齊 shared HistoryChunk。 */
export interface StoredChunk {
  year: number;
  closes: Record<string, string>;
}

interface IntradayEntry {
  points: { ts: number; close: string }[];
  fetchedAtMs: number;
}

/** ensureHistory 的 session 節流（對齊報價 15min TTL 心智模型）。 */
const ENSURE_TTL_MS = 15 * 60 * 1000;

async function readChunk(symbolId: string, year: number): Promise<StoredChunk | null> {
  try {
    const snap = await getDoc(doc(db, 'price_history', `${symbolId}_${year}`));
    if (!snap.exists()) return null;
    const parsed = priceHistoryDocumentSchema.safeParse(snap.data());
    if (!parsed.success) return null; // 邊界 fail-soft：格式不符視同無資料
    return { year: parsed.data.year, closes: parsed.data.closes };
  } catch {
    return null;
  }
}

interface HistoryState {
  /** `${symbolId}_${year}` → 年度分塊。 */
  chunks: Record<string, StoredChunk>;
  /** symbolId → 已落地最後日期（增量比對用）。 */
  lastDates: Record<string, string>;
  /** symbolId → 該 symbol 完全無資料且首次回補進行中（走勢圖載入態）。 */
  backfilling: Record<string, boolean>;
  /** `${symbolId}_${tf}` → 盤中點列（記憶體 cache）。 */
  intraday: Record<string, IntradayEntry>;
  /** symbolId → 上次 ensureHistory 時刻（session 節流）。 */
  ensuredAtMs: Record<string, number>;
  loadFor: (targets: HistoryTarget[]) => Promise<void>;
  loadIntraday: (
    target: {
      market: HistoryTarget['market'];
      symbol: string;
      currency: HistoryTarget['currency'];
    },
    tf: '1D' | '1W',
  ) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  chunks: {},
  lastDates: {},
  backfilling: {},
  intraday: {},
  ensuredAtMs: {},

  loadFor: async (targets) => {
    if (targets.length === 0) return;
    const nowMs = Date.now();
    const todayYear = new Date().getFullYear();

    // Phase 1：讀 Firestore 補足 in-memory 缺的年度分塊（先畫再刷新）。
    const missing: { symbolId: string; year: number }[] = [];
    for (const t of targets) {
      const symbolId = historyKeyOf(t.market, t.symbol);
      for (const year of yearsFor(t.from, todayYear)) {
        if (get().chunks[`${symbolId}_${year}`] === undefined) missing.push({ symbolId, year });
      }
    }
    if (missing.length > 0) {
      const reads = await Promise.all(
        missing.map(async (m) => ({ ...m, chunk: await readChunk(m.symbolId, m.year) })),
      );
      const chunkUpdates: Record<string, StoredChunk> = {};
      const lastDateUpdates: Record<string, string> = {};
      for (const r of reads) {
        if (r.chunk === null) continue;
        chunkUpdates[`${r.symbolId}_${r.year}`] = r.chunk;
        const dates = Object.keys(r.chunk.closes);
        const max = dates.length > 0 ? dates.sort()[dates.length - 1] : undefined;
        const prev = lastDateUpdates[r.symbolId] ?? get().lastDates[r.symbolId];
        if (max !== undefined && (prev === undefined || max > prev)) {
          lastDateUpdates[r.symbolId] = max;
        }
      }
      if (Object.keys(chunkUpdates).length > 0) {
        set((s) => ({
          chunks: { ...s.chunks, ...chunkUpdates },
          lastDates: { ...s.lastDates, ...lastDateUpdates },
        }));
      }
    }

    // Phase 2：背景 lazy 增量（session 15min 節流；server 端另有交易日 no-op 判定）。
    const toEnsure = targets.filter((t) => {
      const symbolId = historyKeyOf(t.market, t.symbol);
      return nowMs - (get().ensuredAtMs[symbolId] ?? 0) > ENSURE_TTL_MS;
    });
    if (toEnsure.length === 0) return;

    // 完全無資料的 symbol 標記首次回補中（走勢圖載入態；有舊資料者不標、先畫舊圖）。
    const backfillFlags: Record<string, boolean> = {};
    for (const t of toEnsure) {
      const symbolId = historyKeyOf(t.market, t.symbol);
      const hasAny = yearsFor(t.from, todayYear).some(
        (y) => get().chunks[`${symbolId}_${y}`] !== undefined,
      );
      if (!hasAny) backfillFlags[symbolId] = true;
    }
    set((s) => ({
      backfilling: { ...s.backfilling, ...backfillFlags },
      ensuredAtMs: {
        ...s.ensuredAtMs,
        ...Object.fromEntries(
          toEnsure.map((t) => [historyKeyOf(t.market, t.symbol), nowMs] as const),
        ),
      },
    }));

    try {
      const res = await fetch(buildEnsureHistoryUrl(functionsBaseUrl, toEnsure));
      const newLastDates = parseEnsureHistoryResponse(await res.json());

      // lastDate 有前進（或本地全缺）的 symbol → 重讀涵蓋年度，取回新資料。
      const rereads: { symbolId: string; year: number }[] = [];
      for (const t of toEnsure) {
        const symbolId = historyKeyOf(t.market, t.symbol);
        const remote = newLastDates[symbolId];
        const local = get().lastDates[symbolId];
        if (remote === undefined) continue; // 該筆增量失敗：保留舊資料（降級不清空）
        if (local !== undefined && remote <= local) continue; // 無新資料
        for (const year of yearsFor(t.from, todayYear)) {
          const key = `${symbolId}_${year}`;
          const cached = get().chunks[key];
          // 全年已載且該年不是新資料落點 → 免重讀（新資料只會出現在 local 之後的年份）
          if (cached !== undefined && local !== undefined && year < Number(local.slice(0, 4))) {
            continue;
          }
          rereads.push({ symbolId, year });
        }
      }
      if (rereads.length > 0) {
        const reads = await Promise.all(
          rereads.map(async (m) => ({ ...m, chunk: await readChunk(m.symbolId, m.year) })),
        );
        const chunkUpdates: Record<string, StoredChunk> = {};
        for (const r of reads) {
          if (r.chunk !== null) chunkUpdates[`${r.symbolId}_${r.year}`] = r.chunk;
        }
        set((s) => ({
          chunks: { ...s.chunks, ...chunkUpdates },
          lastDates: { ...s.lastDates, ...newLastDates },
        }));
      } else if (Object.keys(newLastDates).length > 0) {
        set((s) => ({ lastDates: { ...s.lastDates, ...newLastDates } }));
      }
    } catch {
      // 整批失敗：保留既有資料（stale-while-revalidate 的降級面）
    } finally {
      if (Object.keys(backfillFlags).length > 0) {
        set((s) => ({
          backfilling: {
            ...s.backfilling,
            ...Object.fromEntries(Object.keys(backfillFlags).map((k) => [k, false] as const)),
          },
        }));
      }
    }
  },

  loadIntraday: async (target, tf) => {
    const key = `${historyKeyOf(target.market, target.symbol)}_${tf}`;
    const nowMs = Date.now();
    const cached = get().intraday[key];
    if (cached && isFresh(cached.fetchedAtMs, nowMs)) return;
    try {
      const res = await fetch(buildFetchIntradayUrl(functionsBaseUrl, target, tf));
      const points = parseIntradayResponse(await res.json());
      if (points.length > 0) {
        set((s) => ({ intraday: { ...s.intraday, [key]: { points, fetchedAtMs: nowMs } } }));
      }
    } catch {
      // 失敗保留舊點列（過期仍可畫）；無舊資料時由 hook 呈現載入/空態
    }
  },
}));
