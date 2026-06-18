## ADDED Requirements

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
