## Why

Change 1（`add-transaction-entry`）已能把 BUY 交易寫進 event-sourcing 的 transactions 表，但使用者還看不到「我現在持有什麼、成本多少」——持倉是這個 App 的核心價值（planning doc §3 持倉檢視）。依 ADR-0004，持倉不落地、由 transactions **動態推導**；本 change 補上 Sprint 3 的讀取/計算路徑：加權平均成本（§4）+ 持倉清單 + 個股明細與對帳 timeline，完成 §13.2 Sprint 3 的驗收標準「能輸入買入 → 看到加權平均成本正確的持倉清單」。

這也是 ADR-0007 測試地基（Change 1 架好的 CI 分層）守護的第一個 cost-calc 落地：純計算走 TDD、§4 worked example（台積電 avg=550.76）直接當 fixture。

## What Changes

- **`packages/shared` 新增 `portfolio/` 純計算模組**：`deriveHoldings(transactions): Position[]`——按 `(market, symbol)` 跨帳戶聚合 BUY 交易，算出總股數、總成本（含 fee + tax）、加權平均成本。全程 `Money`，TDD ≥90%（沿用 shared 全域 gate）。
- **持倉 Tab 改為 HoldingsStack**（比照 AccountsStack）：`HoldingsOverview`（list）→ `AssetDetail`（detail），導航型別擴充。
- **HoldingsOverview**：移除 Sprint 1 的 rail 除錯殼，改為持倉清單——依 `market` 分組（TW / US），每組顯示原幣別總成本小計；row 顯示 symbol、股數、加權均價、總成本（**無現價 → 右欄是成本非市值**）。
- **AssetDetail**：個股持倉摘要（總股數 / 加權均價 / 總成本 / 幣別）+ **對帳 timeline**（該股交易依日期排序的明細：日期 / 股數 / 單價 / 手續費），一個畫面讀完持倉與對帳。
- **資料來源零新增 I/O**：UI 由既有 `transactionsStore`（onSnapshot）的資料以 `useMemo(deriveHoldings)` 推導，不新增 Firestore 讀取、不改 rules、不改 schema。

## Capabilities

### New Capabilities

- `holdings-derivation`: 從交易事件流動態推導持倉——`(market, symbol)` 聚合、加權平均成本（含 fee + tax，§4 公式與 worked example）、持倉清單檢視（依市場分組）、個股明細與對帳 timeline。

### Modified Capabilities

<!-- 無。本 change 純讀取/計算：不動 §6 schema（只消費 TransactionDocument）、不動 rules、不動 transaction-entry 既有 requirements。 -->

## Impact

- **packages/shared**：新增 `src/portfolio/`（`deriveHoldings` + Position 型別 + 測試）；`index.ts` 增加匯出。零 schema / 型別變更（只讀 `TransactionDocument`）。
- **apps/mobile**：`features/holdings/`（HoldingsStack、HoldingsOverviewScreen、AssetDetailScreen、由 transactionsStore 推導的 selector/hook）；`core/navigation/types.ts` 新增 `HoldingsStackParamList`；`MainTabs` 的 Holdings tab 換成 HoldingsStack。資料來源：holdings 讀取 `features/transactions` 的 `useTransactionsStore`——跨 feature 讀 Zustand store 為 codebase 既有慣例（accounts→auth、transactions→accounts 已有前例），不另開重複 listener（見 design D3）。
- **firebase / functions / CI**：零變更（rules、indexes、workflow 皆不動；新純函式自動落入 shared coverage gate）。
- **docs**：無新 ADR（ADR-0004 已涵蓋動態推導決策）。

## Non-goals

明確排除（守 MVP 邊界與 sprint 切片，planning doc §3 / §13.2）：

- **現價 / 市值 / 未實現損益 / 報酬率顯示** → Sprint 5（需報價）。本 change 持倉右欄顯示**總成本**。
- **SELL 與已實現損益、賣出歸零重買的持有週期（lot）** → Sprint 5。MVP 只有 BUY，`deriveHoldings` 為 BUY-only 扁平聚合，不引入 lot 概念。
- **跨幣別總資產（TWD+USD 合計）** → Sprint 4（需匯率）。本 change 各市場以原幣別小計，不跨幣別加總。
- **走勢圖、time tabs、總資產大字版頭** → Sprint 5+（設計稿留位置，無資料先不做）。
- **按帳戶 / 資產類型篩選（segmented filter）**、**帳戶內持股清單（AccountDetail 擴充）** → 後續。
- **帳戶 cash 對比的完整對帳功能** → Sprint 6。本 change 的 timeline 僅個股交易順序。
- **dark mode / 視覺 reskin、AddTransaction bottom-sheet 化** → 後續（結構先於配色，theme tokens 已隔離）。
- **空持倉之外的 edge UI**（如 symbol 改名、資料修復工具）→ 不在 MVP。
