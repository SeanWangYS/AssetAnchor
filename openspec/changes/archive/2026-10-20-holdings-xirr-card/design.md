## Context

bento 第 4 格目前為「本月已實現損益」（`realizedInMonth` + `useRealizedEvents`）。owner 2026-10-21 拍板改為 XIRR（design spec D9），並決定四個口徑：**全程 decimal.js**（Money 精度 gate）、任一持股缺報價顯示「—」、歷史匯率 forward-fill 且載入中顯示「—」、AYI < 1 年的累積報酬＝總獲利 ÷ 總投入。

既有可重用的基礎：

- `transactionTotalWithFees(tx)`：買入含費成本 / 賣出淨收入，與 `deriveHoldings` 同一口徑。
- `FX_USDTWD` 日線：`useTrendSeries` 以全域最早交易日為起點 `historyStore.loadFor`，分塊存於 `chunks[`FX*USDTWD*${year}`]`；`mergeChunkCloses` 合併。
- `buildPortfolioSeries` 內以單一 `USD_TWD` 收盤組出 6 鍵 `RateMap`（含 USDT 1:1 peg）。
- `Money` 以 `decimal.js` 實作，全域 `Decimal.set({ precision: 30, ROUND_HALF_UP })`。
- `computeHoldingsHero`（`services/valuation`）內部以 Money 加總，但輸出為 `number`。

## Goals / Non-Goals

**Goals:**

- shared 提供可重用、全程 decimal 的現金流 / XIRR / AYI 純函式（⑥ 個股年化直接沿用）。
- bento 第 4 格顯示組合 XIRR（或累積報酬），不新增任何 Firestore 讀取。

**Non-Goals:**

- 表格 UI（⑥）、配息、現金流入出、自訂期間績效。

## Decisions

### D1：新模組 `packages/shared/src/returns/`

- `cashFlows.ts`：`buildCashFlows({ transactions, displayCurrency, fxUsdTwdCloses, filter? })` → `{ ok: true; flows: DatedFlow[] } | { ok: false; reason: 'fx_unavailable' }`，`DatedFlow = { date: 'YYYY-MM-DD'; amount: Money }`（顯示幣別）。
- `xirr.ts`：`xirr(flows, terminal: DatedFlow)` → decimal string | `null`。
- `performance.ts`：`summarizePerformance(flows, terminal)` → `{ kind: 'annualized' | 'cumulative'; rate: string; averageYearsInvested: string } | null`。
- 由 `packages/shared/src/index.ts` 匯出。全部 TDD。

### D2：匯率查表與 RateMap 收斂

- 歷史匯率查表：將 `fxUsdTwdCloses` 的日期排序後二分搜尋「≤ 交易日的最後一筆」，無則取「≥ 交易日的第一筆」，皆無回 `fx_unavailable`。不沿用 `forwardFillSeries`（它需要完整日軸，這裡只查少數日期）。
- 自 `buildPortfolioSeries` **抽出** `ratesFromUsdTwd(close: string): RateMap`（6 鍵含 USDT peg）為共用 helper，兩處共用，避免 peg 政策分岔；`buildPortfolioSeries` 既有測試須維持全綠。
- 只有 TWD 交易且顯示 TWD 時不需匯率，日線為空也 `ok`。

### D3：XIRR 求解器（全程 decimal.js）

- 以 `Decimal.clone({ precision: 34 })` 建立模組內私有 Decimal，**不改** `Money` 的全域設定，也不受其影響。
- 年數＝`天數 / 365`（同 Excel）；天數由 `YYYY-MM-DD` 以 UTC 日期差計算，避免時區 / 夏令時間誤差。
- NPV(r) = Σ cfᵢ · (1+r)^(−tᵢ)，導數 NPV′(r) = Σ −tᵢ · cfᵢ · (1+r)^(−tᵢ−1)；Decimal 的 `pow` 支援非整數指數。
- Newton 自 r₀ = 0.1 起最多 50 步；若出界（r ≤ −0.9999 或 > 100）、導數為 0、或未收斂，改用二分法於 [−0.9999, 100]，最多 200 步。
- 收斂條件：|NPV| ≤ 1e-12 × Σ|cf| 或步長 < 1e-14。端點同號（區間內無解）回 `null`。
- 先檢查至少一個負、一個正現金流，否則 `null`。

