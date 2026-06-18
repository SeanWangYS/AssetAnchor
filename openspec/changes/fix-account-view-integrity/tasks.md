## 1. shared：帳戶層級可賣量（A，TDD）

- [ ] 1.1（先測）`sellableQuantityForAccount(txs, accountId, market, symbol)`（或 `sellableQuantity` 加 accountId 範圍）單元測試：同帳戶持有→可賣=該帳戶量；**同 symbol 在他帳戶有持倉但本帳戶 0→可賣=0**；本帳戶超賣偵測
- [ ] 1.2 實作該純函式（內部 `deriveHoldings(txs.filter(account_id===accountId))`），export 於 portfolio
- [ ] 1.3 `pnpm --filter @assetanchor/shared test:coverage` 綠（>90% gate）

## 2. shared：per-account 逐-symbol 容錯衍生（B，TDD）

- [ ] 2.1（先測）`deriveHoldingsForAccountSafe(txs, accountId)` 單元測試：無爛資料時結果與「整體 `deriveHoldings(filtered)`」**一致且同序**；含一筆帳戶層級超賣 orphan SELL 時→該 symbol 被跳過（回報 skipped）、其餘 Position 照常；全空交易→[]
- [ ] 2.2 實作：依 `(market, symbol)` 分組、逐組 derive、單組 throw 跳過並收集 `skipped`、合併排序回傳（含合法 Position 與 skipped 清單）
- [ ] 2.3 coverage 綠

## 3. mobile transactions：SELL 可賣量改帳戶層級（A）

- [ ] 3.1 `TransactionForm.tsx`：SELL 可賣量改呼叫帳戶版（以表單所選 `account_id` 過濾），`useMemo` deps 加 `accountId`——切帳戶即重算可賣量
- [ ] 3.2 確認超賣/無持倉的紅字提示與擋送出沿用既有 UX（文案：賣出股數超過可賣 / 此帳戶無持倉）
- [ ] 3.3 mobile 純邏輯測試（若可）+ typecheck/lint 綠

## 4. mobile accounts：帳戶詳情容錯（B）

- [ ] 4.1 `accountDisplay.ts` `holdingsForAccount` 改呼叫 `deriveHoldingsForAccountSafe`（取代 catch→[]），回傳合法 Position + skipped
- [ ] 4.2 `AccountDetailScreen.tsx`：對 skipped 的 symbol 以「資料異常」之類標示（不顯示錯誤數字、不 blank）；其餘持股照常顯示
- [ ] 4.3 typecheck/lint 綠

## 5. mobile settings：現金餘額唯讀總覽（E）

- [ ] 5.1 `SettingsScreen.tsx`：訂閱 `accountsStore`，依幣別以 `Money` 加總（啟用）帳戶 `cash_balances`
- [ ] 5.2 「現金餘額」列改唯讀（移除 `onPress`/chevron），右側顯示各幣別加總（僅顯示有餘額幣別，`Money.toDisplayString` 2 位小數 + 前綴）
- [ ] 5.3 「帳戶管理」列維持可點導向 Accounts；typecheck/lint 綠

## 6. 驗證與收尾

- [ ] 6.1 `pnpm -r typecheck` + `pnpm -r lint` + shared/mobile `test:coverage` 全綠（>90% gate）
- [ ] 6.2 本機 dogfood（Emulator）：(1) SELL 只能賣所選帳戶持有量、跨帳戶不互通；(2) 人為在某帳戶建一筆 orphan SELL → 該帳戶其餘持股仍顯示、壞檔被標示、整頁不 blank；(3) 設定頁現金餘額＝跨帳戶加總、不可點
- [ ] 6.3 iOS Simulator 逐畫面視覺對圖（帳戶詳情 + 設定頁現金列）對照 `docs/design/accounts-management/*` 與 analysis-page-spec §3.2 —— **owner gate**
- [ ] 6.4 Conventional Commits 分批 commit（scope: shared / mobile）；於隔離 worktree 完成後開 PR；（帶 UI）archive 後續做下一個，merge 延後由 owner 批次
