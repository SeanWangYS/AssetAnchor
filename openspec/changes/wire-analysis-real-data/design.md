# Design: wire-analysis-real-data

## Context

分析頁（`features/analysis`）在 `align-to-design-package` 時以 mock 落地（design spec §5 假資料），聚合數學已於 `harden-shared-logic` 抽到 shared `aggregateHoldings`（純函式、有測試）。當時「資料真實化」被列為 Non-goals，理由有二：(1) 報價未串接、算不出市值；(2) features 之間禁互 import，分析頁拿不到 holdings。兩個前置現在都已解除：

- 報價：`services/quotes`（`useQuotes` / `useRefreshQuotesOnFocus` / `quoteFor` / `loadFor({force})`，ADR-0006 雙層 cache + resilient 降級 + 批次 fetchQuotes）。
- 持倉：shared `deriveHoldings`（`Position[]`，零新增 I/O），資料源為 `features/transactions` 的 `useTransactionsStore`（onSnapshot）。
- 匯率：`services/exchange-rates`（最新一筆 `RateMap`，未就緒 null）。
- 名稱/類別：`services/symbols`（名稱 enrich；`asset_type` 可自交易推導）。

**UI 權威**：`docs/design/analysis-page/analysis-page-spec.md`（§3 畫面規格、§4 互動、D2 幣別切換、D3 圓餅維度）＋ `docs/design/app-prototype/`（衝突時為準）。本 change 不動版型/圖表，只換資料源與加降級態；降級態的顯示語彙沿用持倉頁已 ship 的 resilient-quote-display 慣例（「更新中…」「報價載入中…」「N 檔報價更新中」「部分為最後已知報價（延遲）」＋重試），不發明新樣式。

## Goals / Non-Goals

**Goals:**

- 分析頁 hero / 5 圖卡全部改吃真實 holdings × quotes（TWD 內部基準，顯示時換算，ADR-0005）。
- 缺報價/過期報價的行為與持倉頁一致（部分渲染 + 揭露 + 重試；缺報價不顯示假值）。
- 市值映射數學（price × quantity、pending/stale 計數）為 shared 純函式（TDD、coverage gate）。
- 空/載入/錯誤態與持倉頁同款（EmptyState / LoadingView / ErrorState）。

**Non-Goals:**

- 不改版型、圖表元件、導航；不碰 Firestore schema；不動 functions。
- 不做年化報酬率、drill-down、更多維度、Top N 收合（proposal Non-goals）。
- 不重構 `useHoldings`/`transactionsStore` 的落點（見決策 D1）。

## Decisions

### D1：分析頁的持倉資料源＝直接讀 `useTransactionsStore` + shared `deriveHoldings`（不 import `features/holdings`）

問題：依賴規則「feature 之間不互 import」，分析頁不能用 `features/holdings/useHoldings.ts`。推導邏輯本體已在 shared（`deriveHoldings`），`useHoldings` 只是 15 行的 mobile 邊界 glue（讀 store + fail-soft try/catch）。

**選擇**：在 `features/analysis` 內建立同構的小 hook（讀 `useTransactionsStore` → `useMemo` + `deriveHoldings` fail-soft），付出 ~15 行受控重複。

考慮過的替代方案：

1. **import `features/holdings/useHoldings`** — 直接違反依賴規則，否決。
2. **把 `useHoldings` 移到 `services/`** — `useHoldings` 依賴 `features/transactions` 的 store；services 不得 import features，等於得連 `transactionsStore` 一起搬到 `services/transactions`。這會動到 10+ 檔案（holdings/accounts/transactions 全部 import 路徑）、把「UI change」膨脹成跨 feature 重構，且 `transactionsStore` 的 subscribe/stop 生命週期與 transactions feature 綁定。架構上長期是對的，但屬另案低風險重構（記入 backlog 候選），不塞進本 change。
3. **交易資料經 route params / context 傳遞** — 過度工程，且分析頁是平行 tab、無自然傳遞路徑。

「跨 feature 讀 zustand store（資料源）」是 codebase 既有、有文件背書的慣例：`holdings-derivation` change 的 design D3 明載，且 `features/holdings`、`features/accounts` 都直接 import `useTransactionsStore`。本 change 沿用同一慣例，並限縮為「只讀 store，不 import 對方 feature 的元件/衍生 hook」。

### D2：市值映射（Position × Quote → AnalysisRawHolding）放 shared 純函式 `buildAnalysisInput`

市值 = 現價 × 股數是金錢數學（ADR-0005 必 `Money`），且 pending/stale 判定屬 silent-severe 資料流（算錯不會 crash、只會安靜顯示錯數字）——依 ADR-0007 這正是該進 shared + 單元測試的層。與 `computeHoldingsHero`（mobile 端）不同的是：分析頁的下游 `aggregateHoldings` 已在 shared，把映射也放 shared 使「Position[] → AnalysisAggregate」全鏈路可測。

契約（`packages/shared/src/analysis/analysisInput.ts`）：

