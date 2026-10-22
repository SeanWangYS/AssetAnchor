## Context

Change 1（`add-mcp-auth-readonly`，PR #88）已建好 `mcp` 函式、OAuth 與三個只讀工具。本 change 加入匯入交易的兩個工具。需求定案（2026-10-21）：寫入前在 Claude 對話中逐筆確認；疑似重複預設不匯入；關鍵欄位不准猜；造成超賣整批拒絕；帳戶由使用者從既有帳戶中選；可建立新代號（做法同 App）。

現況：

- App 新增交易走 `transactionInputSchema`（zod，含市場／幣別一致性）→ `buildTransactionDoc`（Money 正規化）→ `setDoc` + server timestamp。
- 超賣規則是**帳戶層級**、同幣別 lot、依時序（App 表單用 `sellableQuantityForAccount`）。
- App 以 `orderBy('transaction_date','desc')` 讀交易，同一天的順序取決於文件 ID；`deriveHoldings` 同日保留輸入順序，所以當沖的推導結果取決於隨機 ID。
- 後端 `upsertSymbolMeta`（`apps/functions/src/symbols`）是 `symbols` 的寫入者：抓 Yahoo metadata 後建立文件；建立會觸發 `onSymbolCreatedFetchQuote` 抓第一筆報價。

## Goals / Non-Goals

**Goals:** AI 只能寫入使用者在對話中看過、確認過的清單；寫入結果與 App 手動輸入完全一致；任何會讓持倉出錯的批次都進不來；一批要嘛全寫、要嘛全不寫。

**Non-Goals:** 修改／刪除（change 3）、App UI、股利等其他類型、建立帳戶。

## Decisions

### D1. 兩步驟：validate 回傳確認碼，create 只認確認碼

- `validate_transactions` 正規化並檢查整批，全部 `ok` 時回傳確認碼：`base64url(exp) . HMAC-SHA256(key, uid | account_id | canonical JSON(正規化清單) | exp)`，30 分鐘有效。
- `create_transactions` 用同樣的輸入重新正規化、重算 HMAC 比對；不同即拒絕。之後再完整驗證一次（資料可能在兩步之間變動），任一列失敗整批拒絕。
- HMAC 金鑰取 `MCP_COOKIE_KEYS` 第一把再以固定標籤 HMAC 衍生（不新增 secret）；emulator 用開發金鑰。
- **理由**：「寫入前人工確認」不能只靠 AI 自律；確認碼讓伺服器保證寫入的就是驗證過、顯示給使用者看過的那份清單。使用者在對話中修改任何一列，AI 必須重新驗證取得新確認碼。
- **替代方案**：create 帶 `confirmed: true`（AI 可以直接填，無保證）；把待匯入清單暫存在 Firestore 由使用者在 App 確認（需求已選在對話中確認）。

### D2. 驗證規則重用 App 的單一事實來源

- 每列組成 `TransactionInput` 後用 shared `transactionInputSchema.safeParse`（錯誤訊息即 App 表單的繁中訊息），再用 `buildTransactionDoc` 正規化（Money 10 位小數）。
- 預設值：`asset_type` 預設 `STOCK`；`currency` 依市場預設（TW→TWD、US→USD；CRYPTO／OTHER 必填）；`fee`、`tax` 預設 `'0'`；`notes` 預設空字串。
- 數值以字串傳入（AI 從截圖讀到的原文），避免 JSON number 的浮點誤差。

### D3. 重複與超賣檢查放在 shared（TDD）

- `transactionDuplicateKey(tx)`：`date|account|MARKET|SYMBOL|type|qty(10dp)|price(10dp)`。
- `findDuplicates(existing, proposed)`：回傳與既有或同批前列相同的 proposed index。
- `findImportOversells(existing, proposed)`：合併後依帳戶與 `(market, symbol, currency)` 分組，時序模擬持有量；先算「只有 existing」時已超賣的 SELL 集合，排除它們，只回報 proposed SELL 造成的新超賣（含可賣與欲賣數量）。
- 時序規則與 `deriveHoldings` 共用同一個排序函式。

