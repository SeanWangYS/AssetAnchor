## RENAMED Requirements

- FROM: `### Requirement: 圓餅維度為資產類別`
- TO: `### Requirement: 圓餅維度為資產類型`

## MODIFIED Requirements

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
