# analysis Specification

## Purpose

TBD - created by archiving change align-to-design-package. Update Purpose after archive.

## Requirements

### Requirement: 分析頁版型

分析 tab SHALL 為單頁垂直捲動，由上而下：hero（關鍵彙總）+ 5 張圖表卡（資產配置 donut、市值 vs 成本 雙柱、報酬率 橫條、未實現損益 橫條、市值佔比 橫條）。圖表 SHALL 以 react-native-svg 自繪，SHALL NOT 引第三方圖表庫。本頁為靜態呈現、無逐項 drill-down。

#### Scenario: 進入分析頁

- **WHEN** 使用者切到分析 tab
- **THEN** 顯示 hero + 5 圖表卡的單頁捲動，無逐項點擊下鑽

### Requirement: 分析頁 TWD/USD 全頁切換

分析頁 SHALL 提供 TWD/USD 全頁 segmented 切換，內部以 TWD 為基準、依最新匯率換算顯示（demo 1 USD = 30.95 TWD），**預設值取自使用者顯示幣別偏好 `preferred_display_currency`（缺值 fallback TWD）**。切換為使用者主動操作，於頁內覆寫不寫回偏好。

#### Scenario: 切換為 USD

- **WHEN** 使用者在分析頁切到 USD
- **THEN** 全頁數值即時以最新匯率換算為 USD 顯示

#### Scenario: 預設取自顯示幣別偏好

- **WHEN** 使用者顯示幣別偏好為 USD 並開啟分析頁
- **THEN** 全頁切換 SHALL 預設停在 USD（偏好為 TWD 或缺值時預設 TWD）

### Requirement: 圓餅維度為資產類別

資產配置 donut 的維度 SHALL 為資產類別（個股 / ETF）：個股用 accent `#7C6CF0`、ETF 用 `#35C6EA`；SHALL NOT 用「每標的佔比」作為圓餅維度（每標的佔比移至橫條卡）。

#### Scenario: 配置 donut 顯示類別

- **WHEN** 顯示資產配置 donut
- **THEN** 以資產類別分段（個股 / ETF），非逐標的

### Requirement: 重新整理回饋

分析頁 refresh 圓鈕 SHALL 觸發資料重整並以 toast 回饋（MVP 為 demo toast）。

#### Scenario: 點 refresh

- **WHEN** 使用者點分析頁 refresh 圓鈕
- **THEN** 顯示「報價已更新（demo）」之類 toast

### Requirement: 分析聚合為可測 shared 純函式

分析頁的持倉聚合（整體 totals、依資產類別 rollup、報酬率）SHALL 由 `packages/shared` 的純函式提供，與資料來源（mock / 真實）解耦：輸入一組原幣別 raw holdings + 匯率表 + 基準幣別，輸出 TWD 基準的 totals 與 byClass rollup。此函式 MUST 無 IO、MUST 有單元測試並納入 shared coverage gate。跨幣別合計 MUST 用 `convertMoney`（最新匯率即時換算，ADR-0005），金額全程 `Money`。

#### Scenario: 聚合 totals 與類別佔比

- **WHEN** 以一組混幣別 raw holdings + 匯率表呼叫聚合函式
- **THEN** 回傳 TWD 基準的總市值/總成本/未實現損益/報酬率，及各資產類別（個股/ETF）的市值與佔總市值百分比

#### Scenario: 報酬率防零除

- **WHEN** 某聚合的成本為 0
- **THEN** 報酬率回傳 0（不丟例外）

#### Scenario: 行為與重構前一致

- **WHEN** 以原 mock holdings + demo 匯率呼叫
- **THEN** 聚合結果（totals / byClass）與重構前 feature-local 版本數值一致
