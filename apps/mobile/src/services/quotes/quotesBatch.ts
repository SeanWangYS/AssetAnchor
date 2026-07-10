import { isQuoteErrorCode, type QuoteErrorCode } from '@assetanchor/shared';
import type { QuoteEntry, QuoteTarget } from './quotesStore';

/**
 * 批次報價（fetchQuotes）的純 helper（可單元測試、不依賴 firebase；型別 import 為 type-only 故無 runtime 依賴）。
 * loadFor 把「需抓清單」一次送 `fetchQuotes`（N→1），再以本檔解析回應、分配回填。
 */

/** 後端 fetchQuotes 回應的單筆（getOrFetchQuote 結果，或 error 筆；error 新格式帶 code、舊格式為字串）。 */
interface BatchQuoteResultItem {
  symbolId?: string;
  price?: string;
  prevClose?: string | null;
  fetchedAtMs?: number;
  error?: string | { code?: string; message?: string };
}

/** 解析後的單筆報價（原幣別；currency 由呼叫端依 target 補上）。 */
export interface ParsedBatchQuote {
  price: string;
  prevClose: string | null;
  fetchedAtMs: number;
}

/** 解析後的批次結果：成功筆 + 錯誤筆（per-symbol 錯誤碼，與「無資料」明確區分）。 */
export interface ParsedBatchResult {
  quotes: Record<string, ParsedBatchQuote>;
  errors: Record<string, QuoteErrorCode>;
}

/** 組批次 URL：`?items=market:symbol:currency,...`（整串 encode；Express 端自動 decode 後由 parseBatchInput 切分）。 */
export function buildFetchQuotesUrl(base: string, targets: readonly QuoteTarget[]): string {
  const items = targets.map((t) => `${t.market}:${t.symbol}:${t.currency}`).join(',');
  return `${base}/fetchQuotes?items=${encodeURIComponent(items)}`;
}

/**
 * 解析 fetchQuotes 回應 → { quotes, errors }。純函式：
 * 非 ok / 格式錯 → 全空；error 筆進 errors（帶 code；舊字串格式/未知 code fallback `transient`）；
 * 缺 price 且無 error 筆略過；fetchedAtMs 缺則回退 nowMs。
 */
export function parseFetchQuotesResponse(json: unknown, nowMs: number): ParsedBatchResult {
  const out: ParsedBatchResult = { quotes: {}, errors: {} };
  if (!json || typeof json !== 'object') return out;
  const j = json as { ok?: boolean; quotes?: unknown };
  if (!j.ok || !Array.isArray(j.quotes)) return out;
  for (const raw of j.quotes) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as BatchQuoteResultItem;
    if (!item.symbolId) continue;
    if (item.error) {
      const code = typeof item.error === 'object' ? item.error.code : undefined;
      out.errors[item.symbolId] = isQuoteErrorCode(code) ? code : 'transient';
      continue;
    }
    if (!item.price) continue;
    out.quotes[item.symbolId] = {
      price: item.price,
      prevClose: item.prevClose ?? null,
      fetchedAtMs: typeof item.fetchedAtMs === 'number' ? item.fetchedAtMs : nowMs,
    };
  }
  return out;
}

/**
 * 抓取結果 → 更新/錯誤決策（純函式；loadFor Phase 2 的核心語義）：
 * 逐 target 依優先序——抓到新值 → updates；否則有 stale fallback → 用過期值（**不標錯**，
 * 資料可用性 > 錯誤宣告）；否則完全無值——有回報錯誤碼才標錯（無資訊維持 pending 語義）。
 */
export function resolveBatchTargets(
  targets: readonly QuoteTarget[],
  fetched: Record<string, QuoteEntry>,
  staleFallback: Record<string, QuoteEntry>,
  errors: Record<string, QuoteErrorCode>,
): { updates: Record<string, QuoteEntry>; errorUpdates: Record<string, QuoteErrorCode> } {
  const updates: Record<string, QuoteEntry> = {};
  const errorUpdates: Record<string, QuoteErrorCode> = {};
  for (const t of targets) {
    const id = `${t.market}_${t.symbol}`;
    const fresh = fetched[id];
    const stale = staleFallback[id];
    const code = errors[id];
    if (fresh) updates[id] = fresh;
    else if (stale) updates[id] = stale;
    else if (code) errorUpdates[id] = code;
  }
  return { updates, errorUpdates };
}
