# Tasks: surface-quote-symbol-errors

## 1. shared — 錯誤碼（TDD）

- [x] 1.1 測試先行：`packages/shared` 新增 `QuoteErrorCode`（`'symbol_not_found' | 'transient'`）與 type guard `isQuoteErrorCode` 的測試（合法值/非法值/undefined fallback）
- [x] 1.2 實作 `QuoteErrorCode` + `isQuoteErrorCode` 於 `packages/shared/src/quotes/`，自 index 匯出；`pnpm --filter @assetanchor/shared test:coverage` 過 gate

## 2. functions — provider 分類 + fetchQuotes 帶 code（TDD）

- [x] 2.1 測試先行：`yahooProvider` HTTP 404 與「200 但 chart result 為空」擲 `SymbolNotFoundError`（帶 market/symbol）；429/5xx/網路錯誤維持一般錯誤
- [x] 2.2 實作 `SymbolNotFoundError` 類別 + `yahooProvider` 分類擲錯
- [x] 2.3 測試先行：`fetchQuotes` per-item error 帶 `code`（`SymbolNotFoundError` → `symbol_not_found`、其他/sanity 失敗 → `transient`），錯誤隔離與 400 行為不變（分類抽純函式 `classifyQuoteError`/`quoteErrorPayload` 測試）
- [x] 2.4 實作 `fetchQuotes` handler error 分類；本機 `emulators:fn` 實測：`US:0050` → `{code:"symbol_not_found"}`、`TW:0050` → price 105.80 ✓
- [ ] 2.5 `pnpm --filter @assetanchor/functions test` + `pnpm -r typecheck lint` 全綠（functions 66 tests ✓；全 repo 收尾跑）

## 3. mobile — parser / store / logQuoteError

- [x] 3.1 測試先行：`parseFetchQuotesResponse` 保留 per-item `error.code`（缺 code 的舊格式 fallback `transient`），回傳 quotes + errors 結構
- [x] 3.2 實作 parser 擴充 + `logQuoteError(stage, detail)` seam（結構化 console.warn）；`triggerFetchQuotes`／`readFirestoreCache` 空 catch 全數改接 seam
- [x] 3.3 測試先行：錯誤合併決策抽純函式 `resolveBatchTargets`（quotesBatch，coverage gate 內）——新值/stale fallback 不標錯、完全無值＋錯誤碼才標錯（store 屬 I/O 不直接測，對齊 ADR-0007）
- [x] 3.4 實作 store errors map（`errors` state + `quoteErrorFor` selector）與「成功即清除」邏輯

## 4. mobile — holdings UI 降級

- [x] 4.1 測試先行：`computeHoldingsHero` 拆分 `notFoundCount`（not_found 不計入 pending）+ `countQuoteNotFound`（hero=null 時 screen 判定用）
- [x] 4.2 實作 hero 擴充；`HoldingsOverviewScreen` 清單列「查無代號」標示 + Hero 全空時「N 檔查無報價代號，請檢查交易的市場/代號設定」降級文案（沿既有降級橫幅視覺模式）
- [x] 4.3 （改）RNTL 基建不存在且 screen 分支為薄 plumbing——對齊 ADR-0007 獎盃模型（resilient-quote-display 前例）：決策邏輯已由純函式測試涵蓋（holdingsHero 12 tests + quotesBatch 12 tests），不為此裝 RNTL；UI 出口由 4.4 dogfood + 5.1 視覺對圖驗證
- [ ] 4.4 Emulator dogfood：手動輸入 market=US 的 0050 BUY 重現原 bug → 確認顯示查無降級；改回 TW → 報價正常、錯誤清除（後端鏈路已以 curl 對 emulator functions 驗證：US:0050→symbol_not_found、TW:0050→105.80）

## 5. 收尾（gates）

- [ ] 5.1 iOS Simulator 視覺對圖（holdings-overview-spec.md + 原型；查無文案/版位與 owner 確認）——owner gate
- [ ] 5.2 `pnpm -r typecheck lint test` + `pnpm format:check` 全綠；開 PR（stacked on 目前 stack 頂端）
- [ ] 5.3 functions production 部署 + 新 TestFlight build——owner gate（記入 PR 描述，不自行執行）
