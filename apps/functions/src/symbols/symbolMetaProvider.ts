import type { RawSymbolMeta } from '@assetanchor/shared';
import { toYahooSymbol } from '../quotes/parseYahooChart';
import { parseQuoteSummaryMeta, parseChartMeta } from './parseYahooSymbolMeta';

/**
 * Symbol metadata 來源介面（ADR-0006 同精神：來源可替換）。
 * `fetch` 查無 metadata 時回 null（非錯誤）——endpoint 據此回報「無 metadata」而非 502。
 */
export interface SymbolMetaProvider {
  name: string;
  fetch(market: string, symbol: string): Promise<RawSymbolMeta | null>;
}

const UA = { 'User-Agent': 'Mozilla/5.0 (AssetAnchor)' } as const;

function nonEmpty(raw: RawSymbolMeta | null): RawSymbolMeta | null {
  return raw && Object.keys(raw).length > 0 ? raw : null;
}

/**
 * Yahoo：主源 quoteSummary（含 industry/sector，但近期可能需 crumb），退化 chart meta（名稱 + 交易所）。
 * 兩源皆 keyless GET；任一步失敗 / 查無就往下退，全失敗回 null。整形交由 shared normalizeSymbolMeta。
 */
export const yahooSymbolMetaProvider: SymbolMetaProvider = {
  name: 'yahoo-finance',
  async fetch(market, symbol) {
    const ySymbol = toYahooSymbol(market, symbol);

    try {
      const url =
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySymbol)}` +
        `?modules=price,assetProfile,quoteType`;
      const res = await fetch(url, { headers: UA });
      if (res.ok) {
        const raw = nonEmpty(parseQuoteSummaryMeta(await res.json()));
        if (raw) return raw;
      }
    } catch {
      // fall through to chart fallback
    }

    try {
      const url =
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}` +
        `?interval=1d&range=1d`;
      const res = await fetch(url, { headers: UA });
      if (res.ok) {
        const raw = nonEmpty(parseChartMeta(await res.json()));
        if (raw) return raw;
      }
    } catch {
      // ignore — fall through to null
    }

    return null;
  },
};
