## Why

MVP 的持倉與交易（Sprint 3+）都掛在「券商帳戶」之下：每筆交易要歸屬某個 `account_id`、現金餘額以帳戶為單位記錄。目前 App 只有 Auth + 空殼 MainTabs，沒有任何帳戶資料層或畫面。Sprint 2 補上帳戶管理這塊地基，並順帶建立後續所有 feature 都要用的 `core/ui` 與 `core/theme` 設計系統、以及 Root Stack + Modal group 導航骨架（planning doc §13.2 Sprint 2、§11 導航、§6 Collection 2）。

## What Changes

- **新增 `account-management` capability**：在 `users/{uid}/accounts/{accountId}` 上做完整 CRUD（建立 / 編輯 / 停用），對齊 planning doc §6 `AccountDocument` schema（型別已存在於 `packages/shared`）。
- **帳戶列表與詳情**：AccountsStack（AccountList / AccountDetail），列表依 `is_active` + `display_order` 顯示啟用帳戶、呈現帳戶識別色。
- **新增帳戶 Modal**：AddAccount，掛在 Root-level Modal group（Sprint 3 的 AddTransaction 會複用此 group）。
- **cash_balances 手動編輯**：在 AccountDetail 編輯 USD / TWD 現金 snapshot，寫入 `cash_balances` + `cash_balances_updated_at`。
- **軟刪除模型**：停用 = `is_active=false`，**不做實體刪除**（保護 Sprint 3 event sourcing 的 `account_id` reference 完整性）。
- **display_order 自動指派**：建立時取 `max(display_order)+1`；列表照此排序。手動重排 UI 本 sprint **不做**（見 Non-goals）。
- **default_account_id 最小化管理**：建立第一個帳戶時自動設為 `users/{uid}.settings.default_account_id`；停用 default 帳戶時清空該欄位。完整重指派邏輯留 Sprint 3。
- **驗證落在 client zod schema**：新增 `packages/shared/src/schemas/account.ts`（純函式、可單元測試），rules 維持「簡潔四條」只保證隔離、不做欄位驗證。
- **基礎建設**：`core/ui`（Button / Input / Sheet / List）、`core/theme`（color / spacing / typography tokens，先用中性預設、待設計定案再 reskin）、`core/firestore` collection helpers、`core/navigation` 升級（Root Stack + Modal group + AccountsStack）。
- **ADR-003**：記錄導航結構決策（Bottom Tabs ×4 + per-tab native-stack + Root Modal group）。

## Capabilities

### New Capabilities

- `account-management`: 券商帳戶的建立 / 編輯 / 停用、cash_balances 手動編輯、display_order 排序、default_account_id 連動，以及對應的列表 / 詳情 / 新增畫面與資料層（store + service + zod 驗證）。

### Modified Capabilities

<!-- 無。auth capability 的 user doc 形狀不變；本 change 只是寫入既有的 settings.default_account_id 欄位，未改變 auth 的 requirements。 -->

## Impact

- **packages/shared**：新增 `src/schemas/account.ts`（zod）+ 測試；`AccountDocument` 型別已存在、`BROKERS`/`ACCOUNT_TYPES`/`Currency`/`Market` enums 已就緒。
- **apps/mobile**：新增 `core/ui`、`core/theme`、`core/firestore` helpers；`core/navigation` 升級為 Root Stack + Modal group + AccountsStack（`types.ts` 的 ParamList 擴充）；新增 `features/accounts`（screens / `accountsStore` / account service）；`i18n/zh-TW.ts` 帳戶相關字串。
- **firebase**：Firestore rules **不變**（`users/{userId}/{document=**}` 萬用規則已涵蓋 accounts 讀寫）；`firestore.rules.test.ts` 擴充斷言 accounts 的 user 隔離；accounts 複合索引（`is_active+display_order`）**已部署**，無需變更。
- **docs**：`docs/adr/0003-navigation-structure.md`；`docs/product-backlog.md`（新建，收錄「帳戶手動重排 UI」未來優化項）。
- **依賴方向**：`features/accounts` → `core/*` | `packages/shared`，不反向、不跨 feature import。

## Non-goals

對齊 MVP 邊界（planning doc §3 第二/三階段），本 change **明確不做**：

- 交易（transactions）與動態持倉計算 → Sprint 3
- 多幣別匯率自動換算、Cloud Function → Sprint 4
- 報價、已實現/未實現損益 → Sprint 5
- 帳戶現金的交易自動推導（cash_balances 為**手動 snapshot**，非交易衍生）
- 帳戶手動重排（拖曳 / 上下移）UI → 列入 `docs/product-backlog.md` 未來優化
- 帳戶實體刪除（僅軟刪除停用）
- default_account_id 的完整重指派 UX（停用 default 僅清空，不自動挑下一個）→ Sprint 3
