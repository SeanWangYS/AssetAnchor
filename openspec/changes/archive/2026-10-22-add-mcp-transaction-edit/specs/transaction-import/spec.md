## ADDED Requirements

### Requirement: 變更前後比較找出新增的超賣

`packages/shared` SHALL 提供純函式 `findNewOversells(before, after)`：兩組交易各自依帳戶、`(market, symbol, currency)` 與時序（同日先 BUY 後 SELL）模擬持有量，回傳只在 `after` 超賣、在 `before` 未超賣的 SELL（以 `transaction_id` 識別），並附當下可賣與欲賣數量。修改與刪除 SHALL 以此判斷是否拒絕。

#### Scenario: 刪除較早的買入

- **WHEN** 帳戶有 `2025-01-02 BUY 1000` 與 `2025-03-01 SELL 1000`，`after` 為刪除那筆買入
- **THEN** 回傳 `2025-03-01` 的賣出，可賣 0、欲賣 1000

#### Scenario: 刪除賣出不會造成超賣

- **WHEN** `after` 為刪除那筆賣出
- **THEN** 回傳空清單

#### Scenario: 既有異常不算新增

- **WHEN** `before` 已有一筆超賣的賣出，`after` 只是修改另一檔股票
- **THEN** 回傳空清單
