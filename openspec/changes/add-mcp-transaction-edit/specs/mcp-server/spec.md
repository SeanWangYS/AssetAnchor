## MODIFIED Requirements

### Requirement: MCP 端點以 Streamable HTTP 無狀態運作並要求 bearer token

系統 SHALL 在 `mcp` Cloud Function 提供遠端 MCP 端點，傳輸方式為 Streamable HTTP、無狀態（不保留 session）。每個請求 SHALL 帶有效的 bearer 存取權杖（見 `mcp-authorization`）且 scope 含 `transactions.read`；缺少或無效時 SHALL 回 HTTP 401 `invalid_token`，scope 不足時 SHALL 回 HTTP 403 `insufficient_scope`。伺服器 SHALL 宣告名稱 `assetanchor` 與版本。只讀工具 SHALL 標示 `readOnlyHint: true`；寫入工具 SHALL 標示 `readOnlyHint: false`（修改與刪除另標示 `destructiveHint: true`），且權杖缺少 `transactions.write` 時 SHALL 以工具錯誤回覆「請在 Claude 重新連線 AssetAnchor 以授權寫入」，不寫入任何資料。

#### Scenario: 帶有效權杖列出工具

- **WHEN** Claude 以有效權杖送出 `tools/list`
- **THEN** 回傳只讀的 `list_accounts`、`list_transactions`、`search_symbol`、`validate_transactions`、`preview_update_transaction`、`preview_delete_transactions`，寫入的 `create_transactions`，以及破壞性的 `update_transaction`、`delete_transactions`

#### Scenario: 權杖被作廢後呼叫

- **WHEN** 已被管理者作廢的權杖呼叫任何工具
- **THEN** 回 HTTP 401 `invalid_token`

#### Scenario: 只有讀取權限的舊權杖呼叫寫入工具

- **WHEN** 只含 `transactions.read` 的權杖呼叫 `create_transactions`
- **THEN** 回傳工具錯誤「請在 Claude 重新連線 AssetAnchor 以授權寫入」，交易集合不變

## ADDED Requirements

### Requirement: 修改交易需先預覽並以確認碼執行

`preview_update_transaction` SHALL 接受 `transaction_id` 與要修改的欄位（與匯入列相同的欄位，另可改 `account_id`），以該交易現值合併修改後，套用與匯入相同的驗證（格式、代號存在、重複、帳戶），並以 `findNewOversells` 檢查修改後是否造成任何超賣。回傳 SHALL 含修改前後的完整內容（decimal string）、`status`（`ok`／`invalid`／`duplicate`／`oversell`）與說明；只有 `ok` 時才回傳確認碼。確認碼 SHALL 綁定使用者、交易 ID、修改前內容與修改後內容，30 分鐘有效。`update_transaction` SHALL 要求 `transactions.write`、接受相同輸入加確認碼；交易在預覽後被改動、修改內容不同、或確認碼過期時 SHALL 拒絕。通過時 SHALL 以 App 相同的文件格式覆寫該交易（保留 `created_at`、`source`、`import_batch_id`，更新 `updated_at`）。交易不存在或不屬於權杖使用者時 SHALL 回傳「找不到交易」。

#### Scenario: 修改數量

- **WHEN** 預覽把一筆 BUY 的 `quantity` 由 1000 改為 100，無後續賣出
- **THEN** 回傳修改前 `"1000.0000000000"`、修改後 `"100.0000000000"`、`status: ok` 與確認碼；以確認碼執行後該交易數量為 100

#### Scenario: 修改造成超賣

- **WHEN** 預覽把較早的 BUY 數量改小，使之後的 SELL 超賣
- **THEN** `status: oversell`，說明指出哪一天的賣出會超賣，不回傳確認碼

#### Scenario: 預覽後交易被改動

- **WHEN** 預覽後使用者在 App 改了該筆交易，再以舊確認碼執行
- **THEN** 拒絕並回覆「交易在確認後已被修改，請重新預覽」

### Requirement: 刪除交易需先預覽並以確認碼執行

`preview_delete_transactions` SHALL 接受 `transaction_ids`（1～20 筆）或 `import_batch_id`（擇一）。指定的交易 SHALL 全部屬於權杖使用者，否則回傳「找不到交易」並列出不存在的 ID。預覽 SHALL 逐筆列出完整內容，並以 `findNewOversells` 檢查刪除後是否造成超賣；有超賣時 SHALL 說明並不回傳確認碼。確認碼 SHALL 綁定使用者與這組交易的 ID 與內容，30 分鐘有效。`delete_transactions` SHALL 要求 `transactions.write`、接受相同指定方式加確認碼；任何一筆在預覽後被修改或已不存在、指定的組合不同、或確認碼過期時 SHALL 拒絕。通過時 SHALL 以單一 batch 硬刪除全部指定交易，回傳刪除筆數。SHALL NOT 提供依條件刪除。

#### Scenario: 刪除單筆

- **WHEN** 預覽刪除一筆沒有後續賣出的 BUY，再以確認碼執行
- **THEN** 該交易被刪除，回傳刪除 1 筆

#### Scenario: 刪除整批匯入

- **WHEN** 以某次匯入的 `import_batch_id` 預覽並執行刪除
- **THEN** 該批全部交易被刪除，其他交易不受影響

#### Scenario: 超過 20 筆

- **WHEN** `transaction_ids` 有 21 筆
- **THEN** 回傳錯誤「一次最多刪除 20 筆；要刪整批匯入請改用 import_batch_id」

#### Scenario: 刪除造成超賣

- **WHEN** 預覽刪除一筆之後仍有賣出依賴它的 BUY
- **THEN** 說明哪一天的賣出會超賣，不回傳確認碼；執行時同樣拒絕
