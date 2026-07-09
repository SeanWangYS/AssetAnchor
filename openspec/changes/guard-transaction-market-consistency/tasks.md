# Tasks: guard-transaction-market-consistency

## 1. shared — 一致性純函式與 schema（TDD）

- [x] 1.1 測試先行：`expectedCurrencyForMarket`（TW→TWD、US→USD、CRYPTO/OTHER→null）
- [x] 1.2 實作 `expectedCurrencyForMarket` 並自 index 匯出
- [x] 1.3 測試先行：transaction zod schema refine——TW×USD / US×TWD 拒絕（繁中訊息、標 `currency` 欄位）、TW×TWD / US×USD / OTHER×任意 通過
- [x] 1.4 實作 zod refine；`pnpm --filter @assetanchor/shared test:coverage` 過 gate
- [x] 1.5 測試先行 + 實作：`symbolLooksLikeMarketMismatch`（US×數字開頭 true、TW×純字母 true、相符組合 false、CRYPTO/OTHER false、空字串 false）

## 2. mobile — 表單聯動與軟警告

- [x] 2.1 TransactionForm：市場變動時 `setValue('currency', expected)` 單向聯動（僅 TW/US）
- [x] 2.2 TransactionForm：代號/市場變動時顯示 `symbolLooksLikeMarketMismatch` 軟警告文字（非阻擋）
- [x] 2.3 確認 zod 驗證錯誤（不一致幣別）經既有 safeParse 錯誤路徑正確顯示於欄位
- [ ] 2.4 Emulator dogfood：重演 production bug 輸入（US＋0050＋TWD）→ 軟警告出現、送出被擋；改 TW 後幣別自動 TWD、送出成功；編輯既有錯誤交易可被引導修正

## 3. 收尾（gates）

- [ ] 3.1 iOS Simulator 視覺對圖（transactions-page spec＋原型；警告文案/位置與 owner 確認）——owner gate
- [ ] 3.2 `pnpm -r typecheck lint test` + `pnpm format:check` 全綠；開 PR（stacked on surface-quote-symbol-errors 分支）
