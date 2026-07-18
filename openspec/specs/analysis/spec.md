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

分析頁 SHALL 提供 TWD/USD 全頁 segmented 切換，內部以 TWD 為基準、依最新 `exchange_rates` 換算顯示（未就緒 fallback demo 匯率 1 USD = 30.95），**預設值取自使用者顯示幣別偏好 `preferred_display_currency`（缺值 fallback TWD）**。切換為使用者主動操作，於頁內覆寫不寫回偏好。hero 註腳 SHALL 顯示實際使用中的 USD/TWD 匯率值（非寫死示意值）。

#### Scenario: 切換為 USD

- **WHEN** 使用者在分析頁切到 USD
- **THEN** 全頁數值即時以最新匯率換算為 USD 顯示

#### Scenario: 預設取自顯示幣別偏好

- **WHEN** 使用者顯示幣別偏好為 USD 並開啟分析頁
- **THEN** 全頁切換 SHALL 預設停在 USD（偏好為 TWD 或缺值時預設 TWD）

#### Scenario: 註腳顯示實際匯率

- **WHEN** 最新 `exchange_rates` 的 USD_TWD 為 32.10
- **THEN** hero 註腳顯示「匯率 1 USD = 32.1」（未就緒時顯示 demo 值 30.95）

### Requirement: 重新整理回饋

分析頁 SHALL NOT 顯示 header 刷新圓鈕（owner 2026-07-04 視覺對圖拍板移除：進頁即以最新持倉+報價重算、focus 依 TTL 自動刷新已涵蓋，按鈕增量價值低）。報價全缺降級態的「重試」SHALL 保留**真實報價強制刷新**（略過新鮮判定的批次 loadFor）並以 toast「報價已更新」回饋；刷新完成後聚合數字隨新報價重算。

#### Scenario: 降級態點重試

- **WHEN** 分析頁處於「報價載入中…」降級態，使用者點「重試」
- **THEN** 對目前持倉 targets 強制刷新報價，顯示「報價已更新」toast，數字以新報價重算

### Requirement: 分析聚合為可測 shared 純函式

分析頁的持倉聚合（整體 totals、依資產類型 rollup、報酬率）SHALL 由 `packages/shared` 的純函式提供，與資料來源（mock / 真實）解耦：輸入一組原幣別 raw holdings + 匯率表 + 基準幣別，輸出 TWD 基準的 totals 與 `byAssetType` rollup。`byAssetType` SHALL 逐一列舉 `ASSET_TYPES`（enum 驅動），每個資產類型一筆 rollup（未持有者 count 0）。此函式 MUST 無 IO、MUST 有單元測試並納入 shared coverage gate。跨幣別合計 MUST 用 `convertMoney`（最新匯率即時換算，ADR-0005），金額全程 `Money`。

#### Scenario: 聚合 totals 與資產類型佔比

- **WHEN** 以一組混幣別 raw holdings + 匯率表呼叫聚合函式
- **THEN** 回傳 TWD 基準的總市值/總成本/未實現損益/報酬率，及 `byAssetType`（涵蓋每個 `ASSET_TYPES` 成員）的市值與佔總市值百分比

#### Scenario: 加密貨幣自成一類不併入個股

- **WHEN** raw holdings 含 `assetType = 'CRYPTO'` 的持倉
- **THEN** `byAssetType` 的 CRYPTO rollup 計入該持倉市值，STOCK rollup SHALL NOT 含 crypto 市值

#### Scenario: byAssetType 為 enum 驅動

- **WHEN** 呼叫聚合函式
- **THEN** `byAssetType` 的 `assetType` 序列 SHALL 等於 `ASSET_TYPES`（每個 enum 成員一筆，未持有者 count 0）

#### Scenario: 報酬率防零除

- **WHEN** 某聚合的成本為 0
- **THEN** 報酬率回傳 0（不丟例外）

#### Scenario: 行為與重構前一致

- **WHEN** 以原 mock holdings + demo 匯率呼叫
- **THEN** 既有個股 / ETF 分類的市值與佔比與重構前數值一致（無回歸）

### Requirement: 分析頁以真實持倉與報價聚合

分析頁的 hero 與五張圖卡 SHALL 以**真實資料**計算：持倉由 transactions 經 shared `deriveHoldings` 推導（零新增 Firestore 監聽），每檔市值 = 報價現價 × 股數（原幣別、全程 `Money`，ADR-0005），成本 = `Position.totalCost`；SHALL NOT 使用寫死的 mock holdings。標的名稱 SHALL 沿用 symbols metadata（缺值 fallback raw ticker）；資產類別（個股/ETF）SHALL 取自交易的 `asset_type`。報價 SHALL 走既有 quotes 雙層 cache（ADR-0006），與持倉頁共用，並沿用「targets 變動載入 + 分頁 focus/回前景檢查新鮮度」的載入時機。

`Position[]` × 報價 → `AnalysisRawHolding[]` 的映射 SHALL 為 `packages/shared` 純函式 `buildAnalysisInput`（報價與 metadata 以 resolver 注入、無 I/O、有單元測試並納入 coverage gate），輸出並包含 `includedCount`（有報價已納入）、`pendingCount`（缺報價已排除）、`anyStale`（任一納入者過期）。

#### Scenario: 有持倉且報價齊全

- **WHEN** 使用者有真實持倉且全部標的報價可用（新鮮）
- **THEN** hero 顯示以現價計算的持股市值/未實現損益/報酬率，五張圖卡以同一組真實聚合資料渲染（TWD 內部基準、顯示時換算）

