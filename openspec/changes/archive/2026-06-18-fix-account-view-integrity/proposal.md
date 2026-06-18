## Why

視覺驗證（owner，2026-06-18）在帳戶區發現兩個正確性 bug：

1. **設定頁「帳戶管理」與「現金餘額」兩個按鈕都導到同一頁**（`SettingsScreen.tsx` 兩列都 `navigate('Accounts')`），且現金餘額未如原型 mock 直接顯示跨帳戶現金總計。
2. **某券商帳戶（Firstrade）詳情整頁空白、看不到該帳戶任何持股**。已用 emulator 資料證實根因鏈：該帳戶被記了一筆 orphan SELL（QQQ 在別帳戶買、卻記到本帳戶賣 → **帳戶層級超賣**）→ shared `deriveHoldings` 對超賣 fail-loud `throw` → 帳戶詳情用的 `holdingsForAccount` try/catch **整包回 `[]`** → 該帳戶**所有**持股（含合法的）一起消失。上游能產生爛資料的原因：SELL 超賣驗證只算**全域** `(market, symbol)` 可賣量、不分帳戶，因此容許從未持有該股的帳戶賣出。

模型確立（owner 拍板）：**券商帳戶為真實帳戶，持有與超賣皆以 `account_id` 為單位**——你只能賣「在該帳戶」持有的股。

## What Changes

- **A — SELL 超賣驗證改帳戶層級**：SELL 寫入前的可賣量改以「**所選帳戶（account_id）** 之 `(market, symbol)` 當下持有量」計算（取代現行全域計算），杜絕「從沒持有的帳戶賣出」這類爛資料於進場。全域持倉總覽的 `deriveHoldings` fail-loud 語意維持不變（ADR-0007）。
- **B — 帳戶詳情持倉衍生加入逐-symbol 容錯**：per-account 衍生改為逐 `(market, symbol)` 群組各自推導，單一 symbol 推導失敗（如歷史爛資料造成的帳戶層級超賣）SHALL 只跳過/標示該檔並記 log，**不得**讓整個帳戶持股清單 blank。取代現行 `holdingsForAccount` 的 `catch → []` 全有全無。
- **E — 設定頁現金餘額改唯讀總覽**：「現金餘額」列改為**不可點**的展示列，右側顯示跨帳戶現金總計（依幣別，如「NT$ X · US$ Y」，由 `accountsStore` 各帳戶 `cash_balances` 加總），對齊原型 mock。移除其 `navigate('Accounts')` 與 chevron。

## Capabilities

### New Capabilities

（無——皆修改既有 capability 行為。）

### Modified Capabilities

- `transaction-entry`: 修改「記錄賣出交易（SELL）」需求——可賣量 / 超賣判定由全域 `(market, symbol)` 改為**帳戶層級** `(account_id, market, symbol)`。
- `holdings-derivation`: 新增「帳戶層級持倉衍生與逐-symbol 容錯」需求——per-account 衍生對單檔失敗 fail-soft 隔離（不影響其餘持股），同時全域衍生維持 fail-loud。
- `account-management`: 新增「設定頁現金餘額跨帳戶總覽（唯讀展示）」需求——設定頁以唯讀列顯示各幣別現金加總，不可點、不導航。

## Impact

- **shared**：`packages/shared/src/portfolio/deriveHoldings.ts`——`sellableQuantity`/`heldQuantity` 增加帳戶範圍能力（或新增 per-account 變體）；新增「per-account 逐-symbol 容錯衍生」純函式（供 mobile 帳戶詳情用）。**無 schema 變更**。
- **mobile**：
  - `features/transactions/components/TransactionForm.tsx`——SELL 可賣量改以所選 `account_id` 過濾後計算。
  - `features/accounts/accountDisplay.ts`——`holdingsForAccount` 改逐-symbol 隔離。
  - `features/accounts/screens/AccountDetailScreen.tsx`——壞檔以「資料異常」之類標示（不 blank 整頁）。
  - `features/settings/SettingsScreen.tsx`——現金餘額唯讀總覽 + 跨帳戶加總（讀 `accountsStore`）。
- **不影響**：Firestore schema（聖牛，無變更）、`firestore.rules`、`apps/functions`、報價。
- **DoD**：shared 純函式（per-account 可賣量、逐-symbol 容錯衍生）TDD 先測再實作（ADR-0007，>90% cov gate）；帶 UI（帳戶詳情、設定）收尾過 iOS Simulator 視覺對圖（owner gate）；實作於隔離 git worktree 進行，避免撞另一個 agent 正在做的 `add-quote-batch-discovery`。

## Non-goals

- **不放寬全域 `deriveHoldings` 的 oversell fail-loud 語意**（ADR-0007）——本 change 僅在「帳戶層級」加進場防呆與顯示容錯。
- **不做既有 emulator 爛資料清理**（orphan QQQ SELL、TLSA 錯字已由 owner 請 AI 於 emulator 清理完畢，非本 change 範圍）。
- **不改 schema / rules / functions / 報價 / 分析頁**。
- **不做帳戶間轉移（transfer）/ 跨帳戶調倉語意**——若未來需要「同一持股跨帳戶移動」屬另案。
