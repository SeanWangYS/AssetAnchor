## Context

Sprint 3 Change 1。承接 Sprint 2（accounts）已建立的 feature-based 結構、Zustand store、Firestore CRUD、zod 表單驗證等 pattern。本 change 是第一個觸及 `transactions` 核心 event-sourcing 表的 change，也是 ADR-0007 測試地基的首次落地點。

關鍵既有事實（已於 explore 階段查證）：

- `packages/shared/src/types/transaction.ts` 的 `TransactionDocument` **已與 planning doc §6 一字對齊**（含對稱 `amounts` map、`lot_id`、`related_transaction_id`、`amounts_status`）。
- `firestore.rules` 的 `users/{uid}/{document=**}` catch-all **已涵蓋** transactions 子集合的 per-user 隔離。
- `firebase/firestore.indexes.json` **已含** §8 的 4 個 transactions 複合索引（Sprint 0 建立）。
- `apps/mobile/src/features/accounts/` 是本 change 要對照與升級的範本：`accountService.ts` 目前把純轉換與 I/O 混在 `createAccount` 裡（ADR-0007 要改掉的反面教材）；`accountsStore.ts` 用 `onSnapshot` + `subscribe/stop`。
- CI（`.github/workflows/ci.yml`）目前只跑 `@assetanchor/shared test:coverage`。

## Goals / Non-Goals

**Goals:**

- 能記錄一筆 BUY（單幣別）交易並寫入 `users/{uid}/transactions/{id}`，達成「第一筆 transaction 寫入」里程碑（§13.3）。
- 確立 ADR-0007 的 service「純轉換 / I/O」seam 先例，供 Sprint 3+ 所有 feature 沿用。
- 把 transactions 隔離 rules 測試與 mobile 純邏輯測試**架進 CI**，讓 Change 2 的成本計算一落地即被守住。
- 證明單幣別 BUY 對 §6 schema 為**零欄位變更**（守聖牛紀律）。

**Non-Goals:**

- SELL、多幣別 FX、報價/現價、持倉計算、AssetDetail、個股對帳 timeline（見 proposal Non-goals 與 Change 2 / Sprint 4–5）。
- symbols collection 寫入、BUY 自動扣現金（見 proposal Non-goals）。
- 交易 edit/delete 的完整流程（聚焦 create）。

## Decisions

### D1. Schema 零變更——單幣別 BUY 是 §6 `TransactionDocument` 的乾淨子集（聖牛逐欄對照）

對照 planning doc §6 Collection 3 與現有 `TransactionDocument` 型別，單幣別 BUY 的每一欄都用既有定義，**不新增、不修改、不刪除任何欄位**：

| 欄位                                | §6 定義          | 單幣別 BUY 的填法           | 差異                |
| ----------------------------------- | ---------------- | --------------------------- | ------------------- |
| `transaction_id`                    | doc id 回寫      | Firestore 自動 id           | 無                  |
| `account_id`                        | 引用 accounts    | 表單選擇                    | 無                  |
| `asset_type` / `symbol` / `market`  | 資產識別         | 表單輸入（symbol 純文字）   | 無                  |
| `transaction_type`                  | enum             | 固定 `"BUY"`                | 無（enum 已有 BUY） |
| `transaction_date`                  | `YYYY-MM-DD`     | 表單日期                    | 無                  |
| `ex_date`                           | 配息用，MVP 留空 | `null`                      | 無                  |
| `quantity`                          | string，支援小數 | `Money` 序列化              | 無                  |
| `original_currency`                 | 原始幣別         | USD / TWD                   | 無                  |
| `amounts`                           | 對稱多幣別 map   | **只填原幣別一筆**（見 D2） | 無（map 容許 1 筆） |
| `amounts_status`                    | PENDING/COMPLETE | `"COMPLETE"`                | 無                  |
| `related_transaction_id` / `lot_id` | 預留             | `null`                      | 無                  |
| `notes`                             | 備註             | 表單或空字串                | 無                  |
| `created_at` / `updated_at`         | timestamp        | `serverTimestamp()`         | 無                  |

