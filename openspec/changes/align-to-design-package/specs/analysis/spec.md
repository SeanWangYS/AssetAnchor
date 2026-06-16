## ADDED Requirements

### Requirement: 分析頁版型

分析 tab SHALL 為單頁垂直捲動，由上而下：hero（關鍵彙總）+ 5 張圖表卡（資產配置 donut、市值 vs 成本 雙柱、報酬率 橫條、未實現損益 橫條、市值佔比 橫條）。圖表 SHALL 以 react-native-svg 自繪，SHALL NOT 引第三方圖表庫。本頁為靜態呈現、無逐項 drill-down。

#### Scenario: 進入分析頁

- **WHEN** 使用者切到分析 tab
- **THEN** 顯示 hero + 5 圖表卡的單頁捲動，無逐項點擊下鑽

### Requirement: 分析頁 TWD/USD 全頁切換

分析頁 SHALL 提供 TWD/USD 全頁 segmented 切換，內部以 TWD 為基準、依最新匯率換算顯示（demo 1 USD = 30.95 TWD），預設 TWD。

#### Scenario: 切換為 USD

- **WHEN** 使用者在分析頁切到 USD
- **THEN** 全頁數值即時以最新匯率換算為 USD 顯示

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
