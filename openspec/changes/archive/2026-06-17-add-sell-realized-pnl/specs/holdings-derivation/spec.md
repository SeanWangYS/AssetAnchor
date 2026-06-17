## MODIFIED Requirements

### Requirement: 從交易事件流動態推導持倉

`packages/shared` SHALL 提供純函式 `deriveHoldings(transactions)`，從 `TransactionDocument[]` 動態推導持倉，**不**讀寫任何 holdings collection（ADR-0004）。聚合粒度 SHALL 為 `(market, symbol)`（跨帳戶合併）。本函式 SHALL 處理 `BUY` 與 `SELL`，並依 `transaction_date` **時序**處理（非陣列順序）：

- BUY：股數累加、`totalCost` 累加（`total+fee+tax`）。
- SELL：股數遞減、**平均成本不變**（加權平均特性）、`totalCost` 依 `avgCost × soldQty` 等比遞減。
- 全數賣出後股數與 `totalCost` 歸零；後續 BUY 視為**新持有週期**（§4：平均成本重算、不累加歷史）。
- **超賣**（soldQty > 當下持有）為資料異常 → SHALL fail loud（擲錯），不得產生負股數（ADR-0007）。

#### Scenario: 多筆買入聚合為單一 position

- **WHEN** 同一 `(market, symbol)` 有多筆 BUY（可分屬不同 `account_id`）
- **THEN** 回傳一筆 position，`quantity` 為各筆之和

#### Scenario: 部分賣出減股數、均價不變

- **WHEN** 持有 2500 股、均價 550.76，賣出 1000 股
- **THEN** 剩餘 `quantity="1500.0000000000"`、`averageCost` 仍為 `"550.7600000000"`、`totalCost = averageCost × 1500`

#### Scenario: 全部賣出後重買為新週期

- **WHEN** 買 1000@500 → 全賣 1000@600 → 再買 500@550
- **THEN** 賣出後持倉歸零；重買後 `averageCost="550.0000000000"`（不累加歷史成本）

#### Scenario: 全數賣出且未重買 → 不在持倉清單

- **WHEN** 買 1000@500 → 全賣 1000@600（無後續買入）
- **THEN** `deriveHoldings` SHALL **不**回傳該 `(market, symbol)`（qty=0 非當前持倉）；其已實現損益仍由 `deriveRealizedEvents` 提供

#### Scenario: 超賣 fail loud

- **WHEN** 某 `(market, symbol)` 的 SELL 股數大於當下持有股數
- **THEN** `deriveHoldings` SHALL 擲錯（資料異常），不得回傳負股數或靜默吞掉

#### Scenario: 無交易時回傳空集合

- **WHEN** `transactions` 為空陣列
- **THEN** 回傳空陣列（非 null、非錯誤）

### Requirement: Position 資料形狀（跨畫面共用契約）

`deriveHoldings` 回傳的每筆 position SHALL 含：`market`、`symbol`、`currency`、`quantity`、`totalCost`、`averageCost`（皆 10 位小數 string）、`txCount`（number），以及 `realizedPnl`（該 `(market, symbol)` **全期已實現損益**，原幣別 10 位小數 string；無賣出則為 `"0.0000000000"`）。此型別 SHALL 由 `packages/shared` 匯出。

#### Scenario: 欄位完整且型別正確

- **WHEN** 對任一筆聚合結果檢視
- **THEN** 上述欄位皆存在；金額/數量為 `Money.toDecimalString()` 格式；無賣出之 position 其 `realizedPnl="0.0000000000"`

#### Scenario: 混幣別防護

- **WHEN** 同一 `(market, symbol)` 出現不同 `currency` 的交易
- **THEN** 函式 SHALL fail loud（CurrencyMismatchError 或等價），不得靜默混算

## ADDED Requirements

### Requirement: 已實現損益推導（SELL，§4）

`packages/shared` SHALL 提供純函式，從交易事件流（時序）推導每筆 SELL 的已實現損益：`realized = (total − fee − tax) − averageCost × soldQty`，其中 `averageCost` 為**該筆賣出當下**的加權平均成本。輸出 SHALL 為已實現事件清單（含 `market`、`symbol`、`currency`、`transaction_date`、`realized` 10 位小數 string），供 per-symbol 加總（`Position.realizedPnl`）與時間區間 / 跨幣別合計（顯示層）使用。所有運算 SHALL 用 `Money`（decimal.js）。

#### Scenario: §4 已實現損益公式

- **WHEN** 持有均價 550.76、賣出 1000 股 @600、賣出手續費 855、稅 0
- **THEN** 該筆 `realized = (600×1000 − 855 − 0) − 550.76×1000 = "48385.0000000000"`（以 Money 精算）

#### Scenario: 零手續費賣出

- **WHEN** SELL 的 `fee="0"`、`tax="0"`
- **THEN** `realized = total − averageCost × soldQty`，無特殊處理

#### Scenario: 多次賣出累加

- **WHEN** 同一 symbol 有多筆 SELL
- **THEN** `Position.realizedPnl` 為各筆 realized 之和（同幣別 Money 相加）
