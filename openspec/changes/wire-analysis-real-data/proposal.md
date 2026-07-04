# Proposal: wire-analysis-real-data

## Why

分析頁目前吃寫死 mock（`apps/mobile/src/features/analysis/analysisData.ts` 的 `RAW_HOLDINGS`），無論使用者實際持倉為何永遠顯示同一組假數字，無法對真資料驗證（2026-06-18 視覺驗證發現，product-backlog「報價/資料真值」段）。前置條件已全部 ship：報價真值（`resilient-quote-display` + `add-quote-batch-discovery`）、聚合純函式（shared `aggregateHoldings`）、持倉真值（shared `deriveHoldings`）。現在是把分析頁接上真實資料的正確時機（planning §3 分析屬第二階段功能、設計已先行定稿於 `docs/design/analysis-page/analysis-page-spec.md`）。

## What Changes

- 分析頁的資料來源由 mock `RAW_HOLDINGS` 改為**真實持倉 × 真實報價**：
  - 持倉：由 transactions（Firestore onSnapshot store）經 shared `deriveHoldings` 推導（零新增 I/O，同 holdings 慣例）。
  - 市值：每檔 = 報價現價 × 股數（`Money` 運算），報價走既有 `services/quotes` 雙層 cache（ADR-0006）。
  - 名稱／資產類別：沿用 `services/symbols`（名稱 enrich）與交易的 `asset_type`。
- 新增 shared 純函式 `buildAnalysisInput`：把 `Position[]` + 報價 resolver + 標的 metadata resolver 映射成 `AnalysisRawHolding[]`，並回報 `includedCount / pendingCount / anyStale`（部分渲染語意，對齊 `computeHoldingsHero`）。TDD、納入 coverage gate。
- 報價降級行為對齊持倉頁（resilient-quote-display 慣例）：
  - 缺報價的持倉排除於聚合並計入「N 檔報價更新中」揭露，不顯示假值。
  - 全部缺報價時 hero 顯示「報價載入中…」+ 重試。
  - 含過期報價時仍納入市值但揭露「部分為最後已知報價（延遲）」。
- Header 刷新圓鈕由 demo toast 改為**真的 force 刷新報價**（`loadFor({force:true})`）+ toast「報價已更新」。
- Hero 註腳的匯率由寫死「1 USD = 30.95」改為顯示最新 `exchange_rates` 實際匯率（未就緒退 demo 值）。
- 空／載入／錯誤態：無持倉顯示 EmptyState、交易載入中顯示 LoadingView、載入失敗顯示 ErrorState（沿用 core/ui 與持倉頁同款元件）。
- 移除 `analysisData.ts` 的 `RAW_HOLDINGS` mock 與 mock-only 註解；保留顯示格式化 helpers 與 demo 匯率 fallback。

## Capabilities

### New Capabilities

（無——本 change 全部落在既有 `analysis` capability 的需求變更。）

### Modified Capabilities

- `analysis`：
  - 新增「分析頁以真實持倉與報價聚合」需求（資料來源 mock → 真值；含 `buildAnalysisInput` shared 純函式契約）。
  - 新增「分析頁報價降級顯示」需求（缺報價排除+揭露、全缺載入態、過期揭露，對齊 live-quotes 部分渲染慣例）。
  - 修改「重新整理回饋」需求：demo toast → 真實 force 刷新 + toast。
  - 修改「分析頁 TWD/USD 全頁切換」需求的匯率註腳描述：demo 固定值 → 最新牌告匯率（未就緒 fallback demo）。

## Impact

- **apps/mobile**（主要）：
  - `features/analysis/screens/AnalysisOverviewScreen.tsx` — 接 transactions/quotes/symbols/rates 四個資料源、降級態、force 刷新。
  - `features/analysis/analysisData.ts` — 移除 mock、瘦身為格式化 + demo 匯率 fallback。
  - 依賴新增：`services/quotes`、`services/symbols`（既有 service，方向合法 features → services）；transactions 資料源沿用 codebase 既有「跨 feature 讀 zustand store」慣例（同 holdings/accounts，見 design.md 決策）。
- **packages/shared**：`analysis/` 新增 `buildAnalysisInput` 純函式 + 測試（coverage gate 90% 維持）。
- **無 schema 變更**（不碰 Firestore 聖牛）、無 functions 變更、無導航變更。
- 風險：分析頁在報價未就緒時的視覺與 mock 時代不同（多了降級態）——屬設計對齊範圍，視覺對圖由 owner 批次驗收。

## Non-goals

- 年化報酬率圖（design spec §7 待第二階段演算法，D4 已延後）。
- 圖表 drill-down／點擊互動（design D8：靜態為主）。
- 產業／帳戶等更多配置維度（本版僅資產類別，design spec §7）。
- 標的 >10 檔的 Top N 收合（design spec §7 開放問題）。
- MMKV 本機報價持久層（報價 roadmap 層 3，另案 `add-mmkv-quote-cache`）。
- 現金餘額納入分析（hero 註腳維持「不含現金」）。
- 資產走勢歷史序列（分析頁無走勢圖；持倉頁走勢仍為 demo，另案）。
