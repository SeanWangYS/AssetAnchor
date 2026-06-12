## 1. shared：transaction 輸入 zod schema（TDD）

- [x] 1.1 寫 `packages/shared/src/schemas/transaction.test.ts`：BUY 單幣別輸入的合法/非法案例（必填缺失、quantity/price 非正、非法日期格式、original_currency 非 USD/TWD、合法通過），先紅
- [x] 1.2 實作 `packages/shared/src/schemas/transaction.ts` `transactionInputSchema` + `export type TransactionInput`（比照 `account.ts`：MVP_CURRENCIES、繁中錯誤訊息、trim 正規化），轉綠
- [x] 1.3 在 `packages/shared/src/schemas/index.ts` 匯出 transaction schema；`pnpm --filter @assetanchor/shared test:coverage` 維持 ≥90% 綠燈（transaction.ts 100%、107 tests green）
- [x] 1.4 無新增/修改 enum（schema 只消費既有 MARKETS / ASSET_TYPES + `BUY` literal），既有 enum 測試已 100%；N/A（§13.4 紀律）

## 2. mobile：core/firestore transactions ref helpers

- [x] 2.1 在 `apps/mobile/src/core/firestore/index.ts` 新增 `transactionsCol(uid)` 與 `transactionDocRef(uid, id)`（比照 accounts helpers）

## 3. transaction 純 builder（shared，TDD）+ mobile I/O seam

> 修訂：純 builder 落點改 `packages/shared`（design.md D3 修訂），mobile 端只留 I/O。

- [x] 3.1 寫 `packages/shared/src/transactions/buildTransactionDoc.test.ts`：斷言——單幣別 amounts 只一筆且 rate="1.0000000000"、rate_source/type/date 為 null、amounts_status="COMPLETE"、total = price×quantity 的 10 位小數 string、transaction_type="BUY"、預留欄位為 null、deterministic、非法金額丟 `InvalidMoneyValueError`（先紅）
- [x] 3.2 實作 `packages/shared/src/transactions/buildTransactionDoc.ts`：`buildTransactionDoc(input, ctx)` 用 `Money` 轉 price/quantity/fee/tax 與 total、組對稱 amounts map、回傳 `Omit<TransactionDocument,'created_at'|'updated_at'>`（不 import firestore），轉綠（100% cov、117 tests green）
- [x] 3.3 從 `packages/shared` 匯出 builder 與型別；`pnpm --filter @assetanchor/shared test:coverage` 維持 ≥90%
- [x] 3.4 mobile `features/transactions/transactionService.ts` 實作 I/O `writeTransaction(uid, input)`：產 `transactionDocRef(uid)` 取 doc id → 呼叫 shared builder → `setDoc`，補 `created_at`/`updated_at` = `serverTimestamp()`

## 4. mobile：transactionsStore（Zustand + onSnapshot）

- [x] 4.1 實作 `features/transactions/transactionsStore.ts`：`subscribe(uid)`/`stop()`，`onSnapshot(query(transactionsCol(uid), orderBy('transaction_date','desc')))`，登出/unmount 時 stop（比照 accountsStore D4）

## 5. mobile：AddTransaction 表單與導航（先 BUY 單幣別）

- [x] 5.1 `features/transactions/components/TransactionForm.tsx`：RHF + `<Controller>` + `zodResolver(transactionInputSchema)`（帳戶選擇、symbol/market/asset_type、quantity、單價、fee、tax、transaction_date、notes）
- [x] 5.2 `features/transactions/screens/AddTransactionScreen.tsx`（modal）：送出時 `writeTransaction`（內部呼叫 shared builder），成功關閉 modal；無啟用帳戶時提示先建帳戶
- [x] 5.3 交易 Tab 導航接上 AddTransaction modal 入口（RootStack modal group + Transactions tab headerRight ＋；§11.3 多入口之一）；繁中字串集中於 i18n/zh-TW
- [x] 5.4 預設帳戶：表單預帶第一個啟用帳戶（簡化；完整 `users.settings.default_account_id` 連動待 userStore，記於後續）

## 6. mobile：交易基礎時序清單

- [x] 6.1 `features/transactions/TransactionsScreen.tsx`：訂閱 transactionsStore，顯示時序清單（symbol/quantity/單價/transaction_date），含空狀態
- [x] 6.2 金額顯示用 `Money.toDisplayString()`（2 位小數），儲存仍 10 位

## 7. firebase：transactions 隔離 rules 測試

- [x] 7.1 新增 transactions 子集合隔離測試：A 可讀寫 `users/A/transactions/**`、A 不可讀寫 `users/B/transactions/**`（比照 accounts 隔離測試）
- [x] 7.2 `pnpm --filter @assetanchor/firebase test:rules` 本機綠燈（emulator）— 15/15 通過（含 4 條新 transactions）

## 8. infra：CI 分層強制（ADR-0007 §3）

- [x] 8.1 `.github/workflows/ci.yml` 新增 rules emulator job（`setup-java` temurin 17 + `npm i -g firebase-tools` + `@assetanchor/firebase test:rules`）
- [x] 8.2 `.github/workflows/ci.yml` test job 新增 mobile 純邏輯 coverage step（`@assetanchor/mobile test:coverage`，純函式不依賴 RNFB native）
- [x] 8.3 `apps/mobile/jest.config` 加 path-glob coverage gate：`collectCoverageFrom` 限 `*Ordering.ts` / `authErrors.ts`（mobile 純邏輯）、global ≥90%，排除 screens/components/store/service I/O（builder 在 shared 由其 gate 涵蓋）；順帶補齊 authErrors 測試到 100%
- [x] 8.4 本機模擬 CI 全綠：`prettier --check .`、`pnpm -r typecheck`、`pnpm -r lint`、shared coverage、mobile coverage、rules（15/15）皆通過（GitHub Actions 實跑待 push）

## 9. docs：ADR-0004

- [x] 9.1 新增 `docs/adr/0004-event-sourcing-schema.md`（Context→Decision→Consequences→Alternatives；記錄 §6 已拍板的 event-sourcing + 動態 holdings 決策、為什麼不存 holdings collection）
- [x] 9.2 planning doc §13.5 ADR 表已正確列 ADR-004 @ Sprint 3（schedule 準確，無需改；與 ADR-003/0007 處理一致）

## 10. 驗收與 demo

- [x] 10.1 iOS Simulator 連本地 Emulator：新增一筆 BUY → 寫入成功、交易清單顯示該筆（🚦 第一筆 transaction 里程碑）。使用者本機驗收通過；過程修掉 modal 不自動關閉的 bug（offline-first dismiss，commit 64adffd）
- [x] 10.2 全工作區綠燈：`prettier --check .`、`pnpm -r typecheck`、`pnpm -r lint`、shared coverage、mobile coverage、rules（15/15）皆 PASS
- [ ] 10.3 錄 30 秒 demo（§13.6 業餘節奏）、列手動 dogfood punch list（如有）
