## 1. Shared 驗證層（TDD）

- [x] 1.1 先寫 `packages/shared/src/schemas/account.test.ts`：涵蓋 account_name 非空/trim、broker∈BROKERS、account_type∈ACCOUNT_TYPES、base_currency∈{USD,TWD}、color hex 格式（紅燈）
- [x] 1.2 實作 `packages/shared/src/schemas/account.ts`（zod schema：建立 / 編輯輸入），由 `z.infer` 匯出輸入型別，export 至 `packages/shared/src/index.ts`（綠燈，coverage >90%）

## 2. core/theme + core/ui 設計系統（中性預設）

- [x] 2.1 `core/theme`：color / spacing / typography tokens（中性配色）+ 一組帳戶色票常數
- [x] 2.2 `core/ui/Button`、`core/ui/Input`（無業務邏輯，吃 theme tokens）
- [x] 2.3 `core/ui/Sheet`、`core/ui/List`（List item 支援前置 color dot）

## 3. core/firestore helpers

- [x] 3.1 `core/firestore`：collection / doc ref helpers（`accountsCol(uid)`、`accountDoc(uid,id)`）+ serverTimestamp 包裝，沿用既有 `services/firebase` 的 modular RNFB 實例

## 4. 導航骨架升級

- [x] 4.1 擴充 `core/navigation/types.ts`：新增 `RootStackParamList`（含 Modal routes：AddAccount）與 `AccountsStackParamList`（AccountList / AccountDetail:{accountId}）；用 CompositeScreenProps 表達巢狀導航
- [x] 4.2 `RootNavigator` 升級：登入後走 `RootStack`（native-stack：MainTabs Group + `presentation:'modal'` Modal Group）；維持 conditional auth render
- [x] 4.3 新增 `features/accounts/AccountsStack`（native-stack：AccountList / AccountDetail），接到 MainTabs 的 Accounts tab（取代並刪除單畫面 AccountsScreen）

## 5. 帳戶資料層（service + store）

- [x] 5.1 `features/accounts/accountService.ts`：create（自動 id 回寫 account_id、display_order 由 `nextDisplayOrder` 純函式 max+1、serverTimestamp）+ `accountOrdering.ts` 單元測試
- [x] 5.2 accountService：update（基本欄位 merge、刷新 updated_at）、updateCashBalances（`toCashBalances` 經 Money 解析為 decimal string、刷新 cash_balances_updated_at）
- [x] 5.3 accountService：deactivate / reactivate（`setAccountActive` is_active 切換）
- [x] 5.4 default_account_id 連動：建立第一個帳戶 → writeBatch（account + user settings）；停用 default → writeBatch（account + 清空 default_account_id）
- [x] 5.5 `features/accounts/accountsStore.ts`（Zustand）：onSnapshot 監聽 accounts（依 display_order）回填、loading/error 狀態、登出/unmount 時 unsubscribe（接到 App.tsx auth 狀態）

## 6. 帳戶畫面

- [x] 6.1 AccountList：顯示 is_active=true 帳戶（依 display_order、含 color），header `+` 開 AddAccount modal，「顯示已停用」切換
- [x] 6.2 AddAccount modal：`AccountForm`（**受控 input + `accountInputSchema.safeParse`**，逐欄錯誤）、broker/account_type/currency/market 經 Sheet 選擇、色票選擇、送出建立後返回列表。註：暫不用 react-hook-form（RHF + zod4 RN 整合無法在此 Simulator 驗證），改用既有 auth 畫面的受控模式；spec 契約（zod 驗證）不變，RHF 留 Sprint 3 交易表單再導入
- [x] 6.3 AccountDetail：顯示/編輯基本欄位（共用 AccountForm）、停用/啟用入口（AccountTransactions 入口隨 Sprint 3 交易再加）
- [x] 6.4 AccountDetail：cash_balances 編輯區（USD / TWD），存檔走 updateCashBalances
- [x] 6.5 帳戶相關繁中字串集中至 `i18n/zh-TW.ts`

## 7. Rules 測試擴充

- [x] 7.1 擴充 `firebase/tests/firestore.rules.test.ts`：斷言 user A 不能讀 / 寫 user B 的 `accounts/**`，user 對自己 accounts 可讀寫（emulator，11/11 pass）

## 8. 文件

- [x] 8.1 `docs/adr/0003-navigation-structure.md`（Context→Decision→Consequences→Alternatives：Root Stack + Bottom Tabs ×4 + Modal group）
- [x] 8.2 新建 `docs/product-backlog.md`，收錄「帳戶手動重排（拖曳/上下移）UI」未來優化項

## 9. 驗收（Simulator + Emulator）

- [x] 9.1 typecheck / lint / test 全綠：shared（89 test、schema 100% cov）、mobile（typecheck+lint 乾淨、6 test）、firebase rules（11/11，含 accounts 隔離）
- [x] 9.2 Simulator + emulator dogfood **通過**：新增→編輯→停用→重新啟用帳戶、改 cash_balances、第一個帳戶自動成 default、停用 default 後清空、列表色與排序皆正確。dogfood 修正：現金顯示改 2 位小數（`cashDisplay`，儲存仍 10 位）
- [x] 9.3 change 收尾、`/opsx:archive`
