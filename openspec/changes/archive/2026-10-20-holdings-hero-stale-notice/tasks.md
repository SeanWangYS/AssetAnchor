## 1. shared 純函式（TDD：先測試、再實作）

- [x] 1.1 `format/date.test.ts` 新增 `formatMonthDayTime` 測試（`9/22 17:10`、`10/3 09:05`、跨年、午夜 `00:00`）→ 實作 `formatMonthDayTime` 並由 `format/index.ts` 匯出
- [x] 1.2 新增 `quotes/staleness.test.ts`：fresh / soft / hard、最舊一檔決定等級、天數無條件捨去、`hardCount`/`total`、邊界（剛好 1h → fresh、剛好 24h → soft）、空集合、未來時戳
- [x] 1.3 實作 `quotes/staleness.ts`（`classifyQuoteStaleness` + `QUOTE_STALE_SOFT_MS` / `QUOTE_STALE_HARD_MS`），由 `quotes/index.ts` 匯出；`pnpm --filter @assetanchor/shared test:coverage` ≥ 90%

## 2. mobile 文案與 token

- [x] 2.1 `features/holdings/staleNotice.test.ts`：soft 文案、hard 全部停更文案（含天數與停在時間）、hard 部分文案（`N 檔報價已逾 1 天未更新`）、fresh 回 `null`
- [x] 2.2 實作 `features/holdings/staleNotice.ts`（`staleNoticeFor`）
- [x] 2.3 `core/theme` 新增 `colors.warning = '#F5A623'`（英文註解說明語意獨立於圖表色）

## 3. HoldingsOverviewScreen hero

- [x] 3.1 移除變動行（`heroChange` / `全期`）與灰色說明行；將口徑說明改寫為英文註解（市值/今日依即時報價、延遲約 15 分鐘、不含現金、成本與已實現來自交易）
- [x] 3.2 移除 `quotesAsOf`（max）memo；以 `quoteTargets` + `quoteFor` 收集 `fetchedAtMs` → `classifyQuoteStaleness` → `staleNoticeFor`
- [x] 3.3 soft：大數字下淡色小字；hard：橙色警示框 + 「重試」（呼叫 `onRefresh`）+ 大數字 `opacity 0.55`
- [x] 3.4 既有降級列移除「部分為最後已知報價（延遲）」片段，保留「N 檔報價更新中 / N 檔查無代號」+ 重試；`hero.anyStale` 不動（今日損益仍依它顯示「—」）
- [x] 3.5 加 60 秒 interval 於 screen 掛載期間觸發重算（D7），unmount 清除
- [x] 3.6 本次觸及的既有中文註解順手改英文（憲法 #10）

## 4. 驗證（DoD）

- [x] 4.1 `pnpm -r typecheck`、`pnpm -r lint`、`pnpm exec prettier --check .`、shared `test:coverage`、`pnpm --filter @assetanchor/mobile test` 全綠
- [x] 4.2 iOS Simulator 視覺對圖（owner gate，對照 `holdings-redesign-mock.html`）：(a) 正常：hero 只有 label + 大數字 (b) soft：將 emulator `quotes/*.fetched_at` 改為 3 小時前、以不含 functions 的 `emulators` 模式啟動使刷新失敗 (c) hard 全部：改為 29 天前 (d) hard 部分：只改一檔 (e) 點「重試」觸發刷新；各狀態截圖附於 PR
- [x] 4.3 確認 AssetDetail「最後更新 HH:mm · 延遲」、帳戶詳情、分析頁揭露未受影響

## 5. 收尾

- [x] 5.1 commit（英文 Conventional Commits）→ push → 開 PR（帶 UI → owner merge，不自 merge）
- [x] 5.2 CI 綠 → `/opsx:archive`（spec sync 進 `openspec/specs/live-quotes`、`currency-display`）
