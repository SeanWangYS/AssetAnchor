## Context

交易表單 `TransactionForm` 用 react-hook-form（`defaultValues` 於 mount 讀 `initialValues`）；代號欄為受控 `Input`（placeholder 已寫「輸入或搜尋」）。`AddTransactionScreen` 持有 `allTransactions`（transactionsStore）。兩項輔助皆消費既有交易歷史，無 schema/相依變更。

## Goals / Non-Goals

**Goals:** 代號依歷史 inline 自動補完（連動帶入相關欄位）；複製上一筆預填。降低輸入摩擦。

**Non-Goals:** symbols 全集補完、完整 searchable modal picker、改寫入/驗證語意。

## Decisions

### D1：autocomplete = inline 建議下拉（消費 `transactions` prop）

`TransactionForm` 已收 `transactions` prop。從中算 distinct `(market, symbol)` + 各自最近一筆的 `asset_type`/`currency`。代號 Controller 下方渲染建議列（前綴比對、上限數筆）；選取用 react-hook-form `setValue` 連動設 `symbol`/`market`/`asset_type`/`currency`。

- _Alternative_：底部 Sheet picker。否決——本 change 走輕量 inline（完整 picker 屬 backlog）。

### D2：複製上一筆 = 以 last tx 預填 + `key` 重掛表單

`AddTransactionScreen`（新增模式、`allTransactions` 非空）渲染「複製上一筆」快捷。點擊以最近一筆（`allTransactions[0]`，store 已 desc 排序）映射成 `TransactionFormDefaults`（沿用既有 `toFormDefaults`，但 date→今天、quantity/notes 清空），存入 state；以變動的 `key` 重掛 `TransactionForm` 套用新 `defaultValues`（避免改動 TransactionForm 對外 API）。

- _Alternative_：暴露 RHF `reset()`。否決——`key` 重掛較不動 TransactionForm 介面、風險低。

## Risks / Trade-offs

- **建議下拉與鍵盤/版面重疊**：建議列限高 + 數筆上限；置於代號欄下方、不蓋其他欄位。視覺對圖時確認。
- **重掛丟失已填內容**：複製上一筆是明確使用者動作（點擊才觸發），且用於「開始一筆新交易」，可接受。

## Migration Plan

無資料/schema 遷移。純前端輸入輔助。Rollback＝移除建議列與快捷。
