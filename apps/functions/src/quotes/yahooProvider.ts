import type { RawQuote } from '@assetanchor/shared';
import { parseYahooChart, toYahooSymbol } from './parseYahooChart';
import { SymbolNotFoundError } from './quoteErrors';

/** Provider 回傳：RawQuote + 來源時戳（epoch 秒）。 */
export type ProviderQuote = RawQuote & { sourceTimestampSec: number | null };

/**
 * 報價來源介面（ADR-0006：來源可替換，只換實作不動消費端）。
 * `fetch` 失敗 / 無法解析時 fail loud（擲錯），由 fetchQuote 轉成 HttpsError。
 */
export interface QuoteProvider {
  name: string;
  fetch(market: string, symbol: string): Promise<ProviderQuote>;
}

/** Yahoo Finance v8 chart 端點（keyless）。 */
export const yahooProvider: QuoteProvider = {
  name: 'yahoo-finance',
  async fetch(market, symbol) {
    const ySymbol = toYahooSymbol(market, symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ySymbol,
    )}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (AssetAnchor)' } });
    // 404 = 代號不存在（永久錯誤）；其餘非 2xx（429/5xx）為暫時錯誤（一般 Error）。
    if (res.status === 404) throw new SymbolNotFoundError(market, symbol);
    if (!res.ok) throw new Error(`Yahoo fetch 失敗：HTTP ${res.status}（${ySymbol}）`);
    const json = (await res.json()) as { chart?: { result?: unknown[] } } | null;
    // Yahoo 對不存在代號有時回 200 + 空 result——同樣視為查無代號。
    const result = json?.chart?.result;
    if (!Array.isArray(result) || result.length === 0) {
      throw new SymbolNotFoundError(market, symbol);
    }
    const parsed = parseYahooChart(json);
    if (!parsed) throw new Error(`Yahoo 報價解析失敗（${ySymbol}）`);
    return parsed;
  },
};
