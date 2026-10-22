## Context

Change 1、2 已提供登入、只讀工具與確認碼匯入。本 change 加入修改與刪除。需求定案：兩段式確認、只能指定 ID 或批次、單次上限 20 筆（依批次刪除不受此限，上限即該批的 50 筆）、造成超賣整批拒絕、一律硬刪除。App 刪除交易同樣是硬刪除，與本 change 一致。

## Goals / Non-Goals

**Goals:** 破壞性操作只能執行使用者在對話中看過的那一次；任何會讓持倉出錯的修改或刪除都進不來；與 App 編輯產生相同的文件。

**Non-Goals:** 軟刪除／還原、條件式刪除、App UI。

## Decisions

### D1. 預覽與執行拆成不同工具

- 預覽工具標 `readOnlyHint: true`，執行工具標 `destructiveHint: true`。Claude 會在執行前請使用者同意工具呼叫，預覽則不打擾。
- **替代方案**：同一工具以 `dry_run` 切換（破壞性標記會讓預覽也觸發權限提示；也比較容易讓 AI 誤直接執行）。

### D2. 確認碼重用 change 2 的 HMAC

- 修改：`subject = update:{transaction_id}`，rows = `[修改前, 修改後]`（皆為正規化內容）。執行時重新讀取該交易，若現值不等於綁定的修改前內容，即判定「交易在確認後已被修改」。
- 刪除：`subject = delete`，rows = 依 `transaction_id` 排序的每筆完整內容。任一筆已不存在或內容不同即拒絕。
- 正規化內容取交易文件的使用者欄位（日期、帳戶、代號、市場、類型、幣別、數量、單價、手續費、交易稅、備註），不含時間戳。

### D3. 超賣以「變更前後比較」判斷

- 新增 shared `findNewOversells(before, after)`：分別模擬兩組，回傳只在 `after` 超賣的 SELL ID。修改時 `after` 以新內容取代舊內容（可能換帳戶或代號），刪除時 `after` 移除指定交易。
- 匯入沿用既有的 `findImportOversells`（能指出新列的可賣數量），兩者共用同一套時序與分組規則。

### D4. 修改的驗證與寫入

- 合併：現值 → 套用 `changes` → `normalizeImportRow`（App 表單 schema 與訊息）。改代號時同匯入一樣確認代號存在，必要時在寫入後建立 symbol。
- 重複：修改後若與另一筆（排除自己）六欄相同，`status: duplicate`，除非 `keep_duplicate: true`。
- 寫入：`buildTransactionDoc(input, { transactionId })` 加 `updated_at`，以 `set(..., { merge: true })` 寫回，保留 `created_at`、`source`、`import_batch_id`（與 App `updateTransaction` 相同做法）。

### D5. 刪除

- `transaction_ids` 與 `import_batch_id` 擇一；ID 最多 20 筆；批次以 `where('import_batch_id','==',…)` 取得。
- 單一 batch 硬刪除。

## Risks / Trade-offs

- [AI 選錯要刪的交易] → 預覽逐筆列出完整內容；只接受 ID；確認碼綁定內容。
- [硬刪除無法還原] → 決策取捨；破壞性標記讓 Claude 再次請使用者同意；可依批次快速清除錯誤匯入。
- [截圖或對話中夾帶指令誘導刪除] → 破壞性工具需使用者同意工具呼叫，且只能刪預覽過的那一組。

## Migration Plan

重新部署 `functions:mcp`、`hosting`。無資料變更。回滾：部署前一版 `mcp`。

## Open Questions

無。
