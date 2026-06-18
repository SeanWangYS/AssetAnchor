## 1. 代號自動補完（TransactionForm）

- [x] 1.1 `deriveSymbolSuggestions(transactions)`：distinct `(market, symbol)` + 各標的「最近一筆」的 `asset_type`/`currency`（max transaction_date，不假設排序）
- [x] 1.2 代號 Controller 下方 inline 建議列（前綴比對、不分大小寫、上限 5；查無/空/完全相符不顯示）
- [x] 1.3 選取建議用 `setValue(..., {shouldValidate:true})` 連動帶入 `symbol`/`market`/`asset_type`/`currency`

## 2. 複製上一筆（AddTransactionScreen）

- [x] 2.1 新增模式 + 有交易時，表單上方「複製上一筆（<symbol>）」chip（編輯/無交易不顯示）
- [x] 2.2 點擊以 `mostRecent` 映射 defaults（date→今天、quantity/notes 清空），遞增 `key` 重掛 TransactionForm 套用

## 3. Definition of Done

- [x] 3.1 `pnpm -r typecheck` / `lint` / `format:check` 全綠
- [x] 3.2 commit 累積到 feature/sprint7-harden-finish（screen-wiring 由 transactions-scoped sub-agent 產出）
- [ ] 🛑 3.3 視覺對圖：留 Sprint 尾一次 owner 驗收（建議列版面 / 快捷位置）
