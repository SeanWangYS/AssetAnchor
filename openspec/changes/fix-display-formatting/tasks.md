# Tasks — fix-display-formatting

> 設計稽核（2 子代理：邏輯 / 簡潔）已完成，9 必改全採納：委派層簽名保真表（abs/signed 靜默雷）、AssetTransactions/AccountDetail 漏網 price call site、已實現 +/− spec 例外、零值改「顯示字串判 0」、設計包同步補拍板項①④原型碼、Analysis hero CountUpAmount、編輯帶值掉尾零補任務、Risks 措辭、groupByMonth 補測試（原 dateRange.test.ts 為誤指）。

## 1. shared format 模組（TDD：先測後寫）

- [x] 1.1 `format/currency.ts` 測試 + 實作：currencyPrefix / amountDisplayDecimals / formatAmount（裸數字、保留負號）/ formatMoney（含前綴）/ formatPrice（一律 2 位、含前綴）/ formatQuantity / signOf（0→flat）
- [x] 1.2 `format/percent.ts` 測試 + 實作：formatPercent（2 位預設、U+2212、0 無號、signed:false 回絕對值）/ allocatePercentages（largest-remainder、空/全零回全零、負權重 throw）
- [x] 1.3 `format/date.ts` 測試 + 實作：formatDisplayDate / formatDisplayDateTime
- [x] 1.4 `format/fx.ts` 測試 + 實作：formatFxRate（固定 2 位、非有限→'—'）
- [x] 1.5 `src/index.ts` export + coverage gate ≥90% 綠

## 2. mobile 收斂（依 D1b 簽名保真表）

- [x] 2.1 `transactionsView.ts`：委派（formatQuantity 保留 2-arg）；groupByMonth 恆帶年 + **補單元測試**
- [x] 2.2 `accountDisplay.ts`：委派；formatSnapshot 內部改 formatDisplayDateTime
- [x] 2.3 `holdingsDemo.ts`：委派（Money 型 adapter）
- [x] 2.4 `analysisData.ts`：委派（**formatAmount 保留 Math.abs、formatPercent 保留 positional/signed=false 預設**）；fxFootnoteRate → formatFxRate
- [x] 2.5 `Pnl.tsx`：flat = value===0 或 isDisplayZero(display)；中性色、無前綴
- [x] 2.6 畫面 call site（design 對照表）：HoldingsOverview（均價 formatPrice、percent ×4、總報酬率 card plusminus）、AssetDetail（percent ×2、均價、報酬率 plusminus）、**AssetTransactions local fmt L111/L138 → formatPrice** + 日期、TransactionDetail（日期；已實現 +/− 保留）、AccountDetail（percent ×2 + plusminus、**均價 L386 → formatPrice**）、AnalysisOverview（佔比 allocate、匯率、**CountUpAmount 幣別小數位**、**L279 prefix 收斂**）
- [x] 2.7 `AddTransactionScreen.toFormDefaults`：price 帶值改 `toDisplayString(2)`（不掉尾零）
- [x] 2.8 mobile jest 綠

## 3. 設計包同步（獨立 commit、PR 置頂明示；對照 D3b 表）

- [x] 3.1 `aa-v2-txn.jsx` L116/L174 日期 → `YYYY/MM/DD`；L176 單價一律 2 位
- [x] 3.2 `aa-txn-data.jsx` L42 txQtyPx 單價一律 2 位
- [x] 3.3 `aa-analysis-charts.jsx` L187 報酬率 2 位；`aa-analysis-page.jsx` L36 金額 USD 2 位
- [x] 3.4 grep 原型 arrowed-percent 用法同步 +/−（有才動）

## 4. 驗證（DoD）

- [x] 4.1 設計稽核：2 獨立子代理（邏輯 / 簡潔）——必改點已採納（見頂部註記）
- [x] 4.2 `pnpm -r typecheck` / `pnpm -r lint` / `pnpm exec prettier --check .` / shared coverage / mobile test 全綠
- [x] 4.3 模擬器逐畫面對照截圖：持倉（均價 2 位、%2 位、總報酬率 +/−）、個股（日期、報酬率）、交易清單（帶年、已實現 +/−）、交易詳情（日期）、帳戶（均價、快照時戳、USDT 列若有）、分析（匯率 2 位、佔比 100.0、%2 位、hero 小數位）
- [x] 4.4 跨畫面數字同時窗比對（報價漂移防呆）

## 5. 收尾

- [ ] 5.1 commit → push → PR（owner 拍板項①②③④+D5b 列置頂 + 設計包編輯明示）
- [ ] 5.2 CI 綠（owner-gated，不自 merge）→ `/opsx:archive`
