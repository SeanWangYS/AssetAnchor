## 1. B2 — Money 邊界缺欄位防禦（TDD）

- [x] 1.1 寫 `toSafeDecimalString` 測試（缺值→fallback；合法原樣回；present-but-invalid 原樣通過交 Money fail-loud）
- [x] 1.2 實作 `toSafeDecimalString(value: string|undefined|null, fallback='0')`（僅 nullish→fallback），匯出
- [x] 1.3 `deriveHoldings` 的 `tx.total/fee/tax/quantity` 讀取套 `toSafeDecimalString`
- [x] 1.4 寫 deriveHoldings 測試（缺 total/fee/tax 不丟、視為 0；缺 quantity→0 股）+ 既有「corrupted fail-loud」測試仍綠

## 2. B1 — 分析聚合移進 shared（TDD，行為保持）

- [x] 2.1 `packages/shared/src/analysis/`：型別（AnalysisRawHolding/AnalysisHolding/AnalysisTotals/ClassRollup/AnalysisAggregate/AnalysisClass）+ `aggregateHoldings(rawHoldings, rates, base)` + `classOf` + `returnPercent`
- [x] 2.2 shared 測試：totals/byClass 佔比、報酬率防零除、空輸入、跨幣別換算（100% cov）
- [x] 2.3 匯出（shared index）；mobile `analysisData.ts` 改 thin consumer（保留 RAW_HOLDINGS/DEMO_RATES、委派 shared、type re-export 含 `AnalysisClass as AssetClass`）
- [x] 2.4 分析畫面 import 來源不變（type re-export 維持），typecheck 綠

## 3. Definition of Done

- [x] 3.1 `pnpm --filter @assetanchor/shared test:coverage` 綠（216 tests；analysis/safeDecimal 100%）
- [x] 3.2 `pnpm -r typecheck` / `lint` / `format:check` 全綠
- [x] 3.3 commit 累積到 feature/sprint7-harden-finish
