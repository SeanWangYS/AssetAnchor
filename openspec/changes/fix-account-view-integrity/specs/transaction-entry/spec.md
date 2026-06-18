## MODIFIED Requirements

### Requirement: 記錄賣出交易（SELL）

系統 SHALL 允許已登入使用者記錄 `transaction_type="SELL"` 的交易事件（欄位同 `TransactionDocument`、`total = price × quantity`、`fee`/`tax` 記錄賣出手續費與交易稅）。AddTransaction SHALL 提供 BUY/SELL 切換。SELL 寫入前 SHALL 驗證 `quantity ≤ **所選帳戶（account_id）** 之 (market, symbol) 當下可賣股數`（由該帳戶交易子集經 `deriveHoldings` 推導），避免超賣。可賣量 SHALL 隨表單所選帳戶連動——**只能賣出該帳戶實際持有的股**；同一 symbol 於其他帳戶的持有量**不**計入本次可賣量。

#### Scenario: 成功記錄一筆賣出

- **WHEN** 使用者選 SELL、目標帳戶持有該 symbol 2500 股、賣出 1000 股 @600 並送出
- **THEN** 系統新增一份 `transaction_type="SELL"` 文件，交易清單出現該筆；該帳戶持倉股數隨之降為 1500、已實現損益入帳

#### Scenario: 超賣被拒（帳戶層級）

- **WHEN** 使用者對所選帳戶僅持有 1000 股的 symbol 送出賣出 1500 股
- **THEN** 表單驗證失敗、顯示繁中錯誤（如「賣出股數超過可賣」），不寫入 Firestore

#### Scenario: 該帳戶無持倉不可賣（即使其他帳戶有持倉）

- **WHEN** 使用者選 SELL、所選帳戶目前無該 symbol 持倉（即使同 symbol 在另一帳戶有持倉）
- **THEN** 表單 SHALL 阻擋（該帳戶可賣股數為 0），不寫入；不得以其他帳戶的持有量放行
