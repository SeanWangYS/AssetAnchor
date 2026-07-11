# holdings-derivation Specification

## Purpose

從交易事件流動態推導持倉（不存 holdings collection，ADR-0004）：`(market, symbol)` 跨帳戶聚合、加權平均成本（§4 公式，fee + tax 計入成本基礎）、持倉清單檢視（依市場分組、原幣別成本小計）、個股明細與對帳 timeline。對應 Sprint 3 Change 2（讀取/計算路徑）。市值/損益（需報價，Sprint 5）、跨幣別合計（需匯率，Sprint 4）、SELL 與持有週期（Sprint 5）為後續範圍。

> 來源：docs/portfolio_tracker_planning.md §3（持倉檢視）、§4（報酬計算/加權平均）、§6（Collection 3 transactions schema）、§13.2（Sprint 3）；
> 實作紀錄：openspec/changes/archive/2026-06-13-add-holdings-derivation/（proposal / design / tasks）、docs/adr/0004-event-sourcing-schema.md、docs/adr/0007-testing-strategy.md。

## Requirements

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

`deriveHoldings` 回傳的每筆 position SHALL 含：`market`、`symbol`、`currency`、`quantity`、`totalCost`、`averageCost`（皆 10 位小數 string）、`txCount`（number），以及 `realizedPnl`（該 `(market, symbol)` **全期已實現損益**，原幣別 10 位小數 string；無賣出則為 `"0.0000000000"`）。此型別 SHALL 由 `packages/shared` 匯出。

#### Scenario: 欄位完整且型別正確

- **WHEN** 對任一筆聚合結果檢視
- **THEN** 上述欄位皆存在；金額/數量為 `Money.toDecimalString()` 格式；無賣出之 position 其 `realizedPnl="0.0000000000"`

#### Scenario: 混幣別防護

- **WHEN** 同一 `(market, symbol)` 出現不同 `currency` 的交易
- **THEN** 函式 SHALL fail loud（CurrencyMismatchError 或等價），不得靜默混算

### Requirement: 已實現損益推導（SELL，§4）

`packages/shared` SHALL 提供純函式 `deriveRealizedEvents`，從交易事件流（時序）推導每筆 SELL 的已實現損益：`realized = (total − fee − tax) − averageCost × soldQty`，其中 `averageCost` 為**該筆賣出當下**的加權平均成本。輸出 SHALL 為已實現事件清單（含 `market`、`symbol`、`currency`、`transaction_date`、`realized` 10 位小數 string），供 per-symbol 加總（`Position.realizedPnl`）與時間區間 / 跨幣別合計（顯示層）使用。所有運算 SHALL 用 `Money`（decimal.js）。

#### Scenario: §4 已實現損益公式

- **WHEN** 持有均價 550.76、賣出 1000 股 @600、賣出手續費 855、稅 0
- **THEN** 該筆 `realized = (600×1000 − 855 − 0) − 550.76×1000 = "48385.0000000000"`（以 Money 精算）

#### Scenario: 零手續費賣出

- **WHEN** SELL 的 `fee="0"`、`tax="0"`
- **THEN** `realized = total − averageCost × soldQty`，無特殊處理

#### Scenario: 多次賣出累加

- **WHEN** 同一 symbol 有多筆 SELL
- **THEN** `Position.realizedPnl` 為各筆 realized 之和（同幣別 Money 相加）

### Requirement: 持倉清單檢視（HoldingsOverview）

持倉 Tab SHALL 顯示由 `deriveHoldings` 推導的持倉清單：依 `market` 分組（TW / US），每組顯示該市場**原幣別總成本小計**；每列顯示 `symbol`、總股數、加權均價與總成本。底部 SHALL 額外顯示**跨幣別「總成本」grand total**，換算成 `preferred_display_currency`（預設 TWD），換算機制與降級行為見 currency-display capability。原幣別小計為精確值、grand total 為最新匯率的 as-of-today 快照，兩者並存。本畫面市值 / 未實現損益 / Hero 彙總由 **live-quotes** 報價提供（Sprint 5b）；**顯示幣別切換鈕設於本頁**＝偏好控制（見 currency-display）。金額顯示 SHALL 用 `Money.toDisplayString()`（2 位小數），儲存與計算仍 10 位。

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

