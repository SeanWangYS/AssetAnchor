## Context

視覺驗證在帳戶區發現的兩個 bug，已用 emulator 資料證實根因（見 proposal）。核心是一個模型不一致：**持倉與顯示同時存在「全域」與「帳戶層級」兩種視角，但 SELL 超賣防呆只在全域層級做**，於是可建出「帳戶層級超賣」的 orphan SELL；而帳戶詳情的 per-account 衍生對超賣 fail-loud throw、外層 `catch → []`，把整個帳戶持股吃掉。

owner 拍板模型：**券商帳戶＝真實帳戶，持有/超賣以 `account_id` 為單位**。本 change 在不放寬全域語意的前提下，補上帳戶層級的進場防呆（A）與顯示容錯（B），並順修設定頁現金餘額顯示（E）。約束：不動 schema / rules / functions；金額一律 `Money`（ADR-0005）；shared 純函式 TDD（ADR-0007）。

## Goals / Non-Goals

**Goals:**

- SELL 不能從「未持有該股的帳戶」賣出（帳戶層級超賣於進場即被擋）。
- 帳戶詳情對單一 symbol 的爛資料/超賣有容錯：壞檔隔離、其餘持股照顯示，永不整頁 blank。
- 設定頁現金餘額＝唯讀的跨帳戶現金總計（對齊 mock）。

**Non-Goals:**

- 不放寬全域 `deriveHoldings` fail-loud（ADR-0007）。
- 不清既有 emulator 爛資料（已另行於 emulator 處理）。
- 不做跨帳戶持股轉移語意；不改 schema / rules / functions / 報價。

## Decisions

### D1：可賣量改帳戶層級——複用 `deriveHoldings`，餵「帳戶過濾後」的交易子集

不新增超賣演算法；沿用 shared 的單一事實來源。做法：`sellableQuantity` 增加 `accountId` 範圍（新簽章或新 per-account 變體 `sellableQuantityForAccount(txs, accountId, market, symbol)`，內部 `deriveHoldings(txs.filter(t => t.account_id === accountId))`）。`TransactionForm` 的 SELL 可賣量改呼叫帳戶版，並隨表單所選 `account_id` 連動重算（`useMemo` deps 加 `accountId`）。

- **理由**：與 B 共用「帳戶過濾 + deriveHoldings」的同一語意；不另造規則。
- **替代**：在 form 端臨時 filter——會把超賣邏輯散落 UI；放回 shared 較一致、可測。

### D2：per-account 衍生逐-symbol 隔離——新增 shared 純函式 `deriveHoldingsForAccountSafe`

新增純函式：先把該帳戶交易**依 `(market, symbol)` 分組**，逐組 `deriveHoldings`，單組 throw 則跳過該 symbol（收集到 `skipped[]` 並 log），合併其餘結果回 `Position[]`。`accountDisplay.ts` 的 `holdingsForAccount` 改呼叫它（取代現行整包 try/catch→[]）。AccountDetail 對 `skipped` 的 symbol 以「資料異常」之類標示（不顯示錯誤數字、不 blank）。

- **理由**：把容錯放 shared 純函式 → 可單元測試（逐-symbol 行為、與整體 derive 在無爛資料時一致）；UI 只消費。
- **替代**：在 `holdingsForAccount` 內逐 symbol try/catch——可行但邏輯在 mobile 不易測；放 shared 較佳。
- **與全域差異**：全域總覽仍呼叫原 `deriveHoldings`（fail-loud），只有帳戶層級用 safe 版。

### D3：設定頁現金餘額——唯讀展示列 + `Money` 跨帳戶加總

`SettingsScreen` 訂閱 `accountsStore`，依幣別（USD/TWD）以 `Money` 加總（啟用）帳戶 `cash_balances`，現金餘額列改為唯讀（移除 `onPress`/chevron），右側顯示「NT$ X · US$ Y」（僅顯示有餘額幣別）。

- **理由**：對齊 mock；加總走 `Money` 不破壞精度。
- **替代**：保留可點並另做「現金總覽」子頁——超出 mock 範圍、非本次需求。

## Risks / Trade-offs

- **[per-account 與全域行為分歧造成混淆]** → Mitigation：spec 明寫「全域 fail-loud、帳戶層級容錯」；safe 函式在無爛資料時結果與整體 derive 一致（加測試保證）。
- **[SELL 可賣量改帳戶層級可能影響既有 BUY/SELL 流程或測試]** → Mitigation：先補/改 shared 測試（含「同 symbol 跨帳戶不互通可賣量」），再改 form；跑 mobile 純邏輯 coverage gate。
- **[逐-symbol 分組改變 Position 排序/聚合]** → Mitigation：合併後沿用既有排序規則；測試斷言與整體 derive 同序。
- **[現金加總幣別呈現格式未定]** → Mitigation：spec 僅約束「依幣別 Money 加總、唯讀」，確切排版於視覺對圖時與 owner 對齊 mock。
- **[多 agent 同檔衝突]** → Mitigation：於隔離 git worktree 實作；本 change 觸及 accounts/transactions/settings/shared，與另一個 agent 的 `add-quote-batch-discovery`（functions/quotes）路徑不同，但仍以 worktree 隔離為準。

## Migration Plan

純前端 + shared 純函式強化，無資料遷移、無 schema/rules 變更、無部署 gate。順序：shared（TDD：per-account sellable、safe 衍生）→ mobile transactions（SELL 可賣量）→ mobile accounts（holdingsForAccount + AccountDetail 標示）→ mobile settings（現金總覽）。本機對 Firebase Emulator dogfood（驗：(1) SELL 只能賣該帳戶持有量；(2) 帳戶含一筆人為 orphan SELL 時其餘持股仍顯示；(3) 設定頁現金總計正確、不可點）→ 收尾 iOS Simulator 視覺對圖（owner gate）。回退＝還原相關檔案，無外部副作用。

## Open Questions

- 現金餘額列「0 值幣別」是否顯示、以及「NT$ X · US$ Y」確切排版 → 視覺對圖時對齊 mock 決定（spec 不綁死）。
- 帳戶詳情對 `skipped`（資料異常）symbol 的呈現文案/樣式 → 視覺對圖時與 owner 確認（spec 僅要求「標示且不 blank」）。
