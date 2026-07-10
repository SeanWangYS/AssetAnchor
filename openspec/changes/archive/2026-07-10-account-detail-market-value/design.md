# Design：帳戶詳情/列表 成本→市值（B 案）

## 現況（file:line）

- `accountDisplay.ts:114-122` `holdingsValueByCurrency(positions)`：加總 `p.totalCost`（成本代理，註解自承）。
- `AccountDetailScreen.tsx:104-107` hero＝`holdingsValueByCurrency` + `cash_balances`；:186 標籤「帳戶總值」；:272 持股列＝`formatMoney(p.totalCost, ...)`。全頁**未** import quotes/rates。
- `AccountListScreen.tsx:52-54` `valueText`＝同一成本代理（A2 本應市值）。
- 持股數量推導已用 `holdingsForAccount`（＝`deriveHoldingsForAccountSafe`，真值 + skipped 容錯）。

## 設計權威（B 案 vs 原型）

原型 hero＝市值+現金、持股列＝市值+報酬%（見 proposal Why）。**B 案增加**「投入成本 + 未實現損益」→ 比原型多，屬**設計增修**。

### spec A5 增修草案（owner 確認後才寫入 `accounts-management-spec.md`）

> **A5（增修）**｜詳情 hero＝**帳戶市值**（持股市值 + 現金，基礎幣別）＋拆分小字「持股市值 X · 現金 Y」＋**成本/損益列**「投入成本 X · 未實現損益 ±Y（±Z%）」。持股列右側＝**市值 + 報酬%**（原幣別；均價留 subtitle）。報價缺失/過期複用 live-quotes 降級（更新中／查無代號／最後已知 + 重試）；多幣別以當日匯率換算進基礎幣別。持股列表維持無色點（A1）。

> **A2（釐清，非改語意）**｜列表 row 右側「市值」＝真實報價市值（原幣別）；原 spec 已寫「市值」，本 change 使 code 對齊。

## 方案

### 1. 估值純函式上移 `services/valuation/`

- 將 `computeHoldingsHero`（現 `features/holdings/holdingsHero.ts`）移至 `apps/mobile/src/services/valuation/`；`features/holdings` 改 `export * from 'services/valuation'` 保相容（HoldingsOverview / AssetDetail 不改行為）。
- 新增 per-position 市值/報酬純函式（供持股列與 hero 共用），例如 `positionValuation(position, quote, rates, displayCcy) → { marketValue, unrealized, returnPct } | null`（缺報價回 null → UI 降級）。
- `toDisplay` 一併上移，**維持** demo FX fallback 行為（見 Non-goals；移除屬另案）。
- 依賴方向：`features/accounts → services/valuation`＝合法（`features/* → services/*`），消除跨 feature import。
- 純函式加 mobile jest 測試（比照 `holdingsHero.test.ts`）：per-position 正常/缺報價/過期/跨幣別/負報酬。

### 2. AccountDetailScreen

- 接線：`useQuotes(targets)`（targets 由該帳戶 positions 組）、`useRefreshQuotesOnFocus`、`useExchangeRatesStore` rates。
- hero：以 `computeHoldingsHero(positions, getQuote, rates, base)` 得帳戶級 value/cost/unrealized/returnPct/pending/notFound/anyStale；標籤改「帳戶市值」，加現金入總值；拆分小字 + 成本/未實現列（`Pnl`）。
- 持股列：`positionValuation` → 市值 + `Pnl 報酬%`；缺報價「更新中…」、`symbol_not_found`「查無代號」。
- 降級：hero 部分渲染 + 揭露列（「N 檔更新中 · N 檔查無代號 · 部分為最後已知（延遲）」+ 重試）；全缺時市值/未實現「報價載入中…」、**現金照常**。

### 3. AccountListScreen row（A2）

- `valueText` 改以 `positionValuation` 合計市值（原幣別多幣別各列；缺報價 → 「更新中」或最後已知）。

### 4. 多幣別

- 對齊持倉總覽：非基礎幣別以 `rates`（app 層已訂閱）`convertMoney`/`toDisplay` 換算進基礎幣別合計；rates 未就緒退回揭露（不靜默混算）。

### Money 紀律

全程 `Money`（報價 `new Money(q.price, ccy)`、市值 `price.multiply(qty)`、換算 `convertMoney`），UI 出口才 `toDisplayString()`/`toNumber()`。

## 邊角/風險（apply 時處理）

- 上移 `computeHoldingsHero` 須確保 HoldingsOverview / AssetDetail import 路徑更新且行為零變化（跑既有 `holdingsHero.test.ts` + 該二畫面視覺回歸）。
- hero「未實現損益」需與持倉總覽「總未實現」語意一致（市值−成本）。
- 帳戶含 skipped（髒資料 symbol）：hero 估值以可推導 positions 為準；skipped 已在 AccountDetail 有「資料異常」列（既有），不重複。
- owner 未核准 A5 增修前，**不**寫入設計 spec；實作可先做但視覺對圖以核准後的 A5 為基準。

## 不做（本 change 邊界）

見 proposal Non-goals：持倉總覽估值重做、demo FX 移除、Pnl 全域 0 中性、現金編輯/識別色、schema 加欄位。
