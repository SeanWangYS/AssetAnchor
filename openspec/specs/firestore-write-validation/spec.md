# firestore-write-validation Specification

## Purpose

Field-level validation of client writes in `firebase/firestore.rules`: clients may only write their own user doc, accounts and transactions, with the exact field sets, types, enums and decimal formats the shared writers produce; everything else is backend-only.

## Requirements

### Requirement: Client 寫入限於已知文件

Client SHALL 只能寫 `users/{uid}`、`users/{uid}/accounts/{id}`、`users/{uid}/transactions/{id}`（皆限本人）；`users/{uid}` 下其他路徑 SHALL 拒絕寫入。User doc 與 accounts SHALL NOT 可被 client 刪除；transactions 本人 MAY 刪除。

#### Scenario: 未知 subcollection

- **WHEN** 使用者寫入 `users/{uid}/notes/n1`
- **THEN** 拒絕

### Requirement: 建立時驗證完整欄位集

建立 user doc、account、transaction 時，rules SHALL 要求欄位集與 shared 寫入端完全一致（不可多、不可少），並驗證型別、enum（與 `packages/shared/src/enums` 一致）、金額為 `Money.toDecimalString()` 格式（交易金額與數量不可為負）、日期為 `YYYY-MM-DD`、文件 id 欄位等於 doc id、時戳為 `serverTimestamp()`、字串長度上限（帳戶名稱 100、備註 1000、代號 32、暱稱 50）。Client SHALL NOT 在交易寫入 `source` 或 `import_batch_id`。

#### Scenario: 金額為 number

- **WHEN** client 建立交易且 `quantity` 為 number `10`
- **THEN** 拒絕

#### Scenario: 自稱 MCP 匯入

- **WHEN** client 建立交易且帶 `source: 'mcp'`
- **THEN** 拒絕

#### Scenario: App 實際寫入

- **WHEN** App 以 shared `buildTransactionDoc` 的輸出加上 `serverTimestamp()` 建立交易
- **THEN** 允許

### Requirement: 更新只可改可編輯欄位

更新時 rules SHALL 只允許改動可編輯欄位並驗證其結果值：user doc 為暱稱、顯示幣別（TWD／USD）、settings；account 為使用者可編輯欄位、現金餘額（USD／TWD 鍵，10 位小數、可為負）、`is_active`；transaction 為 builder 欄位。`updated_at` SHALL 為 `serverTimestamp()`。未被改動的既有欄位（如 MCP 的 `source`、`import_batch_id`）SHALL 保留且不影響驗證。

#### Scenario: 編輯 MCP 匯入的交易

- **WHEN** 使用者在 App 編輯一筆帶 `source: 'mcp'` 的交易（merge 寫入全部 builder 欄位）
- **THEN** 允許，`source` 與 `import_batch_id` 保留

#### Scenario: 竄改建立時間

- **WHEN** client 更新交易時改 `created_at`
- **THEN** 拒絕

#### Scenario: email 註冊者建立第一個帳戶

- **WHEN** `display_name` 為 `''` 的使用者在同一 batch 建立帳戶並更新 `settings.default_account_id`
- **THEN** 允許
