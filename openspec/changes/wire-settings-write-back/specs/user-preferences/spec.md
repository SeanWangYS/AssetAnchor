## ADDED Requirements

### Requirement: 寫回欄位驗證純函式

`packages/shared` SHALL 提供純函式驗證設定頁待寫回的欄位，供 mobile 在寫入 `users/{uid}` 前 gate，且回傳已正規化（trim）的值或具體拒絕原因。

- `display_name`：trim 後不得為空、長度 SHALL ≤ 50 字元；通過時回傳 trim 後的值。
- 顯示幣別：SHALL 僅接受設定頁支援的顯示幣別集合（MVP 為 `TWD` / `USD`），其餘（含合法但不支援的 `Currency`）一律拒絕。

#### Scenario: 合法顯示名稱通過並回傳 trim 後的值

- **WHEN** 以 `"  Sean  "` 呼叫顯示名稱驗證
- **THEN** 回傳成功且正規化值為 `"Sean"`

#### Scenario: 空白顯示名稱被拒絕

- **WHEN** 以 `""` 或純空白字串呼叫顯示名稱驗證
- **THEN** 回傳失敗，原因為 `empty`

#### Scenario: 超長顯示名稱被拒絕

- **WHEN** 以 trim 後超過 50 字元的字串呼叫顯示名稱驗證
- **THEN** 回傳失敗，原因為 `too_long`

#### Scenario: 支援的顯示幣別通過

- **WHEN** 以 `"TWD"` 或 `"USD"` 呼叫顯示幣別驗證
- **THEN** 回傳該值為合法顯示幣別

#### Scenario: 不支援的顯示幣別被拒絕

- **WHEN** 以 `"JPY"` 或任意非 `TWD`/`USD` 的字串呼叫顯示幣別驗證
- **THEN** 回傳該值非合法顯示幣別

### Requirement: 個人資料寫回（display_name）

ProfileScreen SHALL 讓使用者編輯顯示名稱並於儲存時持久化至 `users/{uid}.display_name` 與 Firebase Auth profile（`updateProfile({ displayName })`），同時以 `serverTimestamp()` 更新 `users/{uid}.updated_at`。Email SHALL 維持唯讀。

#### Scenario: 進畫面載入現有顯示名稱

- **WHEN** 使用者開啟個人資料頁
- **THEN** 顯示名稱輸入框 SHALL 預填 `users/{uid}.display_name`（缺值時 fallback 至 Auth `displayName`，再 fallback 空字串），email 欄位 SHALL 顯示登入帳號的 email 且不可編輯

#### Scenario: 儲存合法顯示名稱成功寫回

- **WHEN** 使用者輸入通過驗證的顯示名稱並按「儲存」
- **THEN** SHALL 更新 `users/{uid}.display_name` 與 Auth profile displayName、更新 `updated_at`，並顯示成功回饋

#### Scenario: 顯示名稱未通過驗證時不寫回

- **WHEN** 顯示名稱為空白或超長
- **THEN** SHALL 不觸發寫入，且「儲存」處於不可用 / 顯示驗證提示

#### Scenario: 寫入失敗顯示錯誤回饋

- **WHEN** 寫入 Firestore / Auth 過程拋錯
- **THEN** SHALL 顯示失敗回饋且不顯示成功狀態，使用者可重試

### Requirement: 顯示偏好寫回（preferred_display_currency）

DisplayPrefsScreen SHALL 讓使用者選擇顯示幣別並持久化至 `users/{uid}.preferred_display_currency`，使選擇跨 app 重啟保存。

#### Scenario: 進畫面載入現有顯示幣別

- **WHEN** 使用者開啟顯示偏好頁
- **THEN** 幣別切換 SHALL 反映 `users/{uid}.preferred_display_currency`（缺值時預設 `TWD`）

#### Scenario: 切換幣別並持久化

- **WHEN** 使用者切換顯示幣別（TWD ⇄ USD）
- **THEN** SHALL 將新值寫入 `users/{uid}.preferred_display_currency` 並更新 `updated_at`，重進畫面 / 重啟後仍維持該選擇

#### Scenario: 寫入失敗顯示錯誤回饋且還原

- **WHEN** 持久化過程拋錯
- **THEN** SHALL 顯示失敗回饋，切換值還原為先前已持久化的值
