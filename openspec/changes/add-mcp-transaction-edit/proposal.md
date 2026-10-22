## Why

匯入難免出錯：AI 讀錯一個數字、使用者發現某批匯錯了帳戶。需求定案（2026-10-21）要求透過 AI 也能修改與刪除交易，並配上嚴格護欄：兩段式確認、只能指定 ID 或批次、單次上限 20 筆、造成超賣就整批拒絕、一律硬刪除。本 change 是 ADR-0011 分期的 change 3。

依據：planning §3（編輯／刪除交易）、§4（超賣規則）。

## What Changes

- **`preview_update_transaction`（只讀）→ `update_transaction`（破壞性）**：預覽列出修改前後的完整內容與檢查結果（格式、代號、重複、修改後是否造成任何超賣），回傳確認碼；執行時只接受確認碼對應的那一次修改，且該筆交易在預覽後未被改動。
- **`preview_delete_transactions`（只讀）→ `delete_transactions`（破壞性）**：以交易 ID（最多 20 筆）或 `import_batch_id`（整批）指定；預覽列出每一筆的完整內容並檢查刪除後是否造成超賣（例如刪掉較早的買入讓之後的賣出超賣）；執行時只接受確認碼對應的那一組交易，並以單一 batch 硬刪除。
- **shared 新增 `findNewOversells(before, after)`**（TDD）：比較變更前後，找出因變更才出現超賣的賣出。
- **同意頁權限清單**改為「新增、修改、刪除交易（每次都會先在 Claude 對話中列出讓你確認）」。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `mcp-server`: 工具清單新增四個工具（兩個只讀預覽、兩個破壞性執行）；新增修改與刪除的需求。
- `mcp-authorization`: 同意頁列出修改與刪除權限。
- `transaction-import`: 新增「變更前後的超賣比較」規則，供修改與刪除共用。

## Non-goals

- 軟刪除、垃圾桶、還原（決策：一律硬刪除）。
- 依條件刪除（例如「刪掉 2024 年的交易」）：只接受 ID 或批次 ID。
- App 內 UI 變更。

## Impact

- **程式碼**：`packages/shared`（`findNewOversells`）、`apps/functions/src/mcp/`（四個新工具）、`apps/web`（同意頁文字）。
- **Firestore schema**：無變更。
- **部署（gate）**：重新部署 `functions:mcp` 與 `hosting`。
