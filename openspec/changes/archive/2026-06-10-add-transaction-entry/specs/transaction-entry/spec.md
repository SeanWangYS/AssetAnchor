## ADDED Requirements

### Requirement: 記錄買入交易（BUY）

系統 SHALL 允許已登入使用者在 `users/{uid}/transactions/{transactionId}` 記錄一筆 `transaction_type="BUY"` 的交易事件，欄位對齊 planning doc §6 `TransactionDocument`。`transactionId` SHALL 採 Firestore 自動產生的 document id，並回寫至文件的 `transaction_id` 欄位（與 accounts 既有 pattern 一致）。`created_at` / `updated_at` SHALL 以 `serverTimestamp()` 寫入。MVP 範圍僅 BUY，其餘 `transaction_type` 不在本 change。

#### Scenario: 成功記錄一筆買入

- **WHEN** 使用者在 AddTransaction 填妥 `account_id`、`symbol`、`market`、`asset_type`、`quantity`、單價、`transaction_date` 並送出
- **THEN** 系統在當前 uid 的 transactions subcollection 新增一份 `transaction_type="BUY"` 文件，`transaction_id` 等於該 document id，關閉 modal 並在交易清單出現該筆交易

#### Scenario: transaction_id 回寫為 document id

- **WHEN** 系統建立交易文件
- **THEN** 文件的 `transaction_id` 欄位值等於該 Firestore document 的 id

#### Scenario: 時戳以 serverTimestamp 寫入

- **WHEN** 系統建立交易文件
- **THEN** `created_at` 與 `updated_at` 皆以 `serverTimestamp()` 寫入

### Requirement: 單幣別 amounts map 組成

對單幣別 BUY，系統 SHALL 在 `amounts` map 僅填入一筆，key 為 `original_currency`，其 `is_original=true`、`rate="1.0000000000"`、`rate_source`/`rate_type`/`rate_date` 皆為 null，且 `amounts_status="COMPLETE"`（不觸發匯率抓取）。`price`/`total`/`fee`/`tax` SHALL 為 `Money` 序列化的 10 位小數 string，其中 `total` 等於 `price × quantity`（成交金額，不含手續費與稅）。多幣別 FX 換算不在本 change（Sprint 4）。

#### Scenario: amounts 僅含原幣別一筆且自身匯率為 1

- **WHEN** 使用者以 `original_currency="TWD"` 記錄一筆買入
- **THEN** `amounts` 只有 `"TWD"` 一個 key，其 `is_original=true`、`rate="1.0000000000"`、`rate_source`/`rate_type`/`rate_date` 為 null

#### Scenario: total 等於 price × quantity（Money 運算）

- **WHEN** 使用者輸入單價 `500`、數量 `1000`
- **THEN** 該幣別 amount 的 `total` 為 `Money` 運算結果的 10 位小數 string（`"500000.0000000000"`），非 native float 計算

#### Scenario: amounts_status 為 COMPLETE

- **WHEN** 系統組成單幣別 BUY 文件
- **THEN** `amounts_status="COMPLETE"`（無待補匯率）

### Requirement: 交易輸入驗證（zod schema）

`packages/shared` SHALL 提供 transaction 輸入的 zod schema，驗證 BUY 單幣別輸入子集：`account_id`、`symbol`（trim 後非空）、`market`、`asset_type`、`transaction_type`、`transaction_date`（`YYYY-MM-DD`）、`quantity`（> 0）、`price`（> 0）、`fee`（≥ 0）、`tax`（≥ 0）、`original_currency`（MVP 限 USD / TWD）、`notes`（可空）。型別由 `z.infer` 推導。新增 / 修改 `asset_type` / `market` / `transaction_type` enum SHALL 補對應測試（planning doc §13.4）。

#### Scenario: 必填欄位缺失被拒

- **WHEN** 使用者送出缺少 `symbol` 或 `quantity` 的表單
- **THEN** zod `safeParse` 回傳失敗、附對應欄位的繁體中文錯誤訊息，且不寫入 Firestore

#### Scenario: 數量或單價非正數被拒

- **WHEN** 使用者輸入 `quantity="0"`、`quantity="-5"` 或 `price="abc"`
- **THEN** zod 驗證失敗並標示該欄位

#### Scenario: 合法輸入通過驗證

- **WHEN** 使用者輸入完整且合法的 BUY 欄位
- **THEN** zod `safeParse` 成功，回傳型別化的 `TransactionInput`

### Requirement: Money 精度處理

系統 SHALL 以 `packages/shared` 的 `Money`（decimal.js）處理所有金額與數量，儲存為 10 位小數 string，禁用 native float 運算。非法數值（NaN / Infinity）SHALL 由 `Money` 丟 `InvalidMoneyValueError`，由表單層攔截為驗證錯誤。

#### Scenario: 使用者輸入轉為 10 位小數 string

- **WHEN** 使用者輸入單價 `"180.5"`
- **THEN** 儲存值為 `"180.5000000000"`

#### Scenario: 非法金額被攔截

- **WHEN** 組成文件時遇到 NaN / Infinity 金額
- **THEN** `Money` 丟 `InvalidMoneyValueError`，交易不寫入

### Requirement: 交易文件組成與 I/O 分離（可測性）

依 ADR-0007，系統 SHALL 將交易文件組成實作為**不依賴 Firestore** 的純函式 `buildTransactionDoc(input, ctx)`（回傳純 `TransactionDocument` 物件），與 Firestore I/O `writeTransaction(uid, doc)` 分離。純轉換 SHALL 可獨立單元測試，且納入 coverage gate。

#### Scenario: 組成邏輯可獨立於 Firestore 測試

- **WHEN** 以固定 input 與 ctx（如 `transactionId`、currency）呼叫 `buildTransactionDoc`
- **THEN** 回傳的純物件欄位完全由輸入決定（deterministic），不需 Firestore 連線即可斷言

### Requirement: 檢視已記錄交易（基礎時序清單）

系統 SHALL 在交易 Tab 顯示當前使用者已記錄交易的時序清單，依 `transaction_date` 由新到舊排序（單欄排序，沿用 Firestore 自動索引；同日順序不保證，足以驗證寫入並達成「第一筆 transaction 寫入」里程碑）。個股分組的對帳 timeline 不在本 change（Sprint 3 Change 2）。

#### Scenario: 新增後出現在清單

- **WHEN** 使用者成功記錄一筆 BUY
- **THEN** 交易清單即時（onSnapshot）出現該筆，顯示 `symbol`、`quantity`、單價與 `transaction_date`，並依 `transaction_date` 由新到舊排序

#### Scenario: 清單為空時的呈現

- **WHEN** 當前使用者尚無任何交易
- **THEN** 交易清單顯示空狀態提示，而非錯誤

### Requirement: transactions 資料 per-user 隔離

Firestore rules SHALL 確保使用者僅能讀寫自己 `users/{uid}/transactions/**` 之下的交易，不得存取他人交易。本 change 不改變 rules 行為（既有 `users/{uid}/{document=**}` catch-all 已涵蓋），但 SHALL 補上 transactions 子集合的隔離測試並納入 CI（ADR-0007）。

#### Scenario: 使用者讀寫自己的交易

- **WHEN** 已登入使用者 A 對 `users/A/transactions/{id}` 讀或寫
- **THEN** rules 允許

#### Scenario: 使用者無法存取他人交易

- **WHEN** 已登入使用者 A 嘗試讀或寫 `users/B/transactions/{id}`
- **THEN** rules 拒絕
