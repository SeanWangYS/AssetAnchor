## Context

現況：Auth（Email/密碼）+ 扁平 4-tab MainTabs 已完成（Sprint 1）；`packages/shared` 已有 `AccountDocument` 型別與 `BROKERS`/`ACCOUNT_TYPES`/`Currency`/`Market` enums；Firestore rules 的 `users/{userId}/{document=**}` 萬用規則已涵蓋 accounts 讀寫；accounts 複合索引 `is_active+display_order` 已部署。既有 `apps/mobile/src/features/auth/userDoc.ts` 提供 modular RNFB 寫入 pattern（`doc`/`getDoc`/`setDoc`/`serverTimestamp`）。

約束：開發在 iOS Simulator + 本地 Firebase Emulator（Apple Developer Program 未過不影響）；RNFB v24 一律 modular API；金額/數量一律 decimal.js + Money，Firestore 存 string；TS strict + `noUncheckedIndexedAccess`；依賴方向 `features/* → core/* | packages/shared`，feature 間不互 import。

## Goals / Non-Goals

**Goals:**

- 帳戶 CRUD（建立/編輯/軟刪除停用）+ cash_balances 手動編輯，資料正確寫入 §6 schema。
- 建立後續所有 feature 共用的 `core/ui`、`core/theme`、`core/firestore` 與 Root Stack + Modal group 導航骨架。
- 邏輯/驗證可單元測試（zod schema 純函式）、隔離可由 rules 測試覆蓋。

**Non-Goals:**

- 交易/持倉/匯率/報價（Sprint 3–5）；帳戶手動重排 UI（product backlog）；實體刪除；default_account_id 完整重指派（Sprint 3）。

## Decisions

### D1. `account_id` 採 Firestore 自動 id，回寫至欄位

用 `collection(...).doc()` 取得自動 id 作為 `accountId`，並寫入文件的 `account_id` 欄位。

- **為什麼**：免額外亂數依賴、天然唯一、與 `userDoc` 將 uid 同時當 doc id 與欄位的 pattern 一致。
- **替代**：client 端 `acc_<nanoid>` 前綴 id — 多一個依賴、無實益，且 workflow 腳本禁用隨機數的限制不適用於 App 端但仍無必要。

### D2. 導航：Root native-stack 包 MainTabs + Modal group；Accounts tab 內放 AccountsStack

`RootNavigator` 升級為 native-stack：登入後 `MainTabs`（Group）+ `presentation:'modal'` 的 Modal Group（AddAccount）。Accounts tab 的 component 改為 `AccountsStack`（native-stack：AccountList / AccountDetail）。其餘三個 tab **維持單畫面佔位**，各自 sprint 再升級。

- **為什麼**：Sprint 3 的 AddTransaction/EditTransaction 會複用同一個 Root Modal group；只建 AccountsStack 保持 Sprint 2 cohesive。
- **型別**：沿用既有 `core/navigation/types.ts` 的 declaration-merging pattern，新增 `RootStackParamList`（含 Modal routes）與 `AccountsStackParamList`（`AccountList: undefined` / `AccountDetail: { accountId: string }`）。
- **Auth 切換**：維持既有 conditional render（`{user ? ... : <AuthStack/>}`），不用 `navigate`。

### D3. 三層分工：shared(驗證) / core+service(I/O) / store(狀態)

- `packages/shared/src/schemas/account.ts`：zod schema（建立/編輯輸入）+ 由其 `infer` 的型別；純函式、單元測試 >90%。
- `core/firestore`：collection ref helpers（`accountsCol(uid)`、`accountDoc(uid,id)`）+ 共用 `serverTimestamp` 包裝。
- `features/accounts/accountService.ts`：CRUD（建立/更新/停用/啟用/改 cash_balances），呼叫 modular RNFB。
- `features/accounts/accountsStore.ts`：Zustand，持有 accounts 清單 + loading/error，UI 只讀 store。
- **為什麼**：純驗證上移 shared 可單元測試且 functions 未來也能用；I/O 與 UI 分離符合依賴方向與測試紀律。

### D4. 讀取用 onSnapshot 即時監聽（含登出時 unsubscribe）

