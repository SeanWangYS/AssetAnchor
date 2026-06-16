# Product Backlog — 未來優化考慮清單

收錄「目前刻意不做、但未來值得優化」的產品 / UX 項目（非 bug、非 MVP 必備）。每項註明來源 sprint 與理由，待有需求再排入。

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
