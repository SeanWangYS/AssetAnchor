## MODIFIED Requirements

### Requirement: MCP 端點以 Streamable HTTP 無狀態運作並要求 bearer token

系統 SHALL 在 `mcp` Cloud Function 提供遠端 MCP 端點，傳輸方式為 Streamable HTTP、無狀態（不保留 session）。每個請求 SHALL 帶有效的 bearer 存取權杖（見 `mcp-authorization`）且 scope 含 `transactions.read`；缺少或無效時 SHALL 回 HTTP 401 `invalid_token`，scope 不足時 SHALL 回 HTTP 403 `insufficient_scope`。伺服器 SHALL 宣告名稱 `assetanchor` 與版本。只讀工具 SHALL 標示 `readOnlyHint: true`；寫入工具 SHALL 標示 `readOnlyHint: false`，且權杖缺少 `transactions.write` 時 SHALL 以工具錯誤回覆「請在 Claude 重新連線 AssetAnchor 以授權寫入」，不寫入任何資料。

#### Scenario: 帶有效權杖列出工具

- **WHEN** Claude 以有效權杖送出 `tools/list`
- **THEN** 回傳 `list_accounts`、`list_transactions`、`search_symbol`、`validate_transactions`（只讀）與 `create_transactions`（寫入）

#### Scenario: 權杖被作廢後呼叫

- **WHEN** 已被管理者作廢的權杖呼叫任何工具
- **THEN** 回 HTTP 401 `invalid_token`

#### Scenario: 只有讀取權限的舊權杖呼叫寫入工具

- **WHEN** 只含 `transactions.read` 的權杖呼叫 `create_transactions`
- **THEN** 回傳工具錯誤「請在 Claude 重新連線 AssetAnchor 以授權寫入」，交易集合不變

### Requirement: list_transactions 依條件查詢交易

`list_transactions` SHALL 支援選填篩選：`account_id`、`symbol`（搭配選填 `market`）、`date_from`、`date_to`（`YYYY-MM-DD`，含端點）、`import_batch_id`，結果依 `transaction_date` 由新到舊排序。每筆 SHALL 含 `transaction_id`、`account_id`、`transaction_date`、`symbol`、`market`、`asset_type`、`transaction_type`、`currency`、`quantity`、`price`、`fee`、`tax`、`notes`、`import_batch_id`（App 手動輸入者為 `null`）。金額與數量 SHALL 以 Firestore 儲存的 decimal string 原樣回傳，SHALL NOT 轉成浮點數。每頁 SHALL 最多 100 筆（預設 50），超過時 SHALL 回傳 `next_cursor` 供下一頁使用。日期格式不合法或 `date_from` 晚於 `date_to` 時 SHALL 回傳繁中錯誤，不執行查詢。

#### Scenario: 依代號與日期查詢

- **WHEN** 呼叫 `list_transactions`，`symbol` 為 `2330`、`market` 為 `TW`、`date_from` 為 `2025-01-01`
- **THEN** 只回傳該使用者 2025-01-01 起的台積電交易，金額為 decimal string（例如 `"580.0000000000"`）

#### Scenario: 結果超過一頁

- **WHEN** 符合條件的交易有 130 筆、未指定每頁筆數
- **THEN** 回傳最新 50 筆與 `next_cursor`；以該 cursor 再查回傳下一批

#### Scenario: 日期範圍顛倒

- **WHEN** `date_from` 為 `2025-12-31`、`date_to` 為 `2025-01-01`
- **THEN** 回傳錯誤「起始日期不可晚於結束日期」

#### Scenario: 查詢某批匯入

- **WHEN** 以 `create_transactions` 回傳的 `import_batch_id` 查詢
- **THEN** 只回傳該批匯入的交易

## ADDED Requirements

### Requirement: validate_transactions 檢查待匯入清單且不寫入

