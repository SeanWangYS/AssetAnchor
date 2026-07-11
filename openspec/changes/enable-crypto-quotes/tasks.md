# Tasks: enable-crypto-quotes

## 1. shared — 幣別 enum 與市場×幣別純函式（TDD）

- [x] 1.1 `enums/currencies.ts` 加 `USDT`（MVP 段）＋先改 `enums.test.ts` 白名單測試（含順序/包含斷言）再實作（§13.4：enum 新值必補測試）
- [x] 1.2 `markets/marketConsistency.ts` 新增 `defaultCurrencyForMarket`（TW→TWD、US→USD、CRYPTO→USD、OTHER→null）與 `CRYPTO_TRANSACTION_CURRENCIES = ['USD','USDT','TWD']`；先寫測試再實作；`expectedCurrencyForMarket` 不動（design D5）
- [x] 1.3 `schemas/transaction.ts`：`MVP_CURRENCIES` 加 `USDT`；superRefine 補 CRYPTO 允許集檢核（集合外 → 繁中錯誤標示 `currency`）；先加測試：CRYPTO×USDT 通過、US×USDT 被拒、CRYPTO×JPY 被拒、TW/US 硬擋回歸

## 2. functions — crypto ticker + 身分護欄（TDD）

- [x] 2.1 `quotes/parseYahooChart.ts`：`toYahooSymbol` 加 CRYPTO 分支（`${symbol}-USD` 寫死）；`parseYahooChart` 輸出加 `yahooSymbol`（`meta.symbol`，缺為 null）；先改 `parseYahooChart.test.ts`（CRYPTO ticker、yahooSymbol 抽取、缺值 null）
- [x] 2.2 `quotes/yahooProvider.ts`：parse 後比對 `yahooSymbol` vs 請求 ySymbol（大小寫不敏感），有值且不一致 → `SymbolNotFoundError`；缺值不擋；先改 `yahooProvider.test.ts`（mismatch→not_found、相符放行、缺值放行三場景）
- [x] 2.3 `history/yahooHistoryProvider.ts`：`toYahooHistorySymbol` 加 CRYPTO 分支；歷史回應加 `meta.symbol` 比對（不一致 fail loud、不落地），與既有 `dataGranularity` 驗證同層；先補測試
- [x] 2.4 確認 `symbols/symbolMetaProvider.ts` 隨 `toYahooSymbol` 修正生效（複用），補一筆 CRYPTO ticker 測試斷言

## 3. functions — USDT peg 匯率鍵（TDD）

- [x] 3.1 `exchangeRates/fetchAndStore.ts`：`rates` 衍生 USDT 四鍵（`USDT_TWD=USD_TWD`、`TWD_USDT=TWD_USD`、`USDT_USD=USD_USDT="1.0000000000"`）；先寫測試（含 10 位小數 string 格式斷言）
- [x] 3.2 `symbols/fetchSymbolMeta.ts`：`market=CRYPTO` 時 coerce 寫入 `currency='USD'`（server 為 symbols 唯一寫入者，防禦任何 client）；補測試

## 4. mobile — 表單與 symbol target

- [x] 4.1 `TransactionForm.tsx`：市場自動同步改用 `defaultCurrencyForMarket`（CRYPTO→USD）；幣別 picker 選項加 USDT；驗證錯誤文案走 shared schema（無新 UI 版面，維持既有 picker 樣式）
- [x] 4.2 `services/symbols/symbolsStore.ts`：`symbolTargetsFromTransactions` 對 CRYPTO 標的 `currency` 固定 `USD`（不抄 `t.currency`）；`transactionsView` 確認 USDT 金額顯示 fallback（`currencySymbol` 未知幣別退幣別代碼）
- [x] 4.3 `pnpm -r typecheck && pnpm -r lint && pnpm -r test` 全綠（shared coverage gate 90%）

## 6. 混幣別 lots + 全域容錯 + 報價幣別（apply 期 e2e 發現，owner 拍板；TDD）

- [x] 6.1 shared `quoteCurrencyForMarket(market, fallback)`（TW→TWD、US→USD、CRYPTO→USD、OTHER→fallback）＋測試
- [x] 6.2 shared `deriveHoldings` scan 分組鍵改 `(market, symbol, currency)`；`sellableQuantity(ForAccount)` 加 `currency` 參數；新增 `deriveHoldingsSafe`（複用 safeHoldingsFromTxs）；先寫測試：混幣別 BTC 兩 lots、跨幣別可賣=0、safe 版隔離、單幣別行為回歸不變
- [x] 6.3 functions `fetchQuote`/`fetchQuotes` 入口 coerce CRYPTO 報價幣別→USD ＋測試（client 傳 TWD 仍寫 USD）
- [x] 6.4 mobile quotesStore QuoteEntry 幣別改用 `quoteCurrencyForMarket`；valuation 報價定價用報價幣別（113/129/191），市值與成本各自換算顯示幣別再算未實現損益＋valuation 測試
- [x] 6.5 mobile 全域總覽（useHoldings / Analysis）改用 `deriveHoldingsSafe`；TransactionForm 可賣數量帶幣別
- [x] 6.6 `pnpm -r typecheck && lint && test` 全綠

## 5. 驗證與收尾

- [x] 5.1 本機 e2e 驗證（Simulator + Emulator，依 dogfood 慣例補種 fresh quotes）：新增 CRYPTO/BTC（幣別預設 USD）交易 → 持倉現價為 BTC 市場價量級；改 USDT 記帳一筆 → 送出成功、換算正常；`quotes/CRYPTO_BTC` 文件 ticker 正確
- [x] 5.2 檢查 dev seed / emulator 種子資料是否含 `exchange_rates`（有則補 USDT 四鍵，維持與新文件形狀一致）
- [ ] 5.3 openspec validate + 開 PR（scope 橫跨 shared/functions/mobile；聖牛 schema + 報價 scope ＝ **owner 本人 merge**，不自 merge）；PR 描述附部署後 prod 驗收清單（BTC 實價、cache 覆寫、USDT 換算）
