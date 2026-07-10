/**
 * 報價抓取錯誤分類（surface-quote-symbol-errors）：
 * - `symbol_not_found`：代號在該市場不存在（Yahoo 404 / 空 chart result），屬**永久錯誤**——
 *   重試不會成功，UI 應顯示「查無報價代號」引導檢查市場/代號，而非無限載入。
 * - `transient`：其他失敗（網路、429、5xx、sanity 不過等），屬**暫時錯誤**——維持既有
 *   「更新中／延遲」降級路徑。
 * 兩端共用同一字面值（functions 組回應、mobile 解析），避免字串漂移。
 */
export const QUOTE_ERROR_CODES = Object.freeze(['symbol_not_found', 'transient'] as const);

export type QuoteErrorCode = (typeof QUOTE_ERROR_CODES)[number];

/** type guard：unknown → QuoteErrorCode（非法值回 false；舊格式缺 code 由呼叫端 fallback transient）。 */
export function isQuoteErrorCode(v: unknown): v is QuoteErrorCode {
  return typeof v === 'string' && (QUOTE_ERROR_CODES as readonly string[]).includes(v);
}