→ 三端影響評估結論：**shared types 零變更；mobile 新增消費端；functions 不涉及**。ADR-0004 因此是「記錄 §6 已拍板的 event-sourcing 決策」，非現場改 schema。

**替代方案**：為單幣別另設精簡型別 → 否決，會與 Sprint 4 多幣別分岔、違反「schema 預留多幣別不重構」的原始設計意圖。

### D2. 單幣別 `amounts` map 組成

`amounts[original_currency] = { is_original: true, price, total, fee, tax, rate: "1.0000000000", rate_source: null, rate_type: null, rate_date: null }`，`amounts_status="COMPLETE"`。`total = Money(price) × Money(quantity)`（成交金額，不含 fee/tax；對齊 §6 範例 price 180.5 × qty 10 = total 1805）。手續費進成本基礎的計算是 Change 2 的 costBasis 職責，本 change 只忠實記錄 fee/tax 欄位。

**替代方案**：`total` 含 fee → 否決，與 §6 範例不符，且會讓 Change 2 成本計算重複扣減。

### D3. service 採「純轉換 / I/O」seam（ADR-0007 核心，首次落地）

> **修訂（apply 階段）**：原訂 `buildTransactionDoc` 放 mobile，但實作時發現 mobile jest 從未 import `@assetanchor/shared`（shared 為 ESM、import 帶 `.js`），把用到 `Money` 的純函式放 mobile 會逼 mobile jest 解析 shared ESM（須 moduleNameMapper + transformIgnorePatterns）。改為**把純 builder 放 `packages/shared`**——跑既有已驗證的 ≥90% gate、跨端可重用、對齊 explore「純計算放 shared」決定，且讓 mobile jest 完全不需 import shared（screens/service 屬手動/emulator 範疇，不進 mobile 單元測試）。

```
packages/shared/src/transactions/buildTransactionDoc.ts        ← 純函式（在 shared，進 ≥90% gate）
  buildTransactionDoc(input: TransactionInput, ctx: { transactionId }): NewTransactionDoc
    · 用 Money 把 price/quantity/fee/tax/total → 10 位小數 string
    · 組對稱 amounts map（D2）
    · 回傳 Omit<TransactionDocument,'created_at'|'updated_at'>（不含時戳、不 import firestore）
    · 輸出完全由輸入決定（deterministic），好斷言

apps/mobile/src/features/transactions/transactionService.ts    ← I/O（emulator smoke / 手動）
  writeTransaction(uid, input): Promise<void>
    · 產 transactionDocRef(uid) 取 doc id → 呼叫 shared buildTransactionDoc(input, { transactionId })
    · setDoc，補 created_at/updated_at = serverTimestamp()
```

時戳處理：純函式不碰 `serverTimestamp()`（I/O 副作用）；builder 回傳「不含時戳的 doc 主體」，`writeTransaction` 寫入時補時戳。

**替代方案**：(a) 沿用 accountService 的混寫 → 否決，違反 ADR-0007；(b) builder 留 mobile + 投資 mobile jest 解析 shared → 否決，工時與設定風險高於把純邏輯放 shared，且 shared 才是跨端共用的正確家。

### D4. transactions zod schema 與純 builder 皆放 `packages/shared`

`packages/shared/src/schemas/transaction.ts` 新增 `transactionInputSchema`（BUY 單幣別子集，比照既有 `account.ts`：MVP_CURRENCIES 限 USD/TWD、繁中錯誤訊息），`export type TransactionInput = z.infer<...>`。純 builder 放 `packages/shared/src/transactions/buildTransactionDoc.ts`（見 D3 修訂）。兩者皆純函式、進既有 shared ≥90% gate。`costBasis`/holdings 等純計算邏輯本 change**不**出現（屬 Change 2，屆時放 `packages/shared/src/portfolio/`）。

表單採 **react-hook-form + `@hookform/resolvers` 的 `zodResolver`**（§13.2 原計劃在 Sprint 3 交易表單導入 RHF），讓同一份 `transactionInputSchema` 直接當表單驗證器；RN 以 `<Controller>` 包 `TextInput`。新增依賴 `react-hook-form` + `@hookform/resolvers` 於 `apps/mobile`。

