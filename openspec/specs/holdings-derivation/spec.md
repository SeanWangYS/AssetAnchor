# holdings-derivation Specification

## Purpose

從交易事件流動態推導持倉（不存 holdings collection，ADR-0004）：`(market, symbol)` 跨帳戶聚合、加權平均成本（§4 公式，fee + tax 計入成本基礎）、持倉清單檢視（依市場分組、原幣別成本小計）、個股明細與對帳 timeline。對應 Sprint 3 Change 2（讀取/計算路徑）。市值/損益（需報價，Sprint 5）、跨幣別合計（需匯率，Sprint 4）、SELL 與持有週期（Sprint 5）為後續範圍。

> 來源：docs/portfolio_tracker_planning.md §3（持倉檢視）、§4（報酬計算/加權平均）、§6（Collection 3 transactions schema）、§13.2（Sprint 3）；
> 實作紀錄：openspec/changes/archive/2026-06-13-add-holdings-derivation/（proposal / design / tasks）、docs/adr/0004-event-sourcing-schema.md、docs/adr/0007-testing-strategy.md。

## Requirements

### Requirement: 從交易事件流動態推導持倉

`packages/shared` SHALL 提供純函式 `deriveHoldings(transactions)`，從 `TransactionDocument[]` 動態推導持倉，**不**讀寫任何 holdings collection（ADR-0004：持倉是衍生資料）。聚合粒度 SHALL 為 `(market, symbol)`——同一檔股票**跨帳戶合併**為單一 position。MVP 範圍僅處理 `transaction_type="BUY"`；SELL 與持有週期（lot）為 Sprint 5，不在本 change。

#### Scenario: 多筆買入聚合為單一 position

- **WHEN** 同一 `(market, symbol)` 有多筆 BUY（可分屬不同 `account_id`）
- **THEN** `deriveHoldings` 回傳一筆 position，`quantity` 為各筆 `quantity` 之和（Money 運算）

#### Scenario: 不同 symbol 各自成列

- **WHEN** 交易包含 `TW/2330` 與 `US/AAPL` 的買入
- **THEN** 回傳兩筆 position，各自獨立聚合，互不影響

#### Scenario: 無交易時回傳空集合

- **WHEN** `transactions` 為空陣列
- **THEN** 回傳空陣列（非 null、非錯誤）

### Requirement: 加權平均成本計算（§4 公式）

Position 的成本 SHALL 依 planning doc §4 加權平均法計算：`totalCost = Σtotal + Σfee + Σtax`（讀交易文件的 flat 欄位 `total`/`fee`/`tax`，**手續費與交易稅皆計入成本基礎**）、`averageCost = totalCost / quantity`。所有運算 SHALL 用 `Money`（decimal.js），輸出 10 位小數 string，禁 native float。§4 worked example SHALL 直接作為測試 fixture。

#### Scenario: §4 台積電 worked example

- **WHEN** 三筆 BUY：1000 股 @500 費 700、1000 股 @600 費 800、500 股 @550 費 400（tax 皆 0）
- **THEN** `totalCost="1376900.0000000000"`、`quantity="2500.0000000000"`、`averageCost="550.7600000000"`

#### Scenario: 零手續費券商

- **WHEN** 所有 BUY 的 `fee="0"`、`tax="0"`（如 Firstrade）
- **THEN** 公式天然成立：`averageCost = Σtotal / Σquantity`，無特殊處理

#### Scenario: 精度以 Money 維持

- **WHEN** 成本除以股數除不盡（如 totalCost=100、quantity=3）
- **THEN** `averageCost` 為 decimal.js ROUND_HALF_UP 的 10 位小數 string，非浮點近似值

### Requirement: Position 資料形狀（跨畫面共用契約）

`deriveHoldings` 回傳的每筆 position SHALL 含：`market`、`symbol`、`currency`（原幣別）、`quantity`、`totalCost`、`averageCost`（皆 10 位小數 string）、`txCount`（筆數，number）。此型別 SHALL 由 `packages/shared` 匯出，供 Overview / AssetDetail 共用。

#### Scenario: 欄位完整且型別正確

- **WHEN** 對任一筆聚合結果檢視
- **THEN** 上述七個欄位皆存在；金額/數量為 `Money.toDecimalString()` 格式，`txCount` 等於該 `(market, symbol)` 的交易筆數

#### Scenario: 混幣別防護

