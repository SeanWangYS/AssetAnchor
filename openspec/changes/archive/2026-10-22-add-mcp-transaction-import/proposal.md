## Why

Change 1 讓 Claude 能以 App 帳號登入並讀取資料；本 change 完成這個系列的核心價值：使用者把券商截圖丟給 Claude，Claude 解析出交易後，經對話逐筆確認，透過 MCP 一次寫入 AssetAnchor，省去逐筆手動輸入（2026-10-21 owner 定案需求，ADR-0011 分期的 change 2）。

依據：planning §3（交易紀錄管理；第二階段「CSV 匯入」由本系列取代）、§4（加權平均與超賣規則）、§6（交易文件新增兩個選填欄位）。

## What Changes

- **新增 MCP 工具 `validate_transactions`（只讀）**：檢查一批待匯入交易（最多 50 筆），逐筆回報：格式與市場／幣別一致性、代號是否存在（AssetAnchor 沒有時向 Yahoo 確認該市場確實有此代號）、是否與既有交易重複、整批依時序寫入後是否造成帳戶層級超賣。回傳正規化後的清單（decimal string）與一次性的確認碼，不寫入任何資料。
- **新增 MCP 工具 `create_transactions`（寫入）**：只接受與 `validate_transactions` 確認碼完全相符的清單（防止 AI 寫入未經使用者看過的內容），伺服器重新驗證後以單一 batch 原子寫入；疑似重複的列預設拒絕，除非該列明確標記保留。代號不在 AssetAnchor 時一併建立 symbol（沿用後端 `upsertSymbolMeta`，建立後自動抓報價）。
- **交易文件新增選填欄位**（聖牛 schema）：`source`（`'mcp'`；缺欄位視為 App 手動輸入）與 `import_batch_id`。App 不顯示、不寫入，既有資料不需遷移。
- **`list_transactions` 新增 `import_batch_id` 篩選與輸出欄位**，讓使用者能「查看剛剛那批匯入」（change 3 依批次刪除也會用到）。
- **新增 OAuth scope `transactions.write`**：同意頁列出寫入權限；寫入工具要求此 scope。
- **shared 新增純函式**（TDD）：重複判定鍵、批次重複比對、帳戶層級批次超賣檢查。
- **`deriveHoldings` 同日排序固定為先 BUY 後 SELL**：目前同一天的買賣順序取決於 Firestore 文件 ID（等於隨機），當沖可能被誤判超賣；固定順序後 App 推導與 MCP 檢查一致。

## Capabilities

### New Capabilities

- `transaction-import`: 匯入批次的共用規則——交易文件的 `source`／`import_batch_id` 欄位、重複判定鍵與比對、帳戶層級批次超賣檢查（shared 純函式）。

### Modified Capabilities

- `mcp-server`: 工具清單新增 `validate_transactions`、`create_transactions`；寫入工具要求 `transactions.write`；`list_transactions` 新增 `import_batch_id` 篩選與輸出。
- `mcp-authorization`: metadata 與同意頁加入 `transactions.write`。
- `holdings-derivation`: 同一 `transaction_date` 的 BUY 先於 SELL 處理。

## Non-goals

- 修改、刪除交易與依批次刪除（change 3）。
- App 內說明頁（change 4）。
- 股利、分割等其他交易類型（App 尚不支援，Claude 遇到時告知略過）。
- App 顯示交易來源。
- MCP 建立帳戶（決策 Q2：請使用者先到 App 建立）。

## Impact

- **程式碼**：`packages/shared`（新純函式、`TransactionDocument` 選填欄位、`deriveHoldings` 排序）、`apps/functions/src/mcp/`（兩個新工具、scope、確認碼）、`apps/web`（同意頁權限清單）。
- **Firestore schema（聖牛 gate）**：`users/{uid}/transactions/{id}` 新增選填 `source`、`import_batch_id`；rules 不變（仍限本人，MCP 以 Admin SDK 寫入）。
- **部署（gate）**：重新部署 `functions:mcp` 與 `hosting`。已連線的 Claude 需重新授權才能取得寫入權限。
- **App**：無 UI 變更；`deriveHoldings` 同日排序變更只影響「同一天有買有賣」的持倉推導，結果更正確。
