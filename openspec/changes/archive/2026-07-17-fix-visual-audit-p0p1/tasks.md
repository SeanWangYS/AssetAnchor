## 1. 分支

- [x] 1.1 `git fetch origin && git checkout -b fix/visual-audit-p0p1 origin/main`（從最新 main）

## 2. shared（TDD：先測後實作）

- [x] 2.1 `account.test.ts` / `transaction.test.ts` 補 8 個 enum 欄位「空字串 → 繁中訊息」斷言（紅）
- [x] 2.2 `schemas/account.ts` / `schemas/transaction.ts` enum 欄位補繁中訊息（綠）
- [x] 2.3 `transactions/transactionTotalWithFees.test.ts`：BUY 含 fee+tax、SELL 減 fee+tax、tax>0、SELL 淨額可為負、fail-soft（紅）
- [x] 2.4 實作 `transactionTotalWithFees.ts` + index export（綠）
- [x] 2.5 `deriveHoldings.ts` scan() BUY cost / SELL proceeds 改用 helper（既有測試維持綠）
- [x] 2.6 export `isRealDate` + 直接單元測試
- [x] 2.7 `pnpm --filter @assetanchor/shared test:coverage` ≥90% 綠

## 3. mobile — 顯示口徑與小件

- [x] 3.1 Fix 6：`zh-TW.ts` 增 `transactions.listTitle`；TransactionsStack `TransactionList` 補 title；TransactionsScreen ScreenHeader 共用
- [x] 3.2 Fix 5：HoldingsOverviewScreen label「持股市值（{ccy}）」+ footnote「不含現金」；註解殘留同步（theme/holdingsDemo/screen）
- [x] 3.3 Fix 5 設計包同步：holdings-overview-spec.md + aa-screens-v2.jsx + aa-core.jsx + holdings-overview/prototype/aa-screens.jsx
- [x] 3.4 Fix 3：三顯示點改用 `transactionTotalWithFees`；TransactionList.tsx:18 註解修正；TransactionDetail 補「交易稅」列（非零顯示）
- [x] 3.5 Fix 3：TransactionForm `computeTotal` 補 tax + 預估卡說明文字更新

## 4. mobile — 表單與日期區間

- [x] 4.1 Fix 2：AccountForm submitted flag + onChange 全量 re-safeParse（含 picker onSelect / Segmented / 色塊路徑）
- [x] 4.2 Fix 2 附帶：驗證交易表單股數紅框殘留（稽核 26h）；若 Input error 樣式 bug 一併修
- [x] 4.3 Fix 4：dateRangeStore 擴充 custom 起訖 + inRange/filterByPreset 過濾（mobile jest 純函式測試：含當日、跨年、起=訖、缺值）
- [x] 4.4 Fix 4：DateRangeSheet 起訖受控輸入 + 狀態機（雙合法切 custom、preset 清空、重開保留回填、disable 規則、起>訖 錯誤文案）
- [x] 4.5 Fix 4：pill custom 顯示「期間：M/D–M/D」；兩個 filterByPreset 呼叫點同步

## 5. 驗證

- [x] 5.1 `pnpm -r typecheck` / `pnpm -r lint` / `pnpm exec prettier --check .` 全綠
- [x] 5.2 `pnpm --filter @assetanchor/mobile test` 綠（dateRange 純函式）
- [x] 5.3 **視覺對圖（ADR-0008，owner gate）**：iOS Simulator 六項逐一驗證 + 前後對照截圖——(1) 兩表單空送出全繁中 (2) 填值後錯誤即時消失 (3) 詳情/清單/預估同額（QQQ 5,124.00）(4) 自訂區間過濾生效+重開保留 (5) hero「持股市值」+不含現金 (6) 返回鈕「交易紀錄」

## 6. 交付

- [x] 6.1 Conventional Commits（scope 依檔案：shared / mobile / docs）、push `fix/visual-audit-p0p1`
- [x] 6.2 `gh pr create`——PR 置頂明示 P1-4 設計仲裁為 owner 拍板項（含 fallback）；**owner 本人 merge，AI 不 merge**
- [x] 6.3 archive OpenSpec change（PR 開出後即 archive，不等 merge）