`accountsStore` 啟動對 `accountsCol(uid)`（依 `display_order`）的 `onSnapshot` 監聽，資料變動即時回填；登出/unmount 時 `unsubscribe`。

- **為什麼**：免費換到多裝置即時同步（§3 多裝置雲端同步）、RNFB 自帶離線快取；fetch-on-focus 會有跨裝置 stale。
- **風險**：監聽未在登出前解除會觸發 permission-denied 噪音 → 在 auth state 轉為登出時先 unsubscribe（見 Risks）。

### D5. default_account_id 連動用 WriteBatch 保一致

「建立第一個帳戶」=（新增 account 文件 + 設 user `settings.default_account_id`）兩寫；「停用 default 帳戶」=（更新 account `is_active` + 清 `default_account_id`）兩寫。兩者各用一個 Firestore `writeBatch` 原子提交。

- **為什麼**：避免兩寫之間失敗造成 user 設定與帳戶狀態不一致。
- **替代**：先後兩次 setDoc — 非原子，中途失敗會留下孤兒設定。

### D6. display_order client 端 max+1

建立時從 store 已載入清單取 `max(display_order)+1`（空清單則 1）。

- **取捨**：非原子；多裝置同時建立可能撞號 → MVP 寫入頻率低、撞號僅影響排序非資料正確性，接受（未來可改 transaction 或 server 指派）。

### D7. cash_balances 經 Money 解析、存 decimal string

輸入字串經 Money/decimal.js 解析驗證，序列化為小數第 10 位的 string 寫入 `cash_balances`（key 限 MVP 幣別 USD/TWD）；禁止 native float。

### D8. core/ui + theme 先中性預設

`core/theme` 集中 color/spacing/typography tokens（中性配色）；`core/ui` 先做 Button/Input/Sheet/List 四個無業務邏輯元件。待設計定案再 reskin。

- **為什麼**：結構先於配色；reskin 屆時只換 token，不動元件。

### D9. 顏色選擇用預設色票（非全色盤）

帳戶 `color` 用一組預設 hex 色票供點選。

- **為什麼**：MVP 夠用、實作輕、與 zod hex 驗證一致；全色盤 picker 屬未來優化。

## Schema 對照（planning doc §6）

本 change **不變更 schema**，僅寫入既已定義的欄位：

- `users/{uid}/accounts/{accountId}`：欄位與 §6 Collection 2 + `packages/shared/src/types/account.ts` 的 `AccountDocument` **逐欄一致**（account_id / account_name / broker / account_type / base_currency / market / cash_balances / cash_balances_updated_at / is_active / display_order / color / notes / created_at / updated_at）。無新增、修改或移除欄位。
- `users/{uid}.settings.default_account_id`：§6 Collection 1 既有欄位；目前 `userDoc.ts` 初始化為 null，本 change 開始對其寫值（首帳戶設定 / 停用 default 清空）。屬欄位「開始使用」，非 schema 變更。

## Risks / Trade-offs

- **Rules 只保證隔離、不驗欄位** → 欄位完整性靠 client zod schema（D3）；對個人 App 可接受，rules 維持簡潔四條。
- **onSnapshot 登出後 permission-denied 噪音** → auth state 轉登出時先 `unsubscribe`，再清空 store。
- **display_order 非原子撞號（D6）** → 低頻寫入下僅影響排序、不傷資料，接受。
- **provisional theme reskin churn** → token 集中於 `core/theme`，reskin 為 token 替換。
- **Simulator-only 驗證** → Accounts 全程無真機限定功能（不涉 Google 登入/原生模組差異），Simulator + emulator 足以驗收。

## Migration Plan

- 無資料遷移（accounts 為新 subcollection、emulator 與正式庫皆空）。
- Rules 邏輯不變（萬用規則已涵蓋）；indexes 已部署 → 無 deploy 必要動作。
- Rollback：本 change 為純新增（additive），還原即 revert feature 分支，不影響既有 Auth 資料。

## Open Questions

- 無阻塞性問題。provisional 配色實際數值留實作時定；色票組合可於實作微調（皆低風險、不影響 spec 行為）。