#### Scenario: buildAnalysisInput 映射市值

- **WHEN** 以一組 `Position` 與報價 resolver 呼叫 `buildAnalysisInput`
- **THEN** 每檔輸出 `value = price × quantity`、`cost = totalCost`（皆原幣別 10 位小數 string），幣別/代號/名稱/類別對應正確

#### Scenario: 無持倉

- **WHEN** 使用者尚無任何持倉（無交易或全數賣出）
- **THEN** 分析頁顯示空態（「尚無持倉」，導引到交易頁），不渲染 hero 與圖卡

#### Scenario: 交易載入中與載入失敗

- **WHEN** transactions 首次載入中（尚無資料）或監聽失敗
- **THEN** 分別顯示載入中畫面與錯誤畫面（與持倉頁同款元件）

### Requirement: 分析頁報價降級顯示

分析頁 SHALL 對齊持倉頁的報價降級慣例（live-quotes 部分渲染）：缺報價的持倉 SHALL 排除於聚合並揭露「N 檔報價更新中」（SHALL NOT 以假值或 0 充數）；過期報價 SHALL 仍納入市值但揭露「部分為最後已知報價（延遲）」；揭露列 SHALL 附「重試」可強制刷新。當有持倉但全部缺報價（`includedCount === 0`）時，SHALL 顯示「報價載入中…」與重試，不渲染圖卡。

#### Scenario: 部分標的缺報價

- **WHEN** 7 檔持倉中 2 檔暫無可用報價
- **THEN** hero 與圖卡以其餘 5 檔聚合渲染，hero 下方揭露「2 檔報價更新中」+ 重試

#### Scenario: 全部標的缺報價

- **WHEN** 所有持倉皆無可用報價（含冷啟動尚未回填）
- **THEN** 顯示「報價載入中…」與重試按鈕，不渲染聚合圖卡

#### Scenario: 含過期報價

- **WHEN** 任一納入聚合的標的報價已超過新鮮 TTL
- **THEN** 該標的仍以最後已知價納入市值，並揭露「部分為最後已知報價（延遲）」

### Requirement: 圓餅維度為資產類型

資產配置 donut 的維度 SHALL 為**資產類型**（`asset_type`），且 **enum 驅動**：切片集合 SHALL 由 `ASSET_TYPES` enum 派生（與交易表單的資產類型選項同源），使用者持有某資產類型即該類型成為獨立切片＋圖例列；未持有的類型 SHALL NOT 顯示（依 `count > 0` 過濾）。**在 `asset_type` enum 新增一個類型時，圓餅圖 SHALL 自動多一個切片並自動取得一個顏色，無需修改聚合或配色程式碼**。各切片顏色 SHALL 由資產類型於 `ASSET_TYPES` 的次序對應色盤指派（個股紫 `#7C6CF0`、ETF 青 `#35C6EA`、加密貨幣 amber `#F5A623`、其後債券/基金/其他及預留色）。顯示標籤 SHALL 取自交易表單與圓餅圖共用的單一事實來源（繁中：個股/ETF/加密貨幣/債券/基金/其他）。圖卡右上角字串 SHALL 用「資產類型」（不用「資產類別」）。crypto 市值 SHALL NOT 被併入個股切片。SHALL NOT 用「每標的佔比」作為圓餅維度（每標的佔比移至橫條卡）。

#### Scenario: 配置 donut 以資產類型分段

- **WHEN** 顯示資產配置 donut
- **THEN** 以資產類型分段（個股 / ETF / 加密貨幣 / …持有的類型），非逐標的；圖卡右上角顯示「依資產類型」

#### Scenario: 持有加密貨幣時顯示獨立切片

- **WHEN** 使用者同時持有個股、ETF 與加密貨幣（`asset_type = 'CRYPTO'`）且皆有報價
- **THEN** donut SHALL 呈現三個切片（個股紫、ETF 青、加密貨幣 amber），加密貨幣有獨立圖例列與佔比，且其市值 SHALL NOT 被計入個股切片

#### Scenario: 未持有某類型不顯示空切片

- **WHEN** 使用者僅持有個股與 ETF
- **THEN** donut 僅顯示個股與 ETF 兩切片，SHALL NOT 出現空的加密貨幣（或其他未持有類型）切片或圖例列

#### Scenario: 新增資產類型自動同步（enum 驅動）

- **WHEN** 未來在 `ASSET_TYPES` enum 新增一個資產類型且使用者持有該類型
- **THEN** 圓餅圖 SHALL 自動多一個對應切片並自動取得一個顏色，無需修改聚合邏輯或配色碼（僅需在共用標籤來源補該類型的顯示標籤）

### Requirement: 佔比顯示加總恆為 100%

分析頁同一分配（資產配置圖例、持股佔比卡）內顯示的百分比 SHALL 經 largest-remainder 法分配，使顯示值加總恆為 100.0%；同一標的在同一畫面的佔比顯示 SHALL 彼此一致。報酬率百分比精度 SHALL 與全 app 政策一致（2 位小數）。

#### Scenario: 圖例加總不再 99.9%

- **WHEN** 資產配置四類佔比原始值四捨五入後合計 99.9% 或 100.1%
- **THEN** 顯示值 SHALL 經分配調整為恰好合計 100.0%

#### Scenario: 報酬率精度與持倉頁一致

- **WHEN** 同一時刻持倉頁與分析頁顯示總報酬率
- **THEN** 兩頁 SHALL 皆為 2 位小數（如 +105.84%），SHALL NOT 一頁 2 位一頁 1 位
