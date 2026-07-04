# trend-charts Specification

## Purpose

TBD - created by archiving change add-real-trend-series. Update Purpose after archive.

## Requirements

### Requirement: 序列純函式（shared，Money 全程）

`packages/shared` SHALL 提供純函式：`forwardFillSeries`（null/缺日補前值）、`buildSymbolSeries`（年度分塊 → 排序日線點列 + timeframe 切片）、`buildPortfolioSeries`（交易流 × 各 symbol 日線 × FX 序列 × 顯示幣別 → 組合市值時間序列）。運算全程 `Money`（禁 native number），每日持股量由交易流依 `transaction_date` 時序重建，市值 = Σ 持股(d) × close(d) × fx(d)。皆 TDD 且納入 coverage gate。

#### Scenario: 組合市值重建正確

- **WHEN** 給定 BUY/SELL 交易流與各 symbol 日線、FX 序列
- **THEN** 任一日期點的市值等於該日實際持股 × 當日（forward-fill 後）收盤 × 當日匯率之總和（Money 精度）

#### Scenario: FX null bar 被 forward-fill

- **WHEN** FX 序列某日 close 為 null
- **THEN** 該日換算使用前一個非 null 收盤，序列不中斷

#### Scenario: 買入日之前不計入

- **WHEN** 某 symbol 首筆 BUY 在日期 d
- **THEN** 序列中 d 之前的日期不含該 symbol 的市值貢獻

### Requirement: 持倉總覽走勢圖接真實序列

`HoldingsOverviewScreen` 的走勢圖 SHALL 以 `buildPortfolioSeries` 之真實序列取代 `DEMO_SERIES`（`DEMO_SERIES` SHALL 移除）：範圍＝**證券市值**（不含現金）、顯示幣別＝使用者偏好幣別；tabs `1M/3M/YTD/1Y` 為日線切片、`ALL` 自全域最早交易日起；序列末端 SHALL append 當日即時點（`quotesStore` 現價 fresh 時）。`toNumber()` 只得在餵入 `Chart` 的邊界使用。

#### Scenario: timeframe 切換

- **WHEN** 使用者切換 `1M/3M/YTD/1Y/ALL` tabs
- **THEN** 圖表顯示對應範圍的真實市值序列，無假資料

#### Scenario: 今日即時點

- **WHEN** 當日有 fresh 報價
- **THEN** 序列最後一點為以現價計算的今日市值

### Requirement: 個股詳情走勢圖接真實序列

`AssetDetailScreen` 的走勢圖 SHALL 接該 symbol 的真實價格序列（原幣別）：`1M/3M/1Y` 為日線切片、`ALL` 自該 symbol 最早交易日起、`1D/1W` 用 `fetchIntraday` 盤中點列（mobile 記憶體 cache）。

#### Scenario: 日線 tabs

- **WHEN** 使用者在 AssetDetail 切到 `1M`
- **THEN** 圖表顯示該 symbol 最近一個月的真實日線收盤序列

#### Scenario: 盤中 tabs

- **WHEN** 使用者切到 `1D`
- **THEN** 圖表顯示當日 5 分鐘粒度真實點列（即抓即回）

### Requirement: 走勢圖載入與降級態

走勢圖 SHALL 對齊 resilient-quote-display 慣例：完全無資料時顯示載入態（不畫假線）；有已落地資料時 SHALL 先畫再背景刷新（stale-while-revalidate）；刷新失敗 SHALL 保留既有序列不清空，且不阻斷畫面其他區塊。

#### Scenario: 首次開圖（無落地資料）

- **WHEN** symbol 尚無 `price_history` 資料且回補進行中
- **THEN** 走勢圖區顯示載入態，畫面其餘區塊（hero/列表）正常顯示

#### Scenario: 增量失敗降級

- **WHEN** `ensureHistory` 失敗（如 Yahoo 429）但本地已有落地序列
- **THEN** 圖表以既有序列照常顯示，不清空、不白屏
