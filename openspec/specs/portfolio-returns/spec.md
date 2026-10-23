# portfolio-returns Specification

## Purpose

投資組合與個股的時間加權績效（design spec D9）：由交易事件流建構現金流（交易日歷史匯率換算）、以 decimal.js 求解 XIRR、依平均投入時間（AYI）決定年化或累積報酬，並規範持倉總覽 bento「年化報酬率」的呈現與降級。個股年化供持股表格（change ⑥）重用。

## Requirements

### Requirement: 現金流建構（含交易日歷史匯率）

`packages/shared` SHALL 匯出純函式，由交易事件流（`TransactionDocument[]`）產生依日期排序的現金流：`BUY` 為負、`SELL` 為正，金額 SHALL 為 `transactionTotalWithFees(tx)`（與持倉推導同一口徑：買入含手續費與稅、賣出扣除手續費與稅）。非 `BUY`/`SELL` 類型 SHALL 忽略。每筆 SHALL 以**該筆交易日**的歷史匯率換成顯示幣別：`USD`↔`TWD` 取 `FX_USDTWD` 日線（1 USD = N TWD）；交易日無收盤（休市）SHALL 取該日之前最近一筆（forward-fill）；之前完全無資料時 SHALL 取該日之後最近一筆；`USDT` SHALL 1:1 釘 `USD`（與 `buildPortfolioSeries` 一致）。需要換匯但匯率日線為空時 SHALL 回報「匯率未就緒」（由呼叫端顯示「—」），SHALL NOT 以最新匯率冒充。函式 SHALL 支援依 `(market, symbol)` 篩選，以產生個股現金流；並 SHALL 支援依**一組 `account_id`** 篩選（與 symbol 篩選可併用），供持股表格「帳戶」分組只計該帳戶交易——「未分類」群以「不屬於任何現存帳戶的 `account_id` 集合」表示。所有金額運算 SHALL 用 `Money`。

#### Scenario: 台股買賣的現金流

- **WHEN** 2024-03-14 BUY 2330 1000 股 @590、fee 840；2025-05-01 SELL 500 股 @2200、fee 1,567、tax 3,300（淨收入 1,095,133）；顯示幣別 TWD
- **THEN** 現金流依序為 `(2024-03-14, −590,840)`、`(2025-05-01, +1,095,133)`

#### Scenario: 美股以交易日匯率換成台幣

- **WHEN** 2024-04-08 BUY AAPL 25 股 @168.45（4,211.25 USD），`FX_USDTWD` 當日收盤 32.0；顯示幣別 TWD
- **THEN** 該筆現金流為 `−134,760 TWD`（4,211.25 × 32.0），而非用最新匯率

#### Scenario: 休市日與首筆前無資料

- **WHEN** 交易日為匯率休市日；另一情形交易日早於日線第一筆
- **THEN** 前者取前一個有收盤的日子；後者取之後最近一筆

#### Scenario: 匯率日線未載入

- **WHEN** 有 USD 交易需換成 TWD，但 `FX_USDTWD` 日線為空（尚在載入）
- **THEN** 回報匯率未就緒，SHALL NOT 產生以最新匯率換算的現金流

#### Scenario: 依 symbol 篩選

- **WHEN** 指定 `(TW, 2330)`
- **THEN** 只回傳 2330 的現金流

#### Scenario: 依帳戶篩選

- **WHEN** 2330 在帳戶 A 與帳戶 B 各有買入，指定 `(TW, 2330)` 且帳戶集合為 `[A]`
- **THEN** 只回傳帳戶 A 的 2330 現金流

### Requirement: XIRR 求解（全程 decimal.js）

`packages/shared` SHALL 匯出 XIRR 純函式：輸入 dated 現金流與期末值（以「今日」為日期的正現金流），回傳年化報酬率（decimal string）或 `null`。年數 SHALL 以 `實際天數 / 365` 計（同 Excel `XIRR`）。求解 SHALL **全程以 `decimal.js` 進行**（含小數次方），SHALL NOT 轉成 JS `number` 迭代（owner 2026-10-21 Money 精度拍板，憲法 #2）；`toNumber()` 僅可在 UI 顯示邊界使用。演算法 SHALL 以 Newton 法求解並在發散時退回二分法，搜尋區間 SHALL 涵蓋 −99.99% 至 +10000%；無負現金流、無正現金流、或區間內無解 / 未收斂時 SHALL 回 `null`。

#### Scenario: 已知解

- **WHEN** 2024-01-01 投入 −10,000、2025-01-01（366 天）期末值 +11,000
- **THEN** XIRR ≈ 9.9714%（誤差 < 0.0001%），與 Excel `XIRR` 一致