### Requirement: deriveHoldings 對缺欄位 fail-soft（但對損毀資料仍 fail-loud）

`deriveHoldings` 讀取交易金額/數量欄位（`total`/`fee`/`tax`/`quantity`）時，對**缺值**（pre-ADR-0005 舊 doc 缺欄位，runtime 為 `undefined`/`null`）SHALL fail-soft：以 `0` 視之、該筆貢獻 0、**不得**丟 `DecimalError`。此防禦 MUST 由可測純函式（`toSafeDecimalString`）實作並有單元測試。

**邊界紀律（ADR-0007 §5b 不被弱化）**：欄位**存在但非法**（如 `'Infinity'`/`'NaN'`/非數字字串）屬資料損毀，SHALL 仍 fail-loud（擲 `InvalidMoneyValueError`），**不得**被靜默歸零。缺值 vs 損毀的分界＝欄位是否存在。正常（欄位齊全且合法）資料的推導結果 MUST 與既有行為完全一致（精度語意不變）。

#### Scenario: 舊 doc 缺金額欄位不 crash

- **WHEN** `deriveHoldings` 收到一筆缺（undefined）`total`/`fee`/`tax` 的交易 doc
- **THEN** 不丟例外；缺值視為 0，其餘交易照常推導

#### Scenario: 損毀（present-but-invalid）仍 fail-loud

- **WHEN** 某交易的 `total` 存在但為 `'Infinity'` 等非法值
- **THEN** 擲 `InvalidMoneyValueError`（不被歸零）

#### Scenario: 欄位齊全行為不變

- **WHEN** 所有交易欄位齊全且合法
- **THEN** 推導結果（股數/成本/均價/已實現）與防禦前完全一致

### Requirement: 帳戶層級持倉衍生與逐-symbol 容錯

帳戶詳情（AccountDetail）SHALL 以該帳戶（`account_id`）的交易子集推導持倉。per-account 衍生 SHALL **逐 `(market, symbol)` 群組各自推導**：當某一 symbol 因歷史爛資料（如帳戶層級超賣 / orphan SELL）導致 `deriveHoldings` `throw` 時，系統 SHALL 只跳過或標示該 symbol 並記 log，**其餘可正常推導的持股 SHALL 照常顯示**——不得因單一 symbol 失敗而讓整個帳戶持股清單變空。

全域持倉總覽（HoldingsOverview）的 `deriveHoldings` 維持既有 **fail-loud** 語意（ADR-0007），本需求僅治理「帳戶層級」的容錯，不放寬全域語意。

#### Scenario: 單一 symbol 爛資料不影響其餘持股

- **WHEN** 某帳戶含合法持股（如 TSLA、AAPL、VTI）外，另有一筆會造成帳戶層級超賣的 orphan SELL（如該帳戶從未買入的 QQQ 之 SELL）
- **THEN** 帳戶詳情 SHALL 正常顯示 TSLA / AAPL / VTI；出問題的 symbol SHALL 被跳過或標示為資料異常，**整頁不得 blank**

#### Scenario: 帳戶無任何爛資料時逐-symbol 與整體推導一致

- **WHEN** 某帳戶所有交易皆合法（無帳戶層級超賣）
- **THEN** 逐-symbol 容錯衍生的結果 SHALL 與直接對該帳戶交易子集 `deriveHoldings` 的結果一致（無行為差異）

#### Scenario: 全域總覽維持 fail-loud

- **WHEN** 全域交易集合存在超賣（跨所有帳戶不合法）
- **THEN** 全域 `deriveHoldings` SHALL 維持 `throw`（fail-loud），本需求不改變此行為

