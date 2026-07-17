# Tasks — fix-display-formatting

## 1. shared format 模組（TDD：先測後寫）

- [ ] 1.1 `format/currency.ts` 測試 + 實作：currencyPrefix / amountDisplayDecimals / formatAmount / formatMoney / formatPrice（一律 2 位）/ formatQuantity / signOf（0→flat）
- [ ] 1.2 `format/percent.ts` 測試 + 實作：formatPercent（2 位預設、U+2212、0 無號）/ allocatePercentages（largest-remainder、空/全零/負權重邊界）
- [ ] 1.3 `format/date.ts` 測試 + 實作：formatDisplayDate（ISO→YYYY/MM/DD、非法原樣）/ formatDisplayDateTime
- [ ] 1.4 `format/fx.ts` 測試 + 實作：formatFxRate（固定 2 位、非有限→'—'）
- [ ] 1.5 `src/index.ts` export + coverage gate ≥90% 綠

## 2. mobile 收斂

- [ ] 2.1 `transactionsView.ts`：formatAmount/formatMoney/formatPrice/formatQuantity/currencySymbol 改 shared 委派；groupByMonth 恆帶年（同步 `dateRange.test.ts` 等既有測試）
- [ ] 2.2 `accountDisplay.ts`：currencyPrefix/formatAmount/formatMoney 委派；formatSnapshot 內部改 formatDisplayDateTime
- [ ] 2.3 `holdingsDemo.ts`：currencyPrefix/displayDecimals/fmtAmount/fmtMoney/fmtShares 委派
- [ ] 2.4 `analysisData.ts`：formatAmount/formatSignedAmount/formatPercent/fxFootnoteRate 委派（金額改幣別小數位；報酬率 2 位）
- [ ] 2.5 `Pnl.tsx`：signOf 接線、零值中性（色 + 無前綴）
- [ ] 2.6 畫面 call site：HoldingsOverview（均價 formatPrice、percent ×4）、AssetDetail（percent ×2、均價）、AssetTransactions（日期）、TransactionDetail（日期）、AccountDetail（percent ×2；hero 2 位保留）、AnalysisOverview（佔比 allocate、匯率）
- [ ] 2.7 mobile jest（`pnpm --filter @assetanchor/mobile test`）綠

## 3. 設計包同步（PR 置頂明示）

- [ ] 3.1 `aa-v2-txn.jsx` 日期兩處 → `YYYY/MM/DD`
- [ ] 3.2 `aa-analysis-charts.jsx` 報酬率 toFixed(1) → toFixed(2)

## 4. 驗證（DoD）

- [ ] 4.1 設計稽核：2 獨立子代理（邏輯 / 簡潔）對照程式碼稽核本設計，必改點採納
- [ ] 4.2 `pnpm -r typecheck` / `pnpm -r lint` / `pnpm exec prettier --check .` / shared coverage / mobile test 全綠
- [ ] 4.3 模擬器逐畫面對照截圖：持倉（均價 2 位、零值中性、%2 位）、個股（已實現 0 中性——需暫無賣出標的、日期）、交易清單（帶年）、交易詳情（日期）、帳戶（快照時戳）、分析（匯率 2 位、佔比 100.0、%2 位）
- [ ] 4.4 跨畫面數字同時窗比對（報價漂移防呆）

## 5. 收尾

- [ ] 5.1 commit → push → PR（owner 拍板項①②③④列置頂 + 設計包編輯明示）
- [ ] 5.2 CI 綠（owner-gated，不自 merge）→ `/opsx:archive`
