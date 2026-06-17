## MODIFIED Requirements

### Requirement: 記錄買入交易（BUY）

系統 SHALL 允許已登入使用者在 `users/{uid}/transactions/{transactionId}` 記錄交易事件，欄位對齊 planning doc §6 `TransactionDocument`。`transactionId` SHALL 採 Firestore 自動產生的 document id，並回寫至文件的 `transaction_id` 欄位。`created_at` / `updated_at` SHALL 以 `serverTimestamp()` 寫入。本 change 起支援 `transaction_type` 為 `BUY` 與 `SELL`（其餘型別仍不在範圍）。

#### Scenario: 成功記錄一筆買入

- **WHEN** 使用者在 AddTransaction 選 BUY、填妥 `account_id`、`symbol`、`market`、`asset_type`、`quantity`、單價、`transaction_date` 並送出
- **THEN** 系統在當前 uid 的 transactions subcollection 新增一份 `transaction_type="BUY"` 文件，`transaction_id` 等於該 document id，關閉 modal 並在交易清單出現該筆交易

#### Scenario: transaction_id 回寫為 document id

- **WHEN** 系統建立交易文件
- **THEN** 文件的 `transaction_id` 欄位值等於該 Firestore document 的 id

#### Scenario: 時戳以 serverTimestamp 寫入

- **WHEN** 系統建立交易文件
- **THEN** `created_at` 與 `updated_at` 皆以 `serverTimestamp()` 寫入

## ADDED Requirements

### Requirement: 記錄賣出交易（SELL）

系統 SHALL 允許已登入使用者記錄 `transaction_type="SELL"` 的交易事件（欄位同 `TransactionDocument`、`total = price × quantity`、`fee`/`tax` 記錄賣出手續費與交易稅）。AddTransaction SHALL 提供 BUY/SELL 切換。SELL 寫入前 SHALL 驗證 `quantity ≤ 該 (market, symbol) 當下可賣股數`（由 `deriveHoldings` 推導），避免超賣。

#### Scenario: 成功記錄一筆賣出

- **WHEN** 使用者選 SELL、目標 symbol 目前持有 2500 股、賣出 1000 股 @600 並送出
- **THEN** 系統新增一份 `transaction_type="SELL"` 文件，交易清單出現該筆；持倉股數隨之降為 1500、已實現損益入帳

#### Scenario: 超賣被拒

- **WHEN** 使用者對僅持有 1000 股的 symbol 送出賣出 1500 股
- **THEN** 表單驗證失敗、顯示繁中錯誤（如「賣出股數超過持有」），不寫入 Firestore

#### Scenario: 無持倉不可賣

- **WHEN** 使用者對目前無持倉的 symbol 選 SELL
- **THEN** 表單 SHALL 阻擋（可賣股數為 0），不寫入
