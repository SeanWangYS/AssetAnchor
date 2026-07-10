## Why

TestFlight dogfood 回饋 ②：帳戶詳情頁的「**帳戶總值**」大數字，實際顯示的是**該帳戶的投入總成本**（`holdingsValueByCurrency` 加總 `totalCost`，`accountDisplay.ts:114` 註解自承「MVP 無即時報價，以總成本為市值代理」），持股列（`AccountDetailScreen.tsx:272`）顯示的也是**成本**。標籤「總值」會讓使用者誤以為是現在市值——owner 明確回饋此誤導。

這是 **code 偏離設計**（非設計缺失）：

- 設計原型（最高權威，`docs/design/app-prototype/prototype/aa-v2-accounts.jsx`）hero＝`a.val + cash`、持股列＝`h.val` + `Pnl pct`，其 demo 資料（`aa-core.jsx`）證明 `val`＝**市值**、`pct`＝報酬率（台積電 100 股×均價 550＝成本 55,000 vs `val:110,000`、`pct:100.0`）。
- 設計 spec `accounts-management-spec.md` A2 明寫「列表 row 右側＝該帳戶持股**市值**（原幣別）」——code 亦用成本代理（`AccountListScreen.tsx:54` 同源）。

Sprint 4 實作當時報價功能尚未存在，才以成本代理；Sprint 5b 報價上線、持倉總覽已改真值（`computeHoldingsHero`），**帳戶頁沒跟上**。owner 已拍板 **B 案：成本與現值並列**（比原型多顯示「投入成本」，屬設計增修 → 需先更新 spec A5，見 design.md，**owner gate**）。

本 change 純 mobile 顯示層（消費既有報價/匯率管線），**不動 Firestore schema（聖牛）/ functions / rules**。

## What Changes

- **帳戶詳情 hero 市值化 + B 案並列**：「帳戶總值」改為**真實市值 + 現金**（基礎幣別）；拆分小字改「持股市值 X · 現金 Y」；**新增一列**「投入成本 X · 未實現損益 ▲Y（+Z%）」（`Pnl` 元件，紅綠 ▲▼）。
- **帳戶列表 row 市值化（A2 對齊）**：`AccountListScreen` row 右側由成本代理改真實市值（原幣別）。
- **帳戶詳情持股列市值化**：每列右側由 `totalCost` 改**市值 + 報酬%**（對齊持倉總覽 `HoldingRow` 三段式與原型）；均價留在 subtitle（成本資訊已隱含）。維持無色點（A1/holdings D3）。
- **報價降級複用持倉頁模式**：單列缺報價→「更新中…」、`symbol_not_found`→「查無代號」；hero 部分渲染（有報價者先納入、缺者揭露「N 檔更新中／查無代號」+ 重試）；全缺時市值/未實現顯示「報價載入中…」但**現金照常顯示**（不以成本假裝市值）。
- **多幣別**：非基礎幣別持股/現金以當日匯率換算進基礎幣別合計（對齊持倉總覽），取代現行「另計 US$ x」；rates 未就緒時退回揭露而非靜默混算。
- **估值純函式上移 `services/valuation/`**：`computeHoldingsHero` + per-position 市值/報酬 helper 由 `features/holdings/` 上移至 `services/valuation/`（`features/holdings` re-export 保相容），讓 `features/accounts` 合法消費（依賴方向：`features/* → services/*`），消除跨 feature import。

## Capabilities

### Modified Capabilities

- `account-management`：**新增需求「帳戶估值以市值呈現」**——帳戶詳情 hero、帳戶列表 row、詳情持股列的估值 SHALL 以真實報價市值呈現（非成本代理）；hero 另 SHALL 並列投入成本與未實現損益（B 案）；報價缺失/過期時 SHALL 複用 live-quotes 的部分渲染/降級（更新中／查無代號／最後已知），不得以成本冒充市值；多幣別 SHALL 以當日匯率換算進基礎幣別。

## Impact

- **程式碼（純 mobile）**：
  - `apps/mobile/src/services/valuation/`（新）：由 `features/holdings/holdingsHero.ts` 上移 `computeHoldingsHero` + 新增 per-position 市值/報酬 helper；`features/holdings` 改 re-export（低風險重構）。
  - `apps/mobile/src/features/accounts/screens/AccountDetailScreen.tsx`：hero（市值+現金+成本+未實現）、持股列（市值+報酬%）、報價/匯率接線（`useQuotes` + `useRefreshQuotesOnFocus` + `exchangeRatesStore`）、降級。
  - `apps/mobile/src/features/accounts/accountDisplay.ts`：`holdingsValueByCurrency`（成本代理）改市值版或新增市值彙總；`AccountListScreen.tsx` row 同步。
  - `packages/shared`：**不動**（`Money`/`convertMoney`/`isFresh` 已在 shared；不新增 shared 函式即不觸 90% gate）。
- **不影響**：Firestore schema（聖牛）、`firestore.rules`、`apps/functions`、報價/匯率後端。
- **DoD**：帶 UI → 視覺對圖（owner gate，基準 `accounts-management-spec.md` A2/A5 + 原型）；estimate/valuation 純函式加 mobile jest 單測；**spec A5 增修需 owner 確認**（design.md 附草案）。

## Non-goals

- **持倉總覽 / AssetDetail 的估值**：已於 `fix-holdings-account-grouping` 及既有 `resilient-quote-display` 處理，本 change 不重做（僅上移共用純函式，行為不變）。
- **`toDisplay` demo 匯率 fallback（1 USD=30.95）的移除**：上移 `services/valuation` 時**維持現行 fallback 行為**（移除會連動改變持倉總覽的降級語意，屬另一 change 的獨立評估），本 change 只搬不改其行為。
- **`Pnl` 全域「0 一律中性」**：屬跨畫面設計決策 follow-up（AssetDetail「已實現損益 ▲NT$0」等），不在本 change。
- **現金編輯（A6）/ 帳戶識別色（A1）/ 停用排序（A3）**：既有功能，不在本 change。
- **schema 加欄位**：無；市值/報酬純由報價 + 既有 `totalCost` 衍生。
