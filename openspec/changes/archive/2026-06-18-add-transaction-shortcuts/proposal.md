## Why

MVP §3「智慧化輔助」兩項收尾：**股票代號自動補完**（從使用者歷史）與**「複製上一筆」快捷**。交易表單的代號欄 placeholder 早已寫「輸入或**搜尋**（例：2330, AAPL）」，但 autocomplete 從未實作；重複記錄同一標的時也需逐欄重打。兩者皆降低輸入摩擦、屬 MVP 必備 smart-assist。

## What Changes

- **代號自動補完**：交易表單代號欄輸入時，依使用者交易歷史（distinct `(market, symbol)`）以前綴比對顯示建議；點選建議**一併帶入** `symbol` + `market` + `asset_type` + `currency`（取自該標的最近一筆交易），減少逐欄填寫。
- **複製上一筆**：新增交易（非編輯）時，若已有交易，表單上方提供「複製上一筆」快捷，點擊以最近一筆交易的值預填表單（交易日期重設為今天、股數/備註留空待填）。
- **無 schema 變更、無新相依**；資料源＝既有 `transactionsStore`（交易歷史）。

## Capabilities

### New Capabilities

<!-- 無 -->

### Modified Capabilities

- `transaction-entry`: 交易表單新增「代號自動補完（依歷史）」與「複製上一筆」兩項輸入輔助（不改寫入/驗證語意，僅預填/建議）。

## Impact

- **修改**：`apps/mobile/src/features/transactions/components/TransactionForm.tsx`（代號欄加建議下拉 + `setValue` 連動帶入）、`apps/mobile/src/features/transactions/screens/AddTransactionScreen.tsx`（複製上一筆快捷 + 以 last tx 預填）。
- **無** schema / 相依 / Money 精度牽動；驗證仍走既有 zod resolver。
- **Gate（不擋 loop）**：帶 UI → Sprint 尾批次視覺對圖。

## Non-goals

- **不**接 `symbols` collection 作為補完第二來源（§3 提及，但 MVP 先用交易歷史；symbols 全集查詢屬後續）。
- **不**做完整 searchable modal picker（backlog UI 過渡件升級）；本 change 為輕量 inline 建議。
- **不**改交易寫入 / 驗證 / 超賣 gate 邏輯。
