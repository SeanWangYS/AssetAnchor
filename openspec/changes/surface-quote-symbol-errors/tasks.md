# Tasks: surface-quote-symbol-errors

## 1. shared — 錯誤碼（TDD）

- [ ] 1.1 測試先行：`packages/shared` 新增 `QuoteErrorCode`（`'symbol_not_found' | 'transient'`）與 type guard `isQuoteErrorCode` 的測試（合法值/非法值/undefined fallback）
- [ ] 1.2 實作 `QuoteErrorCode` + `isQuoteErrorCode` 於 `packages/shared/src/quotes/`，自 index 匯出；`pnpm --filter @assetanchor/shared test:coverage` 過 gate

## 2. functions — provider 分類 + fetchQuotes 帶 code（TDD）

- [ ] 2.1 測試先行：`yahooProvider` HTTP 404 與「200 但 chart result 為空」擲 `SymbolNotFoundError`（帶 market/symbol）；429/5xx/網路錯誤維持一般錯誤
- [ ] 2.2 實作 `SymbolNotFoundError` 類別 + `yahooProvider` 分類擲錯
- [ ] 2.3 測試先行：`fetchQuotes` per-item error 帶 `code`（`SymbolNotFoundError` → `symbol_not_found`、其他/sanity 失敗 → `transient`），錯誤隔離與 400 行為不變
- [ ] 2.4 實作 `fetchQuotes` handler error 分類；本機 `emulators:fn` 以 `US:0050`（預期 symbol_not_found）與 `TW:0050`（預期成功）實測
- [ ] 2.5 `pnpm --filter @assetanchor/functions test` + `pnpm -r typecheck lint` 全綠

## 3. mobile — parser / store / logQuoteError

- [ ] 3.1 測試先行：`parseFetchQuotesResponse` 保留 per-item `error.code`（缺 code 的舊格式 fallback `transient`），回傳 quotes + errors 結構
- [ ] 3.2 實作 parser 擴充 + `logQuoteError(stage, detail)` seam（結構化 console.warn）；`triggerFetchQuotes`／`readFirestoreCache` 空 catch 全數改接 seam
- [ ] 3.3 測試先行：`quotesStore` errors map——error 筆寫入、報價成功即清除、**有 stale fallback 者不標錯**
- [ ] 3.4 實作 store errors map 與清除邏輯

## 4. mobile — holdings UI 降級

- [ ] 4.1 測試先行：`computeHoldingsHero` 拆分 `notFoundCount`（not_found 不計入 pending；includedCount===0 + notFound>0 的判定輸出）
- [ ] 4.2 實作 hero 擴充；`HoldingsOverviewScreen` 清單列「查無報價代號」標示 + Hero 全空時「N 檔查無報價代號，請檢查市場/代號」降級文案（沿既有降級橫幅視覺模式）
- [ ] 4.3 RNTL 關鍵 flow 一條：全部持倉 symbol_not_found → 畫面顯示查無文案而非「報價載入中…」
- [ ] 4.4 Emulator dogfood：手動輸入 market=US 的 0050 BUY 重現原 bug → 確認顯示查無降級；改回 TW → 報價正常、錯誤清除

## 5. 收尾（gates）

- [ ] 5.1 iOS Simulator 視覺對圖（holdings-overview-spec.md + 原型；查無文案/版位與 owner 確認）——owner gate
- [ ] 5.2 `pnpm -r typecheck lint test` + `pnpm format:check` 全綠；開 PR（stacked on 目前 stack 頂端）
- [ ] 5.3 functions production 部署 + 新 TestFlight build——owner gate（記入 PR 描述，不自行執行）
