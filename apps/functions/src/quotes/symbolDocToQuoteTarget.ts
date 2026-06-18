import { CURRENCIES, MARKETS, type Currency } from '@assetanchor/shared';

/** 由 symbols/{symbolId} 文件推導的報價抓取目標。 */
export interface QuoteTargetFromSymbol {
  market: string;
  symbol: string;
  currency: Currency;
}

/**
 * 從新建的 symbols/{symbolId} 文件資料取出報價抓取目標（market/symbol/currency）。
 * 純函式（可單元測試、不依賴 firebase）。欄位缺失或 enum 非法 → 回 null（觸發器略過、不擲錯）。
 */
export function symbolDocToQuoteTarget(
  data: Record<string, unknown> | undefined,
): QuoteTargetFromSymbol | null {
  if (!data) return null;
  const market = String(data.market ?? '');
  const symbol = String(data.symbol ?? '')
    .trim()
    .toUpperCase();
  const currency = String(data.currency ?? '');
  if (!(MARKETS as readonly string[]).includes(market) || !symbol) return null;
  if (!(CURRENCIES as readonly string[]).includes(currency)) return null;
  return { market, symbol, currency: currency as Currency };
}
