import type { RawQuote } from '@assetanchor/shared';

/**
 * 解析 Yahoo Finance v8 chart 端點回應 → RawQuote（純函式，可測；不打外網）。
 * 端點：https://query1.finance.yahoo.com/v8/finance/chart/{ySymbol}（keyless）。
 * meta.regularMarketPrice 為必要欄位；缺價回 null（呼叫端 fail loud）。OHLC / prevClose / volume
 * 缺值回 null（交由 shared sanitizeQuote 處理）。`sourceTimestampSec` 為 Yahoo 資料時戳（epoch 秒）。
 */
export interface ParsedYahooQuote extends RawQuote {
  sourceTimestampSec: number | null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function parseYahooChart(json: unknown): ParsedYahooQuote | null {
  const result = (json as { chart?: { result?: unknown[] } })?.chart?.result;
  const meta = Array.isArray(result)
    ? (result[0] as { meta?: Record<string, unknown> } | undefined)?.meta
    : undefined;
  if (!meta) return null;

  const price = num(meta.regularMarketPrice);
  if (price === null) return null; // 必要欄位

  return {
    price,
    open: num(meta.regularMarketOpen),
    high: num(meta.regularMarketDayHigh),
    low: num(meta.regularMarketDayLow),
    prevClose: num(meta.chartPreviousClose) ?? num(meta.previousClose),
    volume: num(meta.regularMarketVolume),
    sourceTimestampSec: num(meta.regularMarketTime),
  };
}

/** market + symbol → Yahoo 代號（台股加 `.TW`；美股原樣）。 */
export function toYahooSymbol(market: string, symbol: string): string {
  return market === 'TW' ? `${symbol}.TW` : symbol;
}
