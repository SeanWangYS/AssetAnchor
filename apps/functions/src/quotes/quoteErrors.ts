/**
 * 報價抓取的可辨識錯誤型別（surface-quote-symbol-errors）。
 * provider 擲型別化錯誤、handler 以 instanceof 分類為 QuoteErrorCode（shared），
 * 不解析錯誤訊息字串（脆弱且綁死文案）。
 */

import type { QuoteErrorCode } from '@assetanchor/shared';

/** 代號在該市場不存在（Yahoo 404 / 空 chart result）——永久錯誤，重試不會成功。 */
export class SymbolNotFoundError extends Error {
  readonly market: string;
  readonly symbol: string;

  constructor(market: string, symbol: string) {
    super(`查無報價代號：${market}:${symbol}`);
    this.name = 'SymbolNotFoundError';
    this.market = market;
    this.symbol = symbol;
  }
}

/** 錯誤 → QuoteErrorCode：SymbolNotFoundError 為永久錯誤，其餘一律暫時錯誤。 */
export function classifyQuoteError(e: unknown): QuoteErrorCode {
  return e instanceof SymbolNotFoundError ? 'symbol_not_found' : 'transient';
}

/** fetchQuotes per-item error 回應（帶 code 供 client 區分永久/暫時；訊息繁中）。 */
export function quoteErrorPayload(e: unknown): { code: QuoteErrorCode; message: string } {
  const code = classifyQuoteError(e);
  return {
    code,
    message: code === 'symbol_not_found' ? '查無報價代號，請確認市場/代號' : '報價暫時無法取得',
  };
}
