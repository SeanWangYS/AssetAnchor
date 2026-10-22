# mcp-server Specification

## Purpose

The remote MCP endpoint that Claude connectors call: bearer-token protected, stateless Streamable HTTP, scoped to the token owner's data, and the contracts of its tools (ADR-0011).

## Requirements

### Requirement: MCP 端點以 Streamable HTTP 無狀態運作並要求 bearer token

系統 SHALL 在 `mcp` Cloud Function 提供遠端 MCP 端點，傳輸方式為 Streamable HTTP、無狀態（不保留 session）。每個請求 SHALL 帶有效的 bearer 存取權杖（見 `mcp-authorization`）且 scope 含 `transactions.read`；缺少或無效時 SHALL 回 HTTP 401 `invalid_token`，scope 不足時 SHALL 回 HTTP 403 `insufficient_scope`。伺服器 SHALL 宣告名稱 `assetanchor` 與版本，並只公開本 change 定義的工具。

#### Scenario: 帶有效權杖列出工具

- **WHEN** Claude 以有效權杖送出 `tools/list`
- **THEN** 回傳 `list_accounts`、`list_transactions`、`search_symbol` 三個工具，且皆標示為只讀（`readOnlyHint: true`）

#### Scenario: 權杖被作廢後呼叫

- **WHEN** 已被管理者作廢的權杖呼叫任何工具
- **THEN** 回 HTTP 401 `invalid_token`

### Requirement: 資料存取一律綁定權杖的 uid

所有工具 SHALL 只讀取權杖所屬使用者的 `users/{uid}/**` 資料與全域 `symbols` 集合。工具輸入 SHALL NOT 含任何使用者識別欄位；即使請求夾帶其他 uid、帳戶 ID 或交易 ID 指向他人資料，SHALL 只在權杖使用者的範圍內查詢，查不到時視為不存在。

#### Scenario: 指定他人的帳戶 ID

- **WHEN** 使用者 A 的權杖以使用者 B 的 `account_id` 呼叫 `list_transactions`
- **THEN** 回傳空結果與「找不到帳戶」錯誤，不洩漏 B 的任何資料

### Requirement: list_accounts 列出使用者的帳戶

`list_accounts` SHALL 回傳使用者的帳戶，每筆含 `account_id`、`account_name`、`broker`、`account_type`、`base_currency`、`market`、`is_active`，依 App 的 `display_order` 排序。預設 SHALL 只回傳 `is_active: true` 的帳戶；參數 `include_inactive: true` 時一併回傳停用帳戶。

#### Scenario: 使用者有兩個啟用帳戶與一個停用帳戶

- **WHEN** 呼叫 `list_accounts` 不帶參數
- **THEN** 回傳兩個啟用帳戶，順序與 App 帳戶頁一致

#### Scenario: 沒有帳戶

- **WHEN** 使用者尚未建立任何帳戶
- **THEN** 回傳空清單，並附繁中提示「請先在 AssetAnchor App 建立帳戶」

### Requirement: list_transactions 依條件查詢交易

`list_transactions` SHALL 支援選填篩選：`account_id`、`symbol`（搭配選填 `market`）、`date_from`、`date_to`（`YYYY-MM-DD`，含端點），結果依 `transaction_date` 由新到舊排序。每筆 SHALL 含 `transaction_id`、`account_id`、`transaction_date`、`symbol`、`market`、`asset_type`、`transaction_type`、`currency`、`quantity`、`price`、`fee`、`tax`、`notes`。金額與數量 SHALL 以 Firestore 儲存的 decimal string 原樣回傳，SHALL NOT 轉成浮點數。每頁 SHALL 最多 100 筆（預設 50），超過時 SHALL 回傳 `next_cursor` 供下一頁使用。日期格式不合法或 `date_from` 晚於 `date_to` 時 SHALL 回傳繁中錯誤，不執行查詢。

#### Scenario: 依代號與日期查詢

- **WHEN** 呼叫 `list_transactions`，`symbol` 為 `2330`、`market` 為 `TW`、`date_from` 為 `2025-01-01`
- **THEN** 只回傳該使用者 2025-01-01 起的台積電交易，金額為 decimal string（例如 `"580.0000000000"`）

#### Scenario: 結果超過一頁

- **WHEN** 符合條件的交易有 130 筆、未指定每頁筆數
- **THEN** 回傳最新 50 筆與 `next_cursor`；以該 cursor 再查回傳下一批

#### Scenario: 日期範圍顛倒

- **WHEN** `date_from` 為 `2025-12-31`、`date_to` 為 `2025-01-01`
- **THEN** 回傳錯誤「起始日期不可晚於結束日期」

### Requirement: search_symbol 對應名稱或代號到 App 的 symbol

`search_symbol` SHALL 接受 `query`（代號或名稱）與選填 `market`，回傳最多 10 筆候選，每筆含 `symbol_id`、`symbol`、`market`、`asset_type`、`currency`、`name`、`name_zh`。比對 SHALL 依序涵蓋：代號完全相符（不分大小寫）、代號前綴、使用者自己交易過的 symbol 的中英文名稱包含查詢字串。查無結果時 SHALL 回傳空清單與提示「AssetAnchor 尚無此代號」，SHALL NOT 建立新 symbol（建立屬 change 2）。

#### Scenario: 以代號查詢台股 ETF

- **WHEN** `query` 為 `0050`
- **THEN** 候選第一筆為 `symbol_id` `TW_0050`、`market` `TW`、`currency` `TWD`

#### Scenario: 以中文名稱查詢已交易過的股票

- **WHEN** 使用者曾交易台積電，`query` 為 `台積電`
- **THEN** 候選含 `TW_2330`

#### Scenario: 查無代號

- **WHEN** `query` 為 `ZZZZ`
- **THEN** 回傳空清單與提示「AssetAnchor 尚無此代號」，`symbols` 集合沒有新增文件

### Requirement: 工具錯誤以繁中訊息回傳且不洩漏內部細節

工具執行失敗時 SHALL 以 MCP 工具錯誤（`isError: true`）回傳繁中訊息，SHALL NOT 包含堆疊、Firestore 路徑或其他使用者資料；內部錯誤細節 SHALL 寫入 functions log 並附 uid 與工具名稱。

#### Scenario: Firestore 暫時無法使用

- **WHEN** `list_transactions` 執行時 Firestore 回傳錯誤
- **THEN** Claude 收到「暫時無法讀取交易，請稍後再試」，functions log 記錄原始錯誤、uid 與 `list_transactions`