`validate_transactions` SHALL 接受 `account_id` 與 1～50 筆待匯入列（`transaction_date`、`symbol`、`market`、`transaction_type`（`BUY`／`SELL`）、`quantity`、`price`，選填 `asset_type`（預設 `STOCK`）、`currency`（預設依市場：TW→TWD、US→USD）、`fee`、`tax`（預設 0）、`notes`、`keep_duplicate`）。帳戶 SHALL 屬於權杖使用者，否則回傳「找不到帳戶」。每列 SHALL 回報 `status`：`ok`、`duplicate`（疑似重複且未標記保留）、`invalid`（附繁中原因，沿用 App 交易表單的驗證規則與訊息）、`oversell`（附可賣數量），以及 `new_symbol`（AssetAnchor 尚無此代號、匯入時會建立）。代號不在 AssetAnchor 時 SHALL 向報價來源確認該市場確實存在此代號，查無時該列 SHALL 為 `invalid`「找不到此代號，請確認代號與市場」。工具 SHALL 回傳正規化後的清單（金額為 10 位小數 string）與確認碼；全部列皆為 `ok` 時才回傳確認碼。工具 SHALL NOT 寫入任何資料。

#### Scenario: 全部正確

- **WHEN** 驗證 2 筆合法的台股買入
- **THEN** 兩列 `status` 皆為 `ok`，回傳確認碼與正規化金額（例如 `"580.0000000000"`）

#### Scenario: 混雜問題列

- **WHEN** 清單含一筆與既有交易重複的列、一筆台股卻填 USD 的列、一筆超賣的賣出
- **THEN** 三列分別為 `duplicate`、`invalid`（「台股交易幣別須為 TWD」）、`oversell`，且不回傳確認碼

#### Scenario: 代號市場錯誤

- **WHEN** 待匯入列為 `market: US`、`symbol: 0050`，且 AssetAnchor 與報價來源皆查無此美股代號
- **THEN** 該列為 `invalid`「找不到此代號，請確認代號與市場」

#### Scenario: 超過筆數上限

- **WHEN** 待匯入 51 筆
- **THEN** 回傳錯誤「一次最多匯入 50 筆，請分批」

### Requirement: create_transactions 只寫入使用者確認過的清單

`create_transactions` SHALL 要求 `transactions.write` scope，接受與 `validate_transactions` 相同的輸入加上 `confirmation_token`。確認碼 SHALL 綁定權杖使用者、帳戶與正規化後的完整清單，且 30 分鐘內有效；清單任何欄位與驗證時不同、或確認碼過期時 SHALL 拒絕並要求重新驗證。寫入前 SHALL 重新執行完整驗證，任一列不是 `ok` 時 SHALL 整批拒絕。通過時 SHALL 以單一 batch 原子寫入所有列（`source: 'mcp'`、同一 `import_batch_id`、`created_at`／`updated_at` 為伺服器時間，文件內容與 App 新增交易相同），並為 `new_symbol` 的代號建立 `symbols` 文件。回傳 SHALL 含 `import_batch_id` 與新交易的 `transaction_id`。

#### Scenario: 確認後匯入

- **WHEN** 以 `validate_transactions` 回傳的確認碼與相同清單呼叫
- **THEN** 寫入全部列，回傳 `import_batch_id` 與 `transaction_id` 清單，App 交易列表即時出現

#### Scenario: 清單被改過

- **WHEN** 使用確認碼時把其中一列的數量從 1000 改成 100
- **THEN** 拒絕寫入並回覆「清單與確認時不同，請重新驗證後再匯入」

#### Scenario: 驗證後資料已變動

- **WHEN** 驗證後、匯入前，使用者在 App 刪掉了該股的買入，使待匯入的賣出變成超賣
- **THEN** 整批拒絕並回報超賣的列，不寫入任何一筆

#### Scenario: 新代號一併建立

- **WHEN** 匯入的代號在 AssetAnchor 尚不存在
- **THEN** 交易寫入的同時建立 `symbols/{market}_{symbol}`，App 之後能顯示名稱與報價
