## 1. Shared 驗證層（TDD）

- [ ] 1.1 先寫 `packages/shared/src/schemas/account.test.ts`：涵蓋 account_name 非空/trim、broker∈BROKERS、account_type∈ACCOUNT_TYPES、base_currency∈{USD,TWD}、color hex 格式（紅燈）
- [ ] 1.2 實作 `packages/shared/src/schemas/account.ts`（zod schema：建立 / 編輯輸入），由 `z.infer` 匯出輸入型別，export 至 `packages/shared/src/index.ts`（綠燈，coverage >90%）

## 2. core/theme + core/ui 設計系統（中性預設）

- [ ] 2.1 `core/theme`：color / spacing / typography tokens（中性配色）+ 一組帳戶色票常數
- [ ] 2.2 `core/ui/Button`、`core/ui/Input`（無業務邏輯，吃 theme tokens）
- [ ] 2.3 `core/ui/Sheet`、`core/ui/List`（List item 支援前置 color dot）

## 3. core/firestore helpers

- [ ] 3.1 `core/firestore`：collection / doc ref helpers（`accountsCol(uid)`、`accountDoc(uid,id)`）+ serverTimestamp 包裝，沿用既有 `services/firebase` 的 modular RNFB 實例

## 4. 導航骨架升級

- [ ] 4.1 擴充 `core/navigation/types.ts`：新增 `RootStackParamList`（含 Modal routes：AddAccount）與 `AccountsStackParamList`（AccountList / AccountDetail:{accountId}）
- [ ] 4.2 `RootNavigator` 升級為 native-stack：登入後 MainTabs Group + `presentation:'modal'` Modal Group；維持 conditional auth render
- [ ] 4.3 新增 `features/accounts/AccountsStack`（native-stack：AccountList / AccountDetail），接到 MainTabs 的 Accounts tab（取代現有單畫面 AccountsScreen）

## 5. 帳戶資料層（service + store）

- [ ] 5.1 `features/accounts/accountService.ts`：create（自動 id 回寫 account_id、display_order=max+1、serverTimestamp）
- [ ] 5.2 accountService：update（基本欄位 merge、刷新 updated_at）、updateCashBalances（Money 解析為 decimal string、刷新 cash_balances_updated_at）
- [ ] 5.3 accountService：deactivate / reactivate（is_active 切換）
- [ ] 5.4 default_account_id 連動：建立第一個帳戶 → writeBatch（account + user settings）；停用 default → writeBatch（account + 清空 default_account_id）
- [ ] 5.5 `features/accounts/accountsStore.ts`（Zustand）：onSnapshot 監聽 accounts（依 display_order）回填、loading/error 狀態、登出/unmount 時 unsubscribe

## 6. 帳戶畫面

- [ ] 6.1 AccountList：顯示 is_active=true 帳戶（依 display_order、含 color），header `+` 開 AddAccount modal，「顯示已停用」切換
- [ ] 6.2 AddAccount modal：react-hook-form + zod（task 1.2 schema）、broker/account_type/currency 選擇、色票選擇、送出建立後返回列表
- [ ] 6.3 AccountDetail：顯示/編輯基本欄位、停用/啟用入口、進入該帳戶（為 Sprint 3 預留 AccountTransactions 入口佔位）
- [ ] 6.4 AccountDetail：cash_balances 編輯區（USD / TWD），存檔走 updateCashBalances
- [ ] 6.5 帳戶相關繁中字串集中至 `i18n/zh-TW.ts`

## 7. Rules 測試擴充

- [ ] 7.1 擴充 `firebase/tests/firestore.rules.test.ts`：斷言 user A 不能讀 / 寫 user B 的 `accounts/**`，user 對自己 accounts 可讀寫（emulator）

## 8. 文件

- [ ] 8.1 `docs/adr/0003-navigation-structure.md`（Context→Decision→Consequences→Alternatives：Root Stack + Bottom Tabs ×4 + Modal group）
- [ ] 8.2 新建 `docs/product-backlog.md`，收錄「帳戶手動重排（拖曳/上下移）UI」未來優化項

## 9. 驗收（Simulator + Emulator）

- [ ] 9.1 `pnpm -r typecheck` / `lint` / `test` 全綠；shared schema 與 rules 測試通過
- [ ] 9.2 Simulator + emulator dogfood：新增→編輯→停用→重新啟用帳戶、改 cash_balances、第一個帳戶自動成 default、停用 default 後清空；列表色與排序正確
- [ ] 9.3 更新 change 狀態，準備 `/opsx:archive`（sprint 收尾時）
