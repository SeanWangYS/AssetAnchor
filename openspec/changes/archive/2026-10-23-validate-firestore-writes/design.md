## Context

Client 寫入點只有四個檔（`userDoc.ts`、`preferencesStore.ts`、`accountService.ts`、`transactionService.ts`），寫三個路徑；`symbols` 由後端寫。2026-10-23 唯讀掃描 production：5 個 user、12 個 account、37 筆交易全部是目前的欄位形狀、金額皆為 10 位小數字串、沒有舊版（ADR-0005 前）欄位。

## Goals / Non-Goals

**Goals:** 擋下格式錯誤或越權的 client 寫入；不影響現有 App 的任何正常寫入；rules 與 shared 不漂移。

**Non-Goals:** 驗算 `total = price × quantity`（rules 無 decimal 運算）；檢查 `account_id` 是否指向存在的帳戶（多一次 `get()` 計費，且編輯時已由 App 保證）；rate limit。

## Decisions

- **D1 create 用 `hasOnly` + `hasAll`**：欄位集與 shared builder 完全一致，多欄、缺欄皆拒絕。
- **D2 update 用 `diff().affectedKeys().hasOnly(...)`**：只限制「被改的欄位」，不要求整份文件沒有額外欄位。交易編輯是 merge 寫入，MCP 的 `source`／`import_batch_id` 與未來可能的舊欄位會被保留，不會讓編輯失敗；同時 client 無法改 `created_at`、`transaction_id`、`source`。
- **D3 金額格式**：`^-?[0-9]{1,20}[.][0-9]{10}$`（`Money.toDecimalString()`）；交易金額與數量不可為負，現金餘額可為負。只驗格式不驗 > 0：zod 的 `> 0` 對極小值（如 `0.00000000001`）會被 Money 四捨五入成 `0.0000000000`，rules 再擋會變成資料默默消失（optimistic write 被回滾）。
- **D4 暱稱**：create 允許 `''`（email 註冊沒有 displayName）；update 只在 `display_name` 被改時要求 1–50 字，否則 email 註冊者建立第一個帳戶（同 batch 更新 `settings.default_account_id`）會被擋。
- **D5 時戳**：`created_at`／`updated_at`／`cash_balances_updated_at`（有改時）必須等於 `request.time`（`serverTimestamp()`）。
- **D6 symbols 關閉 client 寫入**：App 從未寫；後端用 Admin SDK 不受 rules 影響。
- **D7 防漂移**：rules 測試 import shared 的 enum 逐一 create；交易 payload 由 shared `buildTransactionDoc` 產生。新增 enum 值或改 builder 欄位時測試會失敗。
- **D8 長度上限同步到 zod**：rules 的上限加進 zod，表單才會顯示錯誤訊息。

## Risks / Trade-offs

- App 是 optimistic write：rules 太嚴會表現成「資料出現後消失」＋通用重試提示。以 production 掃描與 rules 測試（真實 builder payload、batch 寫入）降低風險；部署後請 owner 實際新增／編輯一筆交易與帳戶確認。
- enum 寫死在 rules：以 D7 測試防漂移。

## Migration Plan

1. merge → owner `npx -y firebase-tools@15.34.1 deploy --only firestore:rules --project assetanchor-832df`。
2. owner 在 TestFlight App：新增交易、編輯交易、改現金餘額、切顯示幣別。
3. 回退：`git revert` 後重新部署 rules（rules 部署約 1 分鐘生效）。
