# Tasks: wire-analysis-real-data

## 1. Shared 純函式 buildAnalysisInput（TDD）

- [ ] 1.1 先寫 `packages/shared/src/analysis/analysisInput.test.ts`：市值映射（price × quantity）、cost = totalCost、缺報價排除 + pendingCount、過期報價納入 + anyStale、metadata fallback（name=symbol、assetType='STOCK'）、空 positions
- [ ] 1.2 實作 `packages/shared/src/analysis/analysisInput.ts`（`buildAnalysisInput` + 型別），自 `analysis/index.ts` re-export；`pnpm --filter @assetanchor/shared test:coverage` 綠（gate 90%）

## 2. analysisData.ts 瘦身（移除 mock）

- [ ] 2.1 移除 `RAW_HOLDINGS` 與 `aggregateAnalysis()`；保留 `DEMO_RATES` / `toDisplay` / 格式化 helpers / 型別 re-export；更新檔頭註解（mock 理由已失效 → 真值資料流）

## 3. AnalysisOverviewScreen 接真實資料

- [ ] 3.1 接四個資料源：`useTransactionsStore`（transactions/loading/error）+ 本地 fail-soft `deriveHoldings` hook（design D1）、`useSymbols`（名稱/assetType）、`useQuotes` + `useRefreshQuotesOnFocus`（design D4）、`useExchangeRatesStore`
- [ ] 3.2 以 `buildAnalysisInput` + `aggregateHoldings` 計算聚合（try/catch 匯率降級維持）；donut/圖例過濾 `count===0` 類別
- [ ] 3.3 降級態（design D3）：ErrorState / LoadingView / EmptyState、全缺報價「報價載入中…」+ 重試、部分缺/過期揭露列 + 重試
- [ ] 3.4 header 刷新鈕改 `loadFor({force:true})` + toast「報價已更新」；hero 註腳改顯示實際 USD_TWD 匯率

## 4. 驗證與收尾

- [ ] 4.1 `pnpm -r typecheck`、`pnpm -r lint`、`pnpm --filter @assetanchor/shared test:coverage`、`pnpm --filter @assetanchor/mobile test` 全綠；`openspec validate --change wire-analysis-real-data`
- [ ] 4.2 Conventional commits、push `feature/wire-analysis-real-data`、`gh pr create`（base main；PR 描述註明「視覺對圖待 owner」與檢查點清單）
