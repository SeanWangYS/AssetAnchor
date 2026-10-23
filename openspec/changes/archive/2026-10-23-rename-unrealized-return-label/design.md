## Context

`HoldingsOverviewScreen` bento 第 1 格顯示 `hero.returnPct`（`services/valuation` 的 `unrealized / cost × 100`），第 4 格顯示 `usePortfolioReturn`（`shared/returns` 的 XIRR 或累積報酬）。兩者口徑不同：

|            | 第 1 格    | 第 4 格              |
| ---------- | ---------- | -------------------- |
| 範圍       | 持有中部位 | 全部交易（含已賣出） |
| 已實現損益 | 不含       | 含                   |
| 跨幣別成本 | 最新匯率   | 交易日歷史匯率       |

## Goals / Non-Goals

**Goals:** 標題正確反映第 1 格口徑，消除「兩個數字該相等」的誤解。

**Non-Goals:** 不改公式、不加副標說明（owner 選 A 未選 B）、不動分析頁。

## Decisions

- **D1 標題用「未實現報酬率」**：與相鄰「總未實現損益」同一口徑、用語一致；不用「持股報酬率」（無法表達不含已實現）。
- **D2 設計包一併改**（ADR-0008：設計包為 UI 最高權威）：owner 已拍板此文字變更，同步改 spec 與原型標籤，避免下次對圖時設計與實作衝突。

## Risks / Trade-offs

- 「未實現報酬率」5 字較原 4 字長 → 卡寬約 170pt、標題 13px，iOS Simulator 對圖確認不換行。
