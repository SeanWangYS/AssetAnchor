# Proposal: add-real-trend-series

## Why

持倉總覽與個股詳情的「資產走勢」圖目前吃寫死假折線（`holdingsDemo.ts` 的 `DEMO_SERIES`，planning §3 原將圖表延後第二階段），owner 於 2026-06-19 視覺對圖時標為**高優先：「資產走勢不可以是假資料」**。報價真值基礎已 ship（live-quotes、resilient-quote-display、quote-batch-discovery），現在補上「歷史序列」這塊最後的假資料。

## What Changes

- **新增 Firestore `price_history` collection**（聖牛 schema 變更，owner 已於 2026-07-04 拍板架構 B）：per-symbol per-year 分塊落地日線收盤序列，沿用 `quotes/` 安全模式（登入可讀、只有 Cloud Function 可寫）。匯率歷史把 Yahoo `TWD=X` 當 pseudo-symbol（`FX_USDTWD`）走同一條管線。
- **新增 functions `ensureHistory` HTTP 端點**：開圖時 lazy 觸發——查該 symbol 已落地的最後日期，只抓缺口（Yahoo v8 chart `period1/period2 + interval=1d`，7 天回看 upsert 同時修補缺洞）；lazy backfill 起點＝該 symbol 在使用者交易中的最早交易日。盤中粒度（AssetDetail 的 1D/1W）不落地、即抓即回。
- **新增 shared 純函式**：`forwardFillSeries`（null close 修補）、`buildPortfolioSeries`（交易 × 日線價 × FX 序列 → 組合市值時間序列，全程 Money）、`buildSymbolSeries`（個股序列切片）。
- **兩畫面走勢圖接真值**：HoldingsOverviewScreen（1M/3M/YTD/1Y/ALL，日線）與 AssetDetailScreen（1D/1W/1M/3M/1Y/ALL，1D/1W 盤中粒度）改吃真實序列，含載入/降級態（對齊 resilient-quote-display 慣例）；移除 `DEMO_SERIES`。
- **新增 ADR-0010（歷史價資料架構）**：記錄架構 B 決策、Yahoo 風險緩解、與否決掉的替代方案（不落地、每日組合快照）。

**已拍板的範圍決定（owner 2026-07-04）**：

1. 總覽走勢序列＝**只算證券市值**（現金無歷史，不含）。
2. FX 歷史用 **Yahoo `TWD=X`**（非 BOT 累積）。
3. 主架構＝**方案 B：Firestore 落地日線**（Ghostfolio 模式）。
4. 增量更新＝**開圖時 lazy**（無排程）。

## Capabilities

### New Capabilities

- `price-history`: 歷史日線價格資料層——Yahoo 歷史抓取（period1/period2 陷阱防護）、`price_history/{symbolId}_{year}` 落地 schema 與 rules、lazy backfill 與 7 天回看增量、FX pseudo-symbol、provider 抽象與風險緩解（節流/退避/UA）。
- `trend-charts`: 走勢圖真值顯示層——shared 序列純函式（forward-fill、組合市值重建、個股切片）、兩畫面 timeframe 對應與資料接線、載入/降級/空態行為。

### Modified Capabilities

（無——live-quotes 的即時報價需求不變；holdings-derivation 的持倉推導需求不變，本 change 僅新增消費它的序列重建。）

## Impact

- **Firestore schema（聖牛）**：新增全域 collection `price_history`（詳細欄位與三端影響評估見 design.md §Schema）；`firebase/firestore.rules` 新增對應規則 + rules 測試。既有 collection 皆不動。
- **apps/functions**：新增 `history/` 模組（ensureHistory 端點、parseYahooHistory 純函式、增量/回看邏輯）；`yahooProvider` 擴充歷史抓取（介面向下相容）。
- **packages/shared**：新增 `history/` 純函式模組（coverage gate 90% 內、TDD）。
- **apps/mobile**：新增 `services/history` store（雙層 cache：in-memory → Firestore 直讀）；改 `HoldingsOverviewScreen` / `AssetDetailScreen` 走勢圖區塊；刪 `DEMO_SERIES`。
- **文件**：ADR-0010、planning §6 schema 段補 collection 7。
- **風險**：Yahoo 429/改版（緩解：落地後圖表永遠有既有資料可畫、provider 可換、台股 fallback 候選 TWSE 官方 API 留介面不實作）；分割/除權還原失真（見 Non-goals）。

## Non-goals（MVP 邊界，對齊 planning §3 第二/三階段）

- **不含現金**的組合市值序列（現金餘額無歷史紀錄）。
- **不處理股票分割/除權還原**：市值＝持股 × 原始 close；分割會使歷史段失真（台股+ETF 為主的組合影響小），`adjclose` 一併落地備未來還原用，還原邏輯屬第二階段。
- **不做 TWR/IRR 等績效指標**、不做 benchmark 比較——本 change 只交付市值序列，落地資料為未來鋪路。
- **不做排程**（owner 已否決報價排程；歷史更新走開圖 lazy）。
- **不實作 fallback provider**（TWSE/FinMind 只留 provider 介面擴充點）。
- **不做 MMKV 持久化**（屬 `add-mmkv-quote-cache` change；本 change 的 client cache 為 in-memory + Firestore 直讀）。
