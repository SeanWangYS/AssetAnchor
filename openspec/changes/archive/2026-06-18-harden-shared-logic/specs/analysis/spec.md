## ADDED Requirements

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
