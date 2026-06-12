## Context

Sprint 3 Change 2（讀取/計算路徑），承接 Change 1（`add-transaction-entry`，已 archive）：transactions 已可寫入且 `transactionsStore`（onSnapshot）已在 App 啟動時全域訂閱。本 change 把交易事件流變成使用者看得到的持倉——是 ADR-0004「動態推導、不存 holdings」與 §4 加權平均公式的首次落地，也是 ADR-0007 CI 安全網（Change 1 架好）要守的第一個 cost-calc。

關鍵既有事實（explore 階段查證）：

- `TransactionDocument` 每筆可取：頂層 `quantity`、`amounts[original_currency]` 的 `total`（=price×qty，不含費稅）、`fee`、`tax`（皆 10 位小數 string）。
- MVP 只有 BUY（SELL 是 Sprint 5）→ 持倉單調累加，**不需 lot**；`lot_id` 預留欄位不啟用。
- `apps/mobile/src/features/holdings/HoldingsScreen.tsx` 目前是 Sprint 1 的 rail 除錯殼，本 change 整個替換。
- `AccountsStack`（list→detail native stack in tab）是現成範本。
- 跨 feature 讀 Zustand store 已是 codebase 慣例（accounts→auth、transactions→accounts）。
- 無現價（Sprint 5）、無匯率（Sprint 4）→ UI 只能呈現成本側資訊。

## Goals / Non-Goals

**Goals:**

- `deriveHoldings` 純函式（shared，TDD，§4 fixture avg=550.76）正確聚合 BUY → Position[]。
- 持倉 Tab：Overview（依市場分組 + 原幣別成本小計）→ AssetDetail（摘要 + 對帳 timeline）。
- 達成 §13.2 Sprint 3 驗收：「輸入買入 → 看到加權平均成本正確的持倉清單」。
- 零新增 I/O、零 schema/rules 變更。

**Non-Goals:**

- 市值/損益/報酬率（S5）、跨幣別合計（S4）、SELL/lot（S5）、走勢圖/time tabs、filter、帳戶 cash 對帳（S6）、視覺 reskin（見 proposal Non-goals）。

## Decisions

### D1. 零 schema 變更——純讀取消費者

本 change 只**讀** `TransactionDocument`（§6 聖牛不動）、不改 rules、不改 indexes、不新增 collection。三端影響：shared 新增純函式模組（不動既有型別）；mobile 新增讀取側 UI；functions 不涉及。無需新 ADR（ADR-0004 已記錄動態推導決策）。

### D2. `deriveHoldings` 契約與演算法

```
packages/shared/src/portfolio/deriveHoldings.ts

export interface Position {
  market: Market;
  symbol: string;
  currency: Currency;     // 原幣別
  quantity: string;       // Σ quantity（10 位小數 string）
  totalCost: string;      // Σ total + Σ fee + Σ tax（§4：費稅入成本）
  averageCost: string;    // totalCost / quantity（ROUND_HALF_UP）
  txCount: number;
}

deriveHoldings(transactions: TransactionDocument[]): Position[]
  · 過濾 transaction_type === 'BUY'（防衛性；MVP 資料只會有 BUY）
  · 以 `${market}_${symbol}` 為 key 用 Map 聚合；Money 累加 quantity / total / fee / tax
  · 讀 amounts[original_currency]（is_original 那筆）取 total/fee/tax
  · averageCost = totalCost.divide(quantity)
  · 排序：market 升冪、再 symbol 升冪（輸出 deterministic）
```

**替代方案**：回傳巢狀 `{ market: Position[] }` → 否決，分組是顯示關注點，留給 UI 層做（selector 可重組），純函式保持扁平、好測。

### D3. 資料來源：跨 feature 讀 `transactionsStore` + `useMemo`

holdings UI 直接 `useTransactionsStore((s) => s.transactions)` + `useMemo(() => deriveHoldings(transactions), [transactions])`。理由：(a) transactionsStore 已全域訂閱（App.tsx），資料現成；(b) 跨 feature 讀 store 已有 accounts→auth、transactions→accounts 前例；(c) 另開 holdings 自己的 onSnapshot 會重複監聽同一 collection（浪費 + 雙份狀態）。推導 hook 收在 `features/holdings/useHoldings.ts`，UI 不直接呼叫 `deriveHoldings`。

