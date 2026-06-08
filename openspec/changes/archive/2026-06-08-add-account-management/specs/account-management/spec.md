## ADDED Requirements

### Requirement: 建立券商帳戶

系統 SHALL 允許已登入使用者在 `users/{uid}/accounts/{accountId}` 建立帳戶，欄位對齊 planning doc §6 `AccountDocument`。`accountId` SHALL 採 Firestore 自動產生的 document id，並回寫至文件的 `account_id` 欄位（與既有 `userDoc` 將 uid 同時作為 doc id 與欄位的 pattern 一致）。`created_at` / `updated_at` / `cash_balances_updated_at` SHALL 以 `serverTimestamp()` 寫入。

#### Scenario: 成功建立帳戶

- **WHEN** 使用者在 AddAccount 填妥 `account_name`、`broker`、`account_type`、`base_currency`、`market` 並送出
- **THEN** 系統在當前 uid 的 accounts subcollection 新增一份文件，`account_id` 等於該 document id、`is_active=true`，並關閉 modal 返回 AccountList，列表出現該帳戶

#### Scenario: 建立第一個帳戶時設為預設

- **WHEN** 使用者建立其名下第一個帳戶（先前 accounts 為空）
- **THEN** 系統將 `users/{uid}.settings.default_account_id` 設為新帳戶的 `account_id`

#### Scenario: display_order 自動指派

- **WHEN** 使用者在已有 N 個帳戶時建立新帳戶
- **THEN** 新帳戶的 `display_order` 等於現有帳戶 `display_order` 最大值加 1

### Requirement: 編輯帳戶基本資料

系統 SHALL 允許使用者在 AccountDetail 編輯既有帳戶的 `account_name`、`broker`、`account_type`、`base_currency`、`market`、`color`、`notes`，並更新 `updated_at`。`account_id`、`created_at` SHALL 不可變更。

#### Scenario: 成功編輯帳戶

- **WHEN** 使用者修改帳戶的 `account_name` 與 `color` 並儲存
- **THEN** 系統以 merge 更新該文件對應欄位、刷新 `updated_at`，AccountDetail 與 AccountList 顯示更新後的名稱與識別色

### Requirement: 停用與啟用帳戶（軟刪除）

系統 SHALL 以 `is_active` 旗標做軟刪除，**不得**提供帳戶實體刪除。停用 SHALL 設 `is_active=false`、啟用 SHALL 設 `is_active=true`。當被停用的帳戶為當前 `default_account_id` 時，系統 SHALL 清空 `users/{uid}.settings.default_account_id`（設為 null）。

#### Scenario: 停用帳戶

- **WHEN** 使用者在 AccountDetail 對一個 `is_active=true` 的帳戶執行停用
- **THEN** 該文件 `is_active` 變為 false，AccountList 預設視圖不再顯示該帳戶

#### Scenario: 停用的是預設帳戶

- **WHEN** 使用者停用的帳戶其 `account_id` 等於 `users/{uid}.settings.default_account_id`
- **THEN** 系統將 `default_account_id` 清為 null（重指派邏輯留待 Sprint 3）

#### Scenario: 重新啟用帳戶

- **WHEN** 使用者對一個 `is_active=false` 的帳戶執行啟用
- **THEN** 該文件 `is_active` 變為 true，並重新出現在 AccountList 預設視圖

### Requirement: 帳戶列表顯示與排序

AccountList SHALL 預設顯示當前 uid 下 `is_active=true` 的帳戶，依 `display_order` 遞增排序，並呈現每個帳戶的識別 `color` 與 `account_name`。系統 SHALL 提供檢視已停用帳戶的方式（例如「顯示已停用」切換），以便重新啟用。

#### Scenario: 列表依 display_order 排序

- **WHEN** 使用者開啟 AccountList 且名下有多個啟用帳戶
- **THEN** 帳戶依 `display_order` 由小到大排列，各列顯示帳戶識別色與名稱

#### Scenario: 檢視已停用帳戶

- **WHEN** 使用者切換為顯示已停用帳戶
- **THEN** 列表額外呈現 `is_active=false` 的帳戶，且可從中執行重新啟用

### Requirement: 手動編輯現金餘額（cash_balances）

系統 SHALL 允許使用者在 AccountDetail 手動輸入該帳戶的現金 snapshot，範圍為 MVP 幣別 USD 與 TWD，數值以 decimal string（小數第 10 位）寫入 `cash_balances` map。每次儲存 SHALL 更新 `cash_balances_updated_at`。現金餘額為手動 snapshot，**不**由交易自動推導。

#### Scenario: 編輯現金餘額

- **WHEN** 使用者在 AccountDetail 將 USD 現金改為 5000、TWD 現金改為 0 並儲存
- **THEN** `cash_balances` 寫入 `{ "USD": "5000.0000000000", "TWD": "0.0000000000" }`、`cash_balances_updated_at` 刷新為當前 serverTimestamp

### Requirement: 帳戶欄位驗證

送出建立 / 編輯前，系統 SHALL 以 `packages/shared` 的 zod schema 驗證輸入：`account_name` 非空且去除前後空白後長度 ≥ 1；`broker` ∈ `BROKERS`；`account_type` ∈ `ACCOUNT_TYPES`；`base_currency` ∈ { `USD`, `TWD` }（MVP 幣別範圍）；`color` 為合法 hex 色碼。驗證失敗 SHALL 阻止寫入並於對應欄位顯示錯誤訊息。

#### Scenario: 帳戶名稱為空被擋下

- **WHEN** 使用者未填 `account_name` 即送出
- **THEN** 系統不寫入 Firestore，並在 `account_name` 欄位顯示必填錯誤訊息

#### Scenario: 非 MVP 幣別被擋下

- **WHEN** 使用者選擇的 `base_currency` 不在 { USD, TWD } 之內
- **THEN** zod 驗證失敗、阻止送出並提示僅支援 USD / TWD

### Requirement: 帳戶資料隔離

Firestore security rules SHALL 確保使用者僅能讀寫自己 `users/{uid}/accounts/**` 下的帳戶；任何已登入使用者 SHALL 無法讀取或寫入他人帳戶。

#### Scenario: 不能讀取他人帳戶

- **WHEN** 使用者 A 嘗試讀取 `users/{B}/accounts/{accountId}`（B ≠ A）
- **THEN** Firestore rules 拒絕該讀取（permission denied）

#### Scenario: 不能寫入他人帳戶

- **WHEN** 使用者 A 嘗試在 `users/{B}/accounts` 建立或更新文件
- **THEN** Firestore rules 拒絕該寫入（permission denied）
