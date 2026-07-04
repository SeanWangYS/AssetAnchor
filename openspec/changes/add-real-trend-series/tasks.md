# Tasks: add-real-trend-series

## 1. Shared 型別與序列純函式（TDD）

- [x] 1.1 `PriceHistoryDocument` type + zod schema + `HistoryMarket` 型別（shared/types、schemas；不動 `Market` enum）
- [x] 1.2 先測後寫 `forwardFillSeries`（null bar、缺日、首值即 null 等邊界）
- [x] 1.3 先測後寫 `buildSymbolSeries`（年度分塊合併排序、timeframe 切片、ALL＝自最早交易日）
- [x] 1.4 先測後寫 `buildPortfolioSeries`（持股時序重建、跨幣別 FX 換算、買入前不計入、當日即時點 append、Money 全程）
- [x] 1.5 效能 sanity 測試（25 年日線 × 100 筆交易 × 10 symbols 在合理時間內）

## 2. Functions：歷史抓取與落地（TDD）

- [x] 2.1 先測後寫 `parseYahooHistory`（timestamp→YYYY-MM-DD 時區換算、null close 保留、dataGranularity 驗證、adjclose）
- [x] 2.2 `yahooProvider` 擴充 `fetchHistory(market, symbol, period1, period2)`（period1/period2、瀏覽器 UA；`toYahooSymbol` 支援 FX→`TWD=X`）
- [x] 2.3 先測後寫增量邏輯（`last_date` 判定 no-op、7 天回看視窗計算、年度分塊 upsert payload）
- [x] 2.4 `ensureHistory` onRequest 端點（items 解析、逐筆錯誤隔離、≥1s 節流 + 429 退避、回傳 `{symbolId, lastDate}`）
- [x] 2.5 `fetchIntraday` onRequest 端點（1D/1W 對應 range/interval、共用 parser、不落地）

## 3. Firestore rules

- [x] 3.1 `price_history/**` 規則（登入可讀、client 不可寫）+ rules 測試（讀成功/寫被拒）
- [x] 3.2 planning §6 增補 Collection 7（price_history 逐欄說明，對照 design.md）

## 4. Mobile：history store 與畫面接線

- [x] 4.1 `services/history/historyStore`（Firestore 年度 doc 直讀 → 立即可畫；背景 `ensureHistory` 比對 lastDate 再重讀；in-memory cache）
- [x] 4.2 `useTrendSeries(tf)` / `useSymbolSeries(market, symbol, tf)` hooks（含 earliestTxDate 計算、FX target 自動附加）
- [x] 4.3 `HoldingsOverviewScreen` 走勢圖接 `useTrendSeries`（載入/降級態、當日即時點、`toNumber()` 僅邊界）
- [x] 4.4 `AssetDetailScreen` 走勢圖接 `useSymbolSeries`（日線 tabs + `fetchIntraday` 盤中 tabs、記憶體 cache）
- [x] 4.5 移除 `DEMO_SERIES` 與相關 import

## 5. 文件與收尾

- [ ] 5.1 ADR-0010（歷史價資料架構：方案 B 決策、A/C 替代方案、Yahoo 風險與緩解、研究來源）
- [ ] 5.2 backlog 更新（高優先項移除；記 fallback provider / 分割還原 / 快取持久化為候選）
- [ ] 5.3 全套驗證：`pnpm -r typecheck`、`pnpm -r lint`、shared `test:coverage`、mobile test、rules 測試、`openspec validate`
- [ ] 5.4 Emulator（functions + firestore）端到端手動驗證：首次回補 → 開圖 → 增量 no-op → 429 模擬降級
- [ ] 5.5 iOS Simulator 視覺對圖檢查點清單（留 owner 批次驗）；開 PR（base main，不 merge、不 archive）