替代方案：轉 JS `number` 求解 → 違反憲法 #2（`toNumber()` 只准用於 UI 邊界），owner 已否決。

### D4：AYI 與累積報酬

- AYI = Σ(|cfᵢ⁻| × yearsᵢ) ÷ Σ|cfᵢ⁻|，yearsᵢ＝投入日到 terminal 日的年數；只計負現金流（Sharesight 口徑）。
- AYI ≥ 1 → `annualized`（rate = XIRR；XIRR 為 `null` 則整體 `null`）；AYI < 1 → `cumulative`（rate = (terminal + Σcf⁺ − Σ|cf⁻|) ÷ Σ|cf⁻|）。

### D5：期末值用 Money，且必須完整

- `computeHoldingsHero` 額外輸出 `valueMoney: Money`（顯示幣別），既有 `number` 欄位不變（其他畫面不受影響）。
- bento 只在 `hero.pendingCount === 0 && hero.notFoundCount === 0` 時計算；否則「—」。terminal 日期＝本地今日。

### D6：mobile 組裝 hook `usePortfolioReturn`

`features/holdings/usePortfolioReturn.ts`：讀 `transactionsStore` 與 `historyStore.chunks`（`mergeChunkCloses` 取 `FX_USDTWD`），呼叫 D1 函式，以 `useMemo` 依（transactions、FX chunks、valueMoney、顯示幣別）重算。

- **不呼叫 `historyStore.loadFor`**：FX 日線由同畫面的 `useTrendSeries` 觸發載入（零新增 I/O）；hook 只讀 store。
- 匯率就緒判定：需換匯時，從「需換匯的最早交易年份」到今年的每一年 `FX_USDTWD_${year}` 分塊皆已在 store，且 `backfilling['FX_USDTWD']` 不為 true；否則「—」。避免分塊載入一半時誤用其他年份的匯率。
- 呈現：`annualized` →「年化報酬率」；`cumulative` →「累積報酬率」+ 副標；數值 `Pnl` + `formatPercent`（`toNumber()` 只在此 UI 邊界）。

### D7：移除本月已實現

刪除 `realizedInMonth`（valuation）、`useRealizedEvents`（useHoldings）、screen 的 `realized` memo 與第 4 格舊 JSX、`holdingsHero.test.ts` 對應測試；若 mobile coverage 名單因此變動，同步調整 `jest.config.ts`。`RealizedEvent` 型別仍由 shared 提供（其他地方使用則保留）。

## Risks / Trade-offs

- [Decimal 小數次方效能] → 現金流數十筆 × 數十次迭代，毫秒級；以 `useMemo` 避免每次 render 重算。
- [分塊載入未完成時數字跳動] → D6 年份齊備判定，未齊備顯示「—」。
- [匯率日線本身缺年（provider 缺資料）] → 會一直「—」；以「取之後最近一筆」只處理首筆前的缺口，整年缺屬資料問題，維持「—」不冒充。
- [XIRR 多重解（現金流多次變號）] → Newton 自 10% 起取最接近的解；個人投資組合（多買少賣）實務上單一解。
- [配息未計] → 高股息標的被低估，程式碼註解說明（owner 已接受）。

## Migration Plan

純 app 端 + shared 純函式；無 schema / rules / functions 變更、無資料遷移。隨下次 TestFlight 發布；回滾＝revert PR。

## Open Questions

（無；口徑已由 owner 於 2026-10-21 拍板。）