```ts
interface AnalysisQuoteInput { price: string; fetchedAtMs: number }   // 原幣別現價（10 位小數 string）
interface AnalysisSymbolMeta { name?: string; assetType?: AssetType } // 缺值 fallback：name=symbol、assetType='STOCK'
interface AnalysisInput {
  rawHoldings: AnalysisRawHolding[]; // 餵給既有 aggregateHoldings
  includedCount: number;             // 有報價、已納入
  pendingCount: number;              // 缺報價、已排除（揭露「N 檔報價更新中」）
  anyStale: boolean;                 // 任一納入者報價過期（isFresh 判定）
}
buildAnalysisInput(positions, resolveQuote, resolveMeta, nowMs): AnalysisInput
```

- 報價以 resolver 注入（同 `computeHoldingsHero` 模式）：純函式不耦合 store/firebase，可測。
- `value = new Money(quote.price, position.currency).multiply(position.quantity)`；`cost = position.totalCost`（皆原幣別，換算交給下游 `aggregateHoldings`/`convertMoney`）。
- 缺報價 → 排除 + `pendingCount++`（對齊持倉頁：不顯示假值）；過期報價仍納入市值但 `anyStale = true`（對齊 `computeHoldingsHero`：最後已知值優於空白；分析頁無「今日損益」欄，故無「過期不算今日」的分支）。

### D3：降級態的畫面策略（對齊持倉頁語彙）

| 狀態 | 判定 | 畫面 |
| --- | --- | --- |
| 載入失敗 | `transactions.length===0 && txError` | `ErrorState`（同持倉頁） |
| 交易載入中 | `transactions.length===0 && txLoading` | `LoadingView` |
| 無持倉 | `positions.length===0` | `EmptyState`「尚無持倉」導去交易頁 |
| 匯率換算失敗 | `aggregateHoldings` throw（rates 缺 key） | 既有空態文案「匯率尚未就緒…」（保留） |
| 全部缺報價 | `includedCount===0 && pendingCount>0` | hero 位置「報價載入中…」+ 重試；不渲染圖卡（無資料可畫） |
| 部分缺報價 | `pendingCount>0` | 正常渲染（僅含已納入者）+ hero 下揭露「N 檔報價更新中」+ 重試 |
| 含過期報價 | `anyStale` | 正常渲染 + 揭露「部分為最後已知報價（延遲）」 |

匯率 fallback 維持現狀（`storeRates ?? DEMO_RATES`，design spec §5 的 1 USD = 30.95）；hero 註腳改顯示實際使用中的 USD_TWD 匯率值，不再寫死。

### D4：報價載入時機沿用持倉頁三件套

`useQuotes(targets)`（targets 變動載入）+ `useRefreshQuotesOnFocus(targets)`（切回分頁/回前景，TTL 去抖）+ header 刷新鈕 `loadFor(targets, {force:true})`（取代 demo toast）。targets 由 positions 推導（market/symbol/currency），與持倉頁同一組 → 共用 in-memory/Firestore cache，切頁不重打 API。

### D5：`analysisData.ts` 瘦身而非刪除

移除 `RAW_HOLDINGS` + `aggregateAnalysis()`（mock 入口）；保留 `DEMO_RATES`、`toDisplay`、`formatAmount/formatSignedAmount/formatPercent`、型別 re-export——這些是顯示層格式化，與資料源無關，消費端 import 路徑不變。

## Risks / Trade-offs

- [D1 的受控重複：fail-soft glue 兩份] → 各自 3 行 try/catch + 註解互指；真正邏輯在 shared 單一來源。若未來第三個 feature 也要 holdings，屆時執行「transactionsStore + useHoldings 搬 services」重構（已記 backlog 候選）。
- [報價全缺時分析頁「整頁不渲染圖卡」比持倉頁（列表仍在）更空] → 持倉頁列表每 row 可單獨「更新中…」，分析頁的圖卡是聚合圖、無單 row 降級位；全缺屬冷啟極短暫狀態（Firestore cache TTL 內即回填），且提供重試。
- [assetType 自交易推導，同 symbol 混填 STOCK/ETF 時取第一筆] → 沿用 `symbolTargetsFromTransactions` 既有語意（持倉頁同款），不另發明。
- [donut 在單一類別（只有個股或只有 ETF）時出現 0% 分段] → 圖例/分段過濾 `count===0` 的類別，避免空圖例列；`aggregateHoldings` 契約不變。
- [count-up 動畫在報價陸續回填時 target 抖動] → 既有 `CountUpAmount` 以 target 變化重跑，行為與持倉頁 hero `useCountUp` 一致，可接受。

## Migration Plan

純 client 顯示層變更：單 PR、無資料遷移、無 schema/functions 變更。Rollback = revert PR。視覺對圖（iOS Simulator vs design spec §3 + prototype）由 owner 批次驗收（PR 描述註明）。

## Open Questions

（無——降級語彙、資料流、落點皆有既有慣例可循。）
