// Cloud Functions 進入點。匯出的成員即為部署的函式（tsup bundle 進 lib/index.js）。
//
// Sprint 4：第一個 Cloud Function——每日抓台銀匯率寫入 exchange_rates（ADR-0005）。
// shared（Money）於 build 時由 tsup bundle 進輸出，runtime 不 require .ts
// （解決原 Sprint 0 註記的 workspace runtime 問題，採 design D5 的 bundle 方案）。
export { scheduledUsdRate, seedUsdRate } from './exchangeRates/fetchAndStore';

// Sprint 5b：報價 callable（ADR-0006，Yahoo + quotes 雙層 cache 15min TTL）。
export { fetchQuote } from './quotes/fetchQuote';

// 報價層 2（ADR-0006 增補，add-quote-batch-discovery）：
// 批次讀（開頁 N→1）+ 事件驅動發現（新 symbol 進場即抓首筆報價）。
export { fetchQuotes } from './quotes/fetchQuotes';
export { onSymbolCreatedFetchQuote } from './quotes/onSymbolCreated';

// Sprint 6：symbol metadata enrich（Yahoo quoteSummary → symbols/{symbolId} upsert）。
export { fetchSymbolMeta } from './symbols/fetchSymbolMeta';
