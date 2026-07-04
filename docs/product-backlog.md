# Product Backlog — 未來優化考慮清單

收錄「目前刻意不做、但未來值得優化」的產品 / UX 項目（非 bug、非 MVP 必備）。每項註明來源 sprint 與理由，待有需求再排入。

## 🔴 高優先（owner 標記）

（無——「資產走勢圖接真實資料」已由 change `add-real-trend-series` 交付（2026-07-04，ADR-0010）：`price_history` 落地日線 + 開圖 lazy 增量 + 兩畫面接真值。衍生候選項見下方「走勢圖後續」。）

## 走勢圖後續（ADR-0010 衍生候選）

- **除權/分割還原** — `adjcloses` 已一併落地未消費；分割事件附近的歷史市值段會失真（MVP Non-goal，台股+ETF 為主影響小）。觸發：持有個股發生分割，或要做「還原績效」曲線。
- **台股 fallback provider（TWSE 官方 API / FinMind）** — `HistoryProvider` 介面已留擴充點；Yahoo 若對 GCP IP 持續 429 再實作（TWSE keyless、一次一個月）。
- **每日組合快照作快取層** — 若組合序列 client 重建變慢（交易量大幅成長），可加 snapshot 當快取（非第一手資料，重算即正確；ADR-0010 Alternatives C）。

## 報價 / 資料真值（Quotes / real data）

- **分析頁接真實報價** — 來源：2026-06-18 視覺驗證發現。分析頁市值仍用寫死 mock `RAW_HOLDINGS`（`apps/mobile/src/features/analysis/analysisData.ts`），未接真實 holdings/quotes，故無法對真資料驗證、永遠顯示假數字。觸發：報價/持倉真值已就緒（`resilient-quote-display` + `add-quote-batch-discovery` 已 ship；聚合純函式已在 `shared`，`harden-shared-logic`），可把分析頁聚合改吃真實 holdings + quotes。
- **MMKV 本機持久層（報價 cache 終局，roadmap 層 3）** — 來源：報價架構 roadmap，owner 2026-06-19 延後（動原生 build）。已備：OpenSpec change `add-mmkv-quote-cache`（proposal/design/specs/tasks）+ 純 codec `quoteCache.ts`（serialize/deserialize，100% cov），在分支 `feature/add-mmkv-quote-cache`（**無 PR**）。剩：裝 `react-native-mmkv` + `expo prebuild` + rebuild + `quotesStore` hydrate/write-through + 冷啟動/離線 dogfood。完成後冷啟動/離線即顯示最後已知報價（完成 ADR-0006 三層 cache）。

## 帳戶（Accounts）

- **帳戶手動重排 UI（拖曳 / 上下移）** — 來源：Sprint 2（`add-account-management`）。MVP 先以建立順序自動指派 `display_order`、列表照此排序；帳戶數量少時影響不大。待帳戶成長或有明確需求，再做拖曳重排 + 批次更新 `display_order`。

## 資料 / 防禦（Data robustness）

- **舊 schema 交易 doc 的 `DecimalError` 防禦** — 來源：align-to-design 已知邊界。pre-ADR-0005 建立、缺 `total` / `fee` / `tax` 欄位的 transaction doc，讀回時會讓持倉頁丟 `DecimalError`（`Money.fromDecimalString` 收到 `undefined`）。目前種子資料皆為新 schema，不受影響，故先不做。觸發：實際接到舊資料時，做一次性遷移補齊欄位，或在 `deriveHoldings` / `Money` 邊界加 missing-field 防禦（缺值視為 0 或跳過該筆）。

## E2E / 測試自動化

- **iOS 模擬器自動化 / E2E 工具（AXe + ios-simulator-mcp + Maestro）** — 來源：ADR-0007 §6 已 park 在 backlog（上架前再議）。完整方案見 [`docs/superpowers/plans/ios-simulator-automation-e2e-plan.md`](superpowers/plans/ios-simulator-automation-e2e-plan.md)。讓 Claude Code 能自主「觀察 + 操控」Simulator 並跑可重跑的 E2E flow。觸發：要做自主 E2E / agent-driven debug，或上架前的回歸測試。

## UI 打磨（移出主路線）

- **UI 過渡件升級** — 來源：align-to-design 過渡件（tasks 10.1 / 10.2）。目前為求快速對齊設計，以下皆是受控文字欄過渡版，待主路線完成後打磨：
  - 股票代號改為可搜尋 picker（目前是受控文字欄）。
  - 交易日期改為原生 `DatePicker`（目前是受控文字欄）。
  - Loading skeleton、離線 / 抓取失敗態、首次引導（onboarding）。
    觸發：核心 flow 穩定後的 UX polish pass，或使用者回報輸入體驗摩擦。

## 重構（可測性）

- **analysis 聚合邏輯重構為可測 shared 純函式** — 來源：align-to-design task 6.2。類別 / 幣別聚合目前放在 `apps/mobile/src/features/analysis/analysisData.ts`（feature-local、未測）。待重構進 `packages/shared`（純函式）並補單元測試，納入 coverage gate。觸發：analysis 邏輯要擴充（新增聚合維度 / 圖表），或要為其建立回歸保護時。