### D5. 資料載入比照 `accountsStore`

`transactionsStore`（Zustand）用 `onSnapshot(query(transactionsCol(uid), orderBy('transaction_date', 'desc')))` + `subscribe(uid)/stop()`，登出/unmount 時 `stop()` 避免 permission-denied 噪音（沿用 accounts D4 經驗）。單欄排序用 Firestore 自動索引，**不需新增複合索引**。

### D6. symbol 純文字、不寫 symbols collection；BUY 不扣現金

（explore 決定）symbol 為交易上的純文字欄位；holdings（Change 2）以 `(market, symbol)` 分組。symbols 動態建立/metadata 留 Sprint 6。transaction 為純事件，**不**連動 `cash_balances`；帳戶 cash 對帳留 Sprint 6。

### D7. CI 分層強制（ADR-0007 §3 落地）

`.github/workflows/ci.yml` 變更：

1. **rules emulator job**（新）：`setup-java` + `firebase emulators:exec --only firestore "pnpm --filter @assetanchor/firebase test:rules"`，把 transactions/accounts 隔離測試搬進 CI（原為缺口）。
2. **mobile 純邏輯 job**（新）：`pnpm --filter @assetanchor/mobile test`（純函式不依賴 RNFB native）。
3. **mobile path-glob coverage gate**：`apps/mobile/jest.config` 的 `coverageThreshold` 用 glob 只 gate mobile 端純邏輯檔（`**/*Ordering.ts`、`**/authErrors.ts`、未來 mobile mapper），**排除** `screens/`、`components/`、store 與 service 的 I/O。注意：交易純 builder 已移至 shared（D3 修訂），由 shared 既有 ≥90% 全域 gate 涵蓋，故 mobile jest **不需** import shared。
4. **維持** `packages/shared` 全域 ≥90% gate。

mobile screen / RNTL flow 與 service I/O 的 emulator smoke → 本機手動，暫不強制進 CI（避免 RNFB native 在 CI 的負擔；ADR-0007 §3）。

## Risks / Trade-offs

- **[mobile jest 純邏輯與 I/O 同檔，path-glob gate 不易精準]** → 把純轉換抽成可單獨被 glob 命中的檔/函式（D3 的 seam 本就要求分離）；gate 以 function/檔層級設定，screens 與 store I/O 明確排除。
- **[CI 引入 Firebase emulator + Java，build 時間與設定增加]** → 一次性成本；rules 是「會 break 才知道」的高風險區，值得（ADR-0007 已評估接受）。
- **[同日交易順序不保證]** → MVP 基礎列表可接受；若 Change 2 的對帳 timeline 需要穩定次序，再以 §8 既有 `symbol ASC, transaction_date ASC` 索引在個股維度排序。
- **[純函式時戳處理]** → build 不產時戳、write 補 `serverTimestamp()`（D3），避免純函式碰 I/O 副作用導致不可測。
- **[symbol 純文字易打錯造成 holdings 分組分裂]** → MVP 自用可接受；輸入正規化（trim/大寫）於 schema 層處理，symbols 正規化留 Sprint 6。

## Migration Plan

無資料遷移（transactions 為新資料、現有使用者無既存交易）。部署面：

1. `firestore.indexes.json` 已含所需索引，無需重新部署索引。
2. rules 行為不變，無需重新部署 rules（僅新增測試）。
3. CI 變更為 workflow 設定，PR merge 後生效；rollback = revert workflow 變更。
4. 分支基於 `docs/testing-strategy-adr`（含 ADR-0007 commit），讓 ADR 隨 Sprint 3 一起進 PR。

## Open Questions

- ADR-0004 的編號落點：planning doc §13.5 將 event sourcing 列為 ADR-004，本 change 一併補上 `docs/adr/0004-event-sourcing-schema.md`（記錄既有決策，非新決策）。
- 交易 edit/delete 是否納入本 change：預設只做 create；若 task 餘裕再評估，否則留後續 change。
