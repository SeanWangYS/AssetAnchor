## MODIFIED Requirements

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
