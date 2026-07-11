# Delta: holdings-derivation（enable-crypto-quotes）

## MODIFIED Requirements

### Requirement: 從交易事件流動態推導持倉

`packages/shared` SHALL 提供純函式 `deriveHoldings(transactions)`，從 `TransactionDocument[]` 動態推導持倉，**不**讀寫任何 holdings collection（ADR-0004）。聚合粒度 SHALL 為 `(market, symbol, currency)`（跨帳戶合併；**同標的不同交易幣別為獨立 lot / 獨立 position**——混幣別記帳不得使推導擲錯，Money 運算永不跨幣別；單幣別資料行為與 `(market, symbol)` 聚合完全一致）。本函式 SHALL 處理 `BUY` 與 `SELL`，並依 `transaction_date` **時序**處理（非陣列順序）：

- BUY：股數累加、`totalCost` 累加（`total+fee+tax`）。
- SELL：股數遞減、**平均成本不變**（加權平均特性）、`totalCost` 依 `avgCost × soldQty` 等比遞減；SELL SHALL 只沖銷**同幣別** lot。
- 全數賣出後股數與 `totalCost` 歸零；後續 BUY 視為**新持有週期**（§4：平均成本重算、不累加歷史）。
- **超賣**（soldQty > 當下同幣別 lot 持有）為資料異常 → SHALL fail loud（擲錯），不得產生負股數（ADR-0007）。

#### Scenario: 多筆買入聚合為單一 position

- **WHEN** 同一 `(market, symbol)` 有多筆同幣別 BUY（可分屬不同 `account_id`）
- **THEN** 回傳一筆 position，`quantity` 為各筆之和

#### Scenario: 不同 symbol 各自成列

- **WHEN** 交易包含 `TW/2330` 與 `US/AAPL` 的買入
- **THEN** 回傳兩筆 position，各自獨立聚合，互不影響

#### Scenario: 同標的混幣別記帳為獨立 lots（enable-crypto-quotes）

- **WHEN** `CRYPTO/BTC` 有一筆 `currency="TWD"` 與一筆 `currency="USD"` 的 BUY
- **THEN** `deriveHoldings` SHALL 回傳**兩筆** position（各自的幣別、股數、成本），SHALL NOT 擲 `CurrencyMismatchError`

#### Scenario: 部分賣出減股數、均價不變

- **WHEN** 持有 2500 股、均價 550.76，賣出 1000 股
- **THEN** 剩餘 `quantity="1500.0000000000"`、`averageCost` 仍為 `"550.7600000000"`、`totalCost = averageCost × 1500`

#### Scenario: 全部賣出後重買為新週期

- **WHEN** 買 1000@500 → 全賣 1000@600 → 再買 500@550
- **THEN** 賣出後持倉歸零；重買後 `averageCost="550.0000000000"`（不累加歷史成本）

#### Scenario: 全數賣出且未重買 → 不在持倉清單

- **WHEN** 買 1000@500 → 全賣 1000@600（無後續買入）
- **THEN** `deriveHoldings` SHALL **不**回傳該 lot（qty=0 非當前持倉）；其已實現損益仍由 `deriveRealizedEvents` 提供

#### Scenario: 超賣 fail loud

- **WHEN** 某 lot 的 SELL 股數大於當下同幣別持有股數
- **THEN** `deriveHoldings` SHALL 擲錯（資料異常），不得回傳負股數或靜默吞掉

#### Scenario: 無交易時回傳空集合

- **WHEN** `transactions` 為空陣列
- **THEN** 回傳空陣列（非 null、非錯誤）

## ADDED Requirements

### Requirement: 可賣數量以幣別為粒度

`sellableQuantity` / `sellableQuantityForAccount` SHALL 以 `(market, symbol, currency)`（帳戶版再加 `account_id`）為粒度回傳可賣股數：SELL 只能沖銷同幣別 lot，選錯幣別時可賣數量為 `"0.0000000000"`，由既有「不可超賣」表單驗證自然擋下（不需新驗證規則）。

#### Scenario: 同幣別可賣、跨幣別為零

- **WHEN** 某帳戶持有 `CRYPTO/BTC` TWD lot 0.15 股，SELL 表單幣別選 `USD`
- **THEN** 可賣數量 SHALL 為 0（USD lot 不存在）；幣別選 `TWD` 時可賣 0.15

### Requirement: 全域總覽逐-symbol 容錯衍生

`packages/shared` SHALL 提供 `deriveHoldingsSafe(transactions)`（複用帳戶層 `safeHoldingsFromTxs` 核心）：逐 `(market, symbol)` 分組推導，單組擲錯（超賣 / orphan SELL 等資料異常）只跳過該 symbol、收進 `skipped` 並 log，其餘照常回傳。全域持倉總覽（HoldingsOverview）與分析頁 SHALL 改用本函式——**單一 symbol 爛資料不得清空整個投資組合**。原 `deriveHoldings` SHALL 維持 fail-loud（ADR-0007 語意不放寬）。

#### Scenario: 單顆爛資料不壞一鍋粥

- **WHEN** 交易含一筆 orphan SELL（無對應 BUY）的 `US/XYZ`，與正常的 `TW/2330`、`CRYPTO/BTC`
- **THEN** 總覽 SHALL 照常顯示 2330 與 BTC 持倉，`US/XYZ` 進 `skipped`（console.warn 可見），Hero 彙總以可推導者計算

#### Scenario: 無爛資料時與 fail-loud 版結果一致

- **WHEN** 交易資料全部合法
- **THEN** `deriveHoldingsSafe(...).positions` SHALL 與 `deriveHoldings(...)` 完全一致（含排序），`skipped` 為空
