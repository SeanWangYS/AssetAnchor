// Cloud Functions 進入點。匯出的成員即為部署的函式（tsup bundle 進 lib/index.js）。
//
// Sprint 4：第一個 Cloud Function——每日抓台銀匯率寫入 exchange_rates（ADR-0005）。
// shared（Money）於 build 時由 tsup bundle 進輸出，runtime 不 require .ts
// （解決原 Sprint 0 註記的 workspace runtime 問題，採 design D5 的 bundle 方案）。
export { scheduledUsdRate, seedUsdRate } from './exchangeRates/fetchAndStore';