- **WHEN** 同一 `(market, symbol)` 出現不同 `currency` 的交易（理論上不應發生）
- **THEN** 函式 SHALL 以明確錯誤拒絕（fail loud），不得靜默混算不同幣別（CurrencyMismatchError 或等價防護）

### Requirement: 持倉清單檢視（HoldingsOverview）

持倉 Tab SHALL 顯示由 `deriveHoldings` 推導的持倉清單：依 `market` 分組（TW / US），每組顯示該市場**原幣別總成本小計**；每列顯示 `symbol`、總股數、加權均價與總成本。底部 SHALL 額外顯示**跨幣別「總成本」grand total**，換算成 `preferred_display_currency`（預設 TWD），換算機制與降級行為見 currency-display capability。原幣別小計為精確值、grand total 為最新匯率的 as-of-today 快照，兩者並存。本畫面**不顯示市值 / 損益**（需現價，Sprint 5）；**不提供幣別切換鈕**（切換僅在 AssetDetail）。金額顯示 SHALL 用 `Money.toDisplayString()`（2 位小數），儲存與計算仍 10 位。

#### Scenario: 依市場分組顯示原幣別小計

- **WHEN** 使用者持有 TW 與 US 市場的股票
- **THEN** 持倉清單分「TW」「US」兩組，各組標頭顯示該市場原幣別成本小計（如 `TWD 1,376,900.00`、`USD 1,805.00`）

#### Scenario: 底部顯示跨幣別 TWD 總成本合計

- **WHEN** 持倉同時含 TWD 與 USD 部位、且已有最新匯率
- **THEN** 清單底部顯示「總成本（TWD）」= 各 position 原幣別總成本換算成 TWD 後加總（用最新匯率）

#### Scenario: 新交易即時反映

- **WHEN** 使用者新增一筆 BUY（transactionsStore onSnapshot 更新）
- **THEN** 持倉清單即時重新推導並更新該 symbol 的股數與均價，無需手動刷新

#### Scenario: 空持倉狀態

- **WHEN** 使用者尚無任何交易
- **THEN** 持倉清單顯示空狀態提示（引導去新增交易），而非錯誤或空白

### Requirement: 個股明細與對帳 timeline（AssetDetail）

點擊持倉清單任一列 SHALL 進入該股 AssetDetail，顯示：持倉摘要（總股數、加權均價、總成本、原幣別）+ **對帳 timeline**——該 `(market, symbol)` 的全部交易依 `transaction_date` 由舊到新排序（買進累積的時間順序），每筆顯示日期、股數、單價、手續費。本畫面 SHALL 提供 **TWD/USD 幣別切換**（即時換算均價 / 總成本，機制見 currency-display）。本畫面**無現價 / 未實現損益**（需報價，Sprint 5）。

#### Scenario: 摘要與 §4 數字一致

- **WHEN** 使用者進入台積電（§4 範例資料）的 AssetDetail
- **THEN** 摘要顯示 2,500 股、均價 550.76、總成本 1,376,900（2 位小數顯示）

#### Scenario: timeline 依日期由舊到新

- **WHEN** 該股有多筆不同 `transaction_date` 的買入
- **THEN** 明細依 `transaction_date` 升冪排列，呈現持股累積的順序

### Requirement: 推導零新增 I/O 且可獨立測試

持倉推導本身 SHALL 完全由既有 `transactionsStore` 的資料計算（`useMemo`），`deriveHoldings` SHALL 為不依賴 Firestore / React 的純函式，先寫測試再實作（TDD），納入 `packages/shared` ≥90% coverage gate。FX 顯示（grand total / AssetDetail 切換）SHALL 另讀 `exchange_rates` 最新筆（見 currency-display），此為本 change 唯一新增的 Firestore 讀取，且不影響 `deriveHoldings` 的純度。

#### Scenario: 純函式 deterministic

- **WHEN** 以相同 `TransactionDocument[]` 呼叫 `deriveHoldings` 兩次
- **THEN** 回傳深度相等的結果，不需任何 Firestore / React 環境

#### Scenario: 新增的 I/O 僅限 exchange_rates 最新筆

- **WHEN** 使用者瀏覽持倉清單與 AssetDetail
- **THEN** 相較持倉推導本身，App 僅多出對 `exchange_rates` 最新一筆的讀取（供 FX 換算），`deriveHoldings` 不新增任何監聽
