import type { QuoteTarget } from './quotesStore';

/**
 * 批次報價（fetchQuotes）的純 helper（可單元測試、不依賴 firebase；型別 import 為 type-only 故無 runtime 依賴）。
 * loadFor 把「需抓清單」一次送 `fetchQuotes`（N→1），再以本檔解析回應、分配回填。
 */

/** 後端 fetchQuotes 回應的單筆（getOrFetchQuote 結果，或 error 筆）。 */
interface BatchQuoteResultItem {
  symbolId?: string;
  price?: string;
  prevClose?: string | null;
  fetchedAtMs?: number;
  error?: string;
}

/** 解析後的單筆報價（原幣別；currency 由呼叫端依 target 補上）。 */
export interface ParsedBatchQuote {
  price: string;
  prevClose: string | null;
  fetchedAtMs: number;
}

/** 組批次 URL：`?items=market:symbol:currency,...`（整串 encode；Express 端自動 decode 後由 parseBatchInput 切分）。 */
export function buildFetchQuotesUrl(base: string, targets: readonly QuoteTarget[]): string {
  const items = targets.map((t) => `${t.market}:${t.symbol}:${t.currency}`).join(',');
  return `${base}/fetchQuotes?items=${encodeURIComponent(items)}`;
}

/**
 * 解析 fetchQuotes 回應 → `symbolId → ParsedBatchQuote`。純函式：
 * 非 ok / 格式錯 → {}；error 筆 / 缺 price 筆略過；fetchedAtMs 缺則回退 nowMs。
 */
export function parseFetchQuotesResponse(
  json: unknown,
  nowMs: number,
): Record<string, ParsedBatchQuote> {
  const out: Record<string, ParsedBatchQuote> = {};
  if (!json || typeof json !== 'object') return out;
  const j = json as { ok?: boolean; quotes?: unknown };
  if (!j.ok || !Array.isArray(j.quotes)) return out;
  for (const raw of j.quotes) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as BatchQuoteResultItem;
    if (!item.symbolId || item.error || !item.price) continue;
    out[item.symbolId] = {
      price: item.price,
      prevClose: item.prevClose ?? null,
      fetchedAtMs: typeof item.fetchedAtMs === 'number' ? item.fetchedAtMs : nowMs,
    };
  }
  return out;
}
