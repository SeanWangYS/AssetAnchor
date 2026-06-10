## Why

投資組合追蹤的核心是「交易事件流」（event sourcing，planning doc §6 Collection 3）——持倉、成本、損益全是交易的衍生計算。Sprint 2 完成帳戶後，必須先能**記錄一筆買入（BUY）交易**，後續的持倉動態計算（Sprint 3 Change 2）才有資料可推導。寫入第一筆 transaction 也是 planning doc §13.3 的關鍵里程碑——驗證 mobile ↔ Firestore ↔ `packages/shared` types 整條鏈路。

本 change 同時把 ADR-0007 決定的測試地基一次架好（service 拆「純轉換 / I/O」seam、transactions 隔離 rules 測試進 CI、mobile 純邏輯 coverage gate），讓 Change 2 的成本計算邏輯一落地就被武裝的 CI 守住。

## What Changes

- **新增 transaction 輸入流程（先 BUY、先單幣別）**：交易 Tab 的 AddTransaction modal，react-hook-form + `packages/shared` zod schema 驗證，金額/數量經 `Money` 轉成 10 位小數 string。
- **`packages/shared` 新增 transaction input zod schema**：BUY 單幣別的使用者輸入子集（symbol / market / asset_type / 數量 / 單價 / 手續費 / 稅 / 交易日 / 帳戶 / 備註），對齊 §6 `TransactionDocument`。
- **mobile `transactionService` 採 seam 紀律（ADR-0007）**：拆成純函式 `buildTransactionDoc(input, ctx)`（回傳純 `TransactionDocument` 物件，含對稱 `amounts` map 的單幣別填法）與 I/O `writeTransaction(uid, doc)`（`setDoc`）。
- **`core/firestore` 新增 transactions ref helpers**：`transactionsCol(uid)` / `transactionDocRef(uid, id)`。
- **交易基礎列表**：交易 Tab 顯示已寫入交易的時序清單（驗證寫入、達成里程碑 demo；個股 timeline 留 Change 2）。
- **Firestore rules 測試 + CI**：補 transactions 子集合 per-user 隔離測試（比照 Sprint 2 accounts），並把 rules 測試以 emulator 搬進 CI（ADR-0007 §3）。
- **CI 分層測試強制**（ADR-0007 §3）：mobile 純邏輯測試進 CI、用 path-glob coverage gate 只 gate 純邏輯檔（mapper / calculator / derivation），排除 screens 與 I/O；維持 `packages/shared` 全域 ≥90%。
- **新增 ADR-0004**（event sourcing schema + 動態 holdings）：記錄已於 §6 拍板的 schema 決策。

## Capabilities

### New Capabilities

- `transaction-entry`: 記錄一筆買入交易事件——表單輸入與 zod 驗證、`Money` 精度處理、組成對齊 §6 schema 的 `TransactionDocument`（單幣別 `amounts` 子集）、寫入使用者 transactions 子集合、per-user 隔離、以時序清單檢視已記錄交易。

### Modified Capabilities

<!-- 無。§6 transactions schema 早已定義且 packages/shared types 已對齊（單幣別 BUY 為其子集，預期零 schema 變更）；rules 的 users/{uid}/{document=**} catch-all 已涵蓋 transactions 隔離，本 change 僅補測試與 CI，不改 rules 行為，故不修改既有 account-management / auth capability 的 requirements。 -->

## Impact

- **packages/shared**：新增 `schemas/transaction.ts`（zod）+ 測試；可能微調 `types/transaction.ts` 的 export（預期不改欄位）。新增 enum 測試（若 BUY 路徑觸及 transaction_type / asset_type / market）。
- **apps/mobile**：`features/transactions/`（transactionService 拆 build/write、transactionsStore、AddTransactionScreen modal、TransactionForm、基礎 TransactionsList）；`core/firestore` 新增 transactions refs；交易 Tab 導航接上 AddTransaction modal（§11.3 多入口之一）。
- **firebase**：`firestore.rules` 行為不變；新增 transactions 子集合隔離 rules 測試。
- **infra（CI）**：`.github/workflows/ci.yml` 新增 rules emulator job + mobile 純邏輯 test job；`apps/mobile/jest.config` 加 path-glob `coverageThreshold`。
- **docs**：新增 `docs/adr/0004-event-sourcing-schema.md`。
- **依賴方向**：`features/transactions → core/firestore | services/firebase | packages/shared`，不 import 其他 feature（符合架構紀律）。

## Non-goals

明確排除（留待後續 sprint / change，守 MVP 邊界 planning doc §3 / §13.2）：

- **SELL 交易與已實現損益** → Sprint 5。本 change 只做 BUY。
- **多幣別 / 匯率換算（FX）** → Sprint 4。本 change 單幣別：`amounts` map 只填原幣別一筆、`rate=1`、`amounts_status=COMPLETE`，不觸發台銀匯率抓取。
- **持倉動態計算（costBasis / holdings 推導）、HoldingsOverview、AssetDetail、個股對帳 timeline** → Sprint 3 Change 2（`add-holdings-derivation`）。本 change 僅提供時序基礎列表以驗證寫入。
- **報價 / 現價 / 未實現損益** → Sprint 5。
- **symbols collection 動態建立與 metadata 補齊** → Sprint 6。本 change symbol 為交易上的純文字欄位，不寫 symbols collection。
- **BUY 自動扣帳戶 cash_balances** → 不做；transaction 維持純事件，現金維持 Sprint 2 手動編輯（帳戶 cash 對帳留 Sprint 6）。
- **其他 transaction_type**（DIVIDEND_CASH / SPLIT / SPINOFF / crypto 等）→ 第二/三階段。
- **交易編輯 / 刪除的完整流程** → 本 change 聚焦 create；edit/delete 視 task 餘裕，預設留後續。