### D4. `deriveHoldings` 同日排序：先 BUY 後 SELL

- 抽出 `chronological()` 為 export 的 `sortTransactionsChronologically`：先比 `transaction_date`，同日 BUY 在 SELL 前，同類型維持輸入順序。
- **理由**：App 同日順序取決於文件 ID，當沖可能被誤判超賣而讓該 symbol 從持倉消失（`deriveHoldingsSafe` 會跳過）。固定規則後 App 與 MCP 檢查一致。只影響同一天有買有賣的情況。
- **替代方案**：保留輸入順序、MCP 另用嚴格規則（兩邊判斷可能不一致）。

### D5. 代號存在性與建立

- validate：先查 `symbols/{market}_{symbol}`；不存在時以 `yahooSymbolMetaProvider.fetch(market, symbol)` 確認（同一批相同代號只查一次）；查無即 `invalid`。CRYPTO／OTHER 市場不做 Yahoo 確認（與 App 一致，允許手動代號）。
- create：交易 batch commit 成功後，對 `new_symbol` 代號呼叫 `upsertSymbolMeta`（失敗只記 log，不影響已寫入的交易；App 之後開頁仍會補抓）。

### D6. 原子寫入與欄位

- 一個 Firestore batch 寫入全部交易（≤50 筆，遠低於 500 上限）：`{...buildTransactionDoc(input, {transactionId}), source: 'mcp', import_batch_id, created_at, updated_at}`（server timestamp）。`import_batch_id` 為 `imp_` + 隨機 id。
- 帳戶以 `users/{uid}/accounts/{account_id}` 存在且 `is_active` 為準；停用帳戶拒絕（「此帳戶已停用」）。

### D7. Scope

- resource server scope 改為 `transactions.read transactions.write`；Grant 一次授予兩者；寫入工具在 handler 內檢查 `transactions.write`，缺少時回工具錯誤請使用者重新連線（舊權杖不會被 401，只讀工具照常可用）。
- 同意頁權限清單加入「新增交易」。

## Firestore schema 變更（對照 planning §6）

`users/{uid}/transactions/{transactionId}`（planning §6 Collection 3）新增兩個**選填**欄位：

| 欄位              | 型別            | 說明                                      | 三端影響                                                        |
| ----------------- | --------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `source`          | `'mcp'`（選填） | 透過 MCP 匯入時寫入；缺欄位＝App 手動輸入 | mobile：不讀不寫；functions：MCP 寫入；shared：型別新增選填欄位 |
| `import_batch_id` | string（選填）  | 同一次 `create_transactions` 的批次 ID    | 同上；`list_transactions` 可篩選                                |

既有文件不需遷移；rules 不變（`users/{uid}/**` 本人讀寫，MCP 以 Admin SDK 寫入）。持倉與報酬計算不讀這兩個欄位。

## Risks / Trade-offs

- [AI 讀錯截圖數字] → 關鍵欄位必填、不准猜（tool description 明示）；確認碼保證寫入的是使用者看過的清單。
- [Yahoo 限流或暫時失敗導致新代號驗證失敗] → 該列回 `invalid` 並附「暫時無法確認代號，請稍後再試」，不寫入；已存在於 `symbols` 的代號不受影響。
- [確認碼金鑰輪替] → 輪替 cookie key 後未使用的確認碼失效，重新驗證即可。
- [同日排序變更影響 App 既有持倉] → 只改同日買賣的處理順序；原本會被誤判的當沖變正確，原本正確的不受影響（同日先買後賣只會讓可賣量更早增加）。
- [兩步之間資料變動] → create 重新驗證整批。

## Migration Plan

重新部署 `functions:mcp`、`hosting`（同意頁文字）。無資料遷移。回滾：部署前一版 `mcp`；已匯入的交易是一般交易文件，可在 App 或 change 3 的工具刪除。

## Open Questions

無。