**替代方案**：(a) holdings 自開 listener → 否決（重複 I/O，違反 spec「零新增 I/O」）；(b) 把 store 搬到 `core/state` → 正確的長期方向但屬重構，超出本 change 範圍，留 backlog。

### D4. 混幣別防護：fail loud

同一 `(market, symbol)` 理論上只會有一種 `original_currency`（台股 TWD、美股 USD）。若出現混幣別（資料異常），`Money.add` 的 `CurrencyMismatchError` 會自然丟出——**不捕捉、不靜默跳過**（「安靜的錯誤」是 ADR-0007 最防範的失敗模式）。UI 層由 store error 狀態呈現，不在純函式裡吞錯。

### D5. 導航：HoldingsStack 比照 AccountsStack

```
core/navigation/types.ts
  HoldingsStackParamList = {
    HoldingsOverview: undefined;
    AssetDetail: { market: Market; symbol: string };   // 傳 key 不傳物件
  }
MainTabs: Holdings tab → HoldingsStack（headerShown: false，同 Accounts tab）
```

AssetDetail 以 `(market, symbol)` 為導航參數、進畫面後從 `useHoldings` 重查——導航參數保持可序列化、資料永遠來自單一推導來源（不會 stale）。找不到該 position（理論上不會）顯示「找不到持倉」空狀態，比照 accounts `notFound` 慣例。

### D6. 顯示規則

- 金額顯示一律 `Money.toDisplayString()`（2 位小數）；計算與比對用 10 位 string。
- Overview 依 `market` 分組（TW 在前），組標頭右側顯示該市場原幣別總成本小計（標注幣別，如 `TWD 1,376,900.00`）；**右欄語意是「總成本」**，明確標示避免誤讀為市值。
- Row 結構參考 design_inspiration 三段式：左 symbol、中「N 股 · 均價 X」小字、右總成本（市值/漲跌% 留 Sprint 5 的位置）。
- timeline 依 `transaction_date` **升冪**（持股累積順序；與交易 Tab 的降冪清單語意不同：那是「最近活動」，這是「對帳軌跡」）。

### D7. 檔案落點

```
packages/shared/src/portfolio/{deriveHoldings.ts, deriveHoldings.test.ts, index.ts}
apps/mobile/src/features/holdings/{HoldingsStack.tsx, useHoldings.ts,
  screens/HoldingsOverviewScreen.tsx, screens/AssetDetailScreen.tsx}
```

`HoldingsScreen.tsx`（rail 殼）刪除。i18n 字串集中 `i18n/zh-TW.ts` 新增 `holdings` 區塊。

## Risks / Trade-offs

- **[每次 snapshot 全量重算]** → MVP 交易筆數小（ADR-0004 已評估）；`useMemo` 以 transactions 參照為依賴，只在資料變動時重算。重訪條件（>千筆、走勢圖）已記於 ADR-0004 決策 5。
- **[跨 feature store 依賴擴散]** → 已是既有慣例，但 holdings→transactions 後共三條跨線；若再增長，把 stores 移到 `core/state`（記入 product-backlog）。
- **[同 symbol 不同大小寫造成分裂]** → Change 1 的 zod schema 已 trim + 大寫 symbol，新資料安全；歷史資料皆經同一表單寫入。
- **[混幣別資料異常會讓清單整頁報錯]** → 接受：fail loud 是刻意選擇（D4），這種資料異常必須被看見而非局部吞掉。
- **[空 quantity 防護]** → BUY-only 且 schema 強制 quantity>0，`divide` 不會除以零；測試仍補 DivisionByZero 防衛 case。

## Migration Plan

無資料遷移、無部署面變更（純前端 + shared 純函式）。rollback = revert commits。同分支 `feature/transaction-entry` 開發，隨 PR #4 與 Change 1 一起 merge（使用者既定策略）。

## Open Questions

- 無（聚合粒度、成本公式、timeline 位置已於 explore 階段由使用者拍板）。
