/**
 * 報價鏈路錯誤的集中記錄 seam（surface-quote-symbol-errors）。
 * MVP 實作＝結構化 console.warn；未來錯誤上報（add-sentry-error-reporting）只改此函式，
 * 呼叫端不散布上報邏輯。detail 以 symbolId / 階段 / HTTP status 為限（不含金額、email、uid）。
 */
export type QuoteErrorStage =
  | 'batch_http' // fetchQuotes 請求整體失敗（網路 / 非 2xx / JSON 解析失敗）
  | 'batch_item' // fetchQuotes 回應中的 per-item error
  | 'firestore_cache'; // Firestore quotes/{symbolId} 讀取失敗

export function logQuoteError(stage: QuoteErrorStage, detail: Record<string, unknown>): void {
  console.warn(`[quotes:${stage}]`, detail);
}