### Requirement: 持倉清單「帳戶」分群依真實帳戶

持倉總覽的「帳戶」分群模式 SHALL 依交易的真實 `account_id` 分組，**不得**使用任何 symbol→帳戶的 demo 硬編對照表。`packages/shared` SHALL 提供純函式 `deriveHoldingsByAccount(transactions, accounts)`，對每個帳戶各自以 `deriveHoldingsForAccountSafe` 推導持倉（per-account，逐 symbol 容錯），回傳有序的帳戶分組（每組含 `accountId`、`accountName`、`positions`、`skipped`）。分組標題 SHALL 顯示真實 `account_name` + 檔數 + 原幣別小計，且不含顏色圓點（holdings-overview-spec D3：持倉清單本身）。`account_id` 對不到任何現存帳戶的交易 SHALL 歸入「未分類」群（fail-soft，不靜默消失）。同一 `(market, symbol)` 跨多帳戶持有時 SHALL 於各自帳戶群各成一列（各自股數/均價）。`AssetDetail` 的「帳戶分布」欄 SHALL 同樣由真實交易解析帳戶名（可能多帳戶），不得使用 demo 對照。

#### Scenario: 依真實帳戶分組

- **WHEN** 使用者於持倉總覽切到「帳戶」模式，且其交易分屬帳戶 A（Firstrade）與帳戶 B（群益證券）
- **THEN** 系統 SHALL 顯示標題為「Firstrade」「群益證券」的分組，各組只含該帳戶交易推導出的持倉，標題顯示檔數與原幣別小計；**不得**出現使用者未建立的帳戶名

#### Scenario: 跨帳戶同 symbol 各自成列

- **WHEN** 同一 `(market, symbol)` 在帳戶 A 與帳戶 B 皆有持有
- **THEN** 該 symbol SHALL 於帳戶 A 群與帳戶 B 群各出現一列，各列的股數/均價依該帳戶自身交易計算

#### Scenario: orphan account_id 歸未分類

- **WHEN** 某交易的 `account_id` 對不到任何現存帳戶（例如帳戶已刪除）
- **THEN** 其推導的持倉 SHALL 歸入「未分類」群（顯示於最後），不得靜默消失、不得歸入任意其他帳戶

#### Scenario: 不使用 demo 對照表

- **WHEN** 任一 symbol 不在（已移除的）demo 對照表中
- **THEN** 分群結果 SHALL 完全由真實 `account_id` 決定，與 symbol 字面無關；`holdingsDemo` 的 `accountOf`/`DEMO_ACCOUNT` SHALL 不復存在

### Requirement: 本月已實現損益指標的空狀態

持倉總覽「本月已實現損益」指標 SHALL 在**本月無任何 SELL 事件**時顯示中性空狀態（如「本月無賣出」或灰色「—」），不得以綠色上漲樣式（`▲`）呈現「NT$ 0」而誤導為上漲。月度過濾與跨幣別加總 SHALL 由 `packages/shared` / `holdingsHero` 的具測試純函式提供（本地時間月前綴過濾 + 顯示幣別換算加總），不得僅存在於 screen 的 inline 邏輯而無測試。

#### Scenario: 本月無賣出顯示中性

- **WHEN** 使用者本月無任何 SELL 交易（僅持有或本月僅買入）
- **THEN** 「本月已實現損益」SHALL 顯示中性空狀態，不顯示綠色「▲ NT$ 0」

#### Scenario: 本月有賣出顯示真值

- **WHEN** 使用者本月有 SELL 事件，已實現損益加總為正 / 負 / 恰為 0
- **THEN** 指標 SHALL 以 `Pnl` 呈現真值（正綠 `▲`、負紅 `▼`、恰為 0 亦以事件真值顯示），並正確落在本月（月邊界以本地日曆日判定，`2026-06-30` 歸六月、`2026-07-01` 歸七月）

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