#### Scenario: 多筆投入與賣出

- **WHEN** 現金流含多筆買入、一筆部分賣出與期末市值
- **THEN** 回傳值代入 NPV 公式後 |NPV| 小於現金流規模的 1e-9

#### Scenario: 虧損與無解

- **WHEN** 期末值低於投入（虧損）；另一情形全為負現金流
- **THEN** 前者回傳負的年化報酬；後者回傳 `null`

### Requirement: 平均投入時間（AYI）與累積報酬降級

`packages/shared` SHALL 匯出績效彙總純函式：輸入現金流與期末值，回傳 `{ kind: 'annualized' | 'cumulative', rate, averageYearsInvested }`。AYI SHALL 為各筆**負現金流**（投入）金額 × 其距今年數的加權平均（Sharesight 口徑）。AYI **≥ 1 年**時 SHALL 為 `annualized`，`rate` 為 XIRR；AYI **< 1 年**時 SHALL 為 `cumulative`，`rate` ＝（期末值 + 所有正現金流 − 所有負現金流絕對值）÷ 所有負現金流絕對值（依 GIPS「未滿一年不得年化」）。無投入時 SHALL 回 `null`。配息尚未記錄，SHALL 於程式碼註解說明高股息標的會被低估。

#### Scenario: 長期持有顯示年化

- **WHEN** 投入大多發生在兩年前
- **THEN** `kind` 為 `annualized`、`rate` 為 XIRR

#### Scenario: 多數資金最近才投入

- **WHEN** 第一筆投入在 3 年前但金額很小，其餘大額投入集中在 3 個月前，AYI < 1
- **THEN** `kind` 為 `cumulative`，`rate` 為累積報酬（不年化）

#### Scenario: 累積報酬含已賣出

- **WHEN** 投入 100,000、賣出淨收入 30,000、期末市值 90,000，AYI < 1
- **THEN** 累積報酬 = (90,000 + 30,000 − 100,000) ÷ 100,000 = 20%

### Requirement: 持倉總覽年化報酬率 bento

持倉總覽 bento 第 4 格 SHALL 顯示整個投資組合（含已全數賣出的標的）的績效：`annualized` 時標題「年化報酬率」、`cumulative` 時標題「累積報酬率」並附副標「投入未滿一年，暫不年化」；數值以 `Pnl` 呈現（正綠負紅、2 位小數百分比），過長時 autofit 縮字。期末值 SHALL 為**所有持有中標的**以最新（或過期）報價 × 股數、最新匯率換成顯示幣別的 `Money` 加總，SHALL NOT 使用已轉 `number` 的 hero 值。以下情形 SHALL 顯示「—」：任一持有中標的無報價（更新中 / 查無代號）、最新匯率未就緒、歷史匯率日線未就緒、XIRR 回 `null`。歷史匯率 SHALL 共用走勢圖已載入的 `historyStore`，SHALL NOT 新增 Firestore 讀取。切換顯示幣別時 SHALL 以新幣別重算（現金流與期末值皆換成新幣別）。

#### Scenario: 正常顯示年化

- **WHEN** 7 檔持股皆有報價、歷史匯率已載入、AYI ≥ 1
- **THEN** 第 4 格顯示「年化報酬率」與 XIRR 百分比

#### Scenario: 有持股缺報價

- **WHEN** 任一持股「更新中」或「查無代號」
- **THEN** 第 4 格數值顯示「—」

#### Scenario: 切換顯示幣別

- **WHEN** 使用者由 TWD 切到 USD
- **THEN** 以 USD 重算現金流（台股交易以交易日匯率換成 USD）與期末值，顯示新的年化報酬率

### Requirement: 持倉總覽未實現報酬率 bento

持倉總覽 bento 第 1 格（強調卡）SHALL 以標題「未實現報酬率」顯示 `總未實現損益 ÷ 持有中標的總成本 × 100`（成本與市值以最新匯率換成顯示幣別），SHALL NOT 標為「總報酬率」，以與第 4 格（含已實現、交易日歷史匯率的累積 / 年化報酬率）區分。

#### Scenario: 標題反映口徑

- **WHEN** 使用者開啟持倉總覽且已有報價
- **THEN** bento 第 1 格標題 SHALL 為「未實現報酬率」，數值等於「總未實現損益」÷ 持有中成本

#### Scenario: 與累積報酬率不同時不視為錯誤

- **WHEN** 使用者曾賣出獲利或持有美元資產且匯率自買入後變動
- **THEN** 第 1 格與第 4 格的百分比 MAY 不同，兩格標題 SHALL 分別為「未實現報酬率」與「累積報酬率」/「年化報酬率」
