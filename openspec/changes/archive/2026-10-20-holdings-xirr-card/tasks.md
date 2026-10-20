## 1. shared：匯率 helper 收斂

- [x] 1.1 新增 `ratesFromUsdTwd` 測試（6 鍵、USDT 1:1 peg、TWD_USD 為倒數）→ 實作並自 `buildPortfolioSeries` 抽出改用；`buildPortfolioSeries` 既有測試維持全綠

## 2. shared：returns 模組（TDD：先測試、再實作）

- [x] 2.1 `returns/cashFlows.test.ts`：台股買賣金額（含費 / 淨收入）、美股以交易日匯率換 TWD、TWD 換 USD、休市 forward-fill、首筆前取之後最近、USDT peg、日線為空回 `fx_unavailable`、純 TWD 不需匯率、依 symbol 篩選、忽略非 BUY/SELL、依日期排序
- [x] 2.2 實作 `returns/cashFlows.ts`（`buildCashFlows`）
- [x] 2.3 `returns/xirr.test.ts`：Excel 已知解（9.9714%）、多筆買賣 NPV≈0、虧損為負、全負 / 全正回 `null`、極端報酬仍收斂、Newton 發散時二分法退回
- [x] 2.4 實作 `returns/xirr.ts`（私有 `Decimal.clone({ precision: 34 })`、UTC 日差 / 365、Newton + 二分）
- [x] 2.5 `returns/performance.test.ts`：AYI 加權（小額舊投入 + 大額新投入 → < 1）、`annualized` / `cumulative` 判定與邊界（剛好 1 年）、累積報酬含賣出（20% 例）、無投入回 `null`
- [x] 2.6 實作 `returns/performance.ts`（`summarizePerformance`，含配息未計的英文註解）；`returns/index.ts` 與 `src/index.ts` 匯出；shared `test:coverage` ≥ 90%

## 3. mobile：期末值與組裝

- [x] 3.1 `services/valuation`：`computeHoldingsHero` 增加 `valueMoney: Money` 輸出，補 `holdingsHero.test.ts` 斷言（既有 number 欄位不變）
- [x] 3.2 新增 `features/holdings/usePortfolioReturn.ts`：讀 transactions + `historyStore`（不呼叫 `loadFor`）、年份分塊齊備判定、缺報價 / 匯率未就緒回 `null`
- [x] 3.3 bento 第 4 格改為「年化報酬率」/「累積報酬率」+ 副標；「—」降級；autofit

## 4. mobile：移除本月已實現

- [x] 4.1 刪除 `realizedInMonth`、`useRealizedEvents`、screen `realized` memo 與舊 JSX、對應測試；調整 `jest.config.ts` 名單（若需要）

## 5. 驗證（DoD）

- [x] 5.1 `pnpm -r typecheck`、`pnpm -r lint`、`pnpm exec prettier --check .`、shared `test:coverage`、mobile `test:coverage` 全綠
- [x] 5.2 數值交叉驗證：以種子資料手算（或 mock 的 JS 版本）比對 App 顯示的 XIRR，差距 < 0.01 個百分點
- [x] 5.3 iOS Simulator 對圖（owner gate）：(a) TWD 年化 (b) 切 USD 重算 (c) 新使用者情境（AYI < 1）累積報酬 + 副標 (d) 一檔缺報價顯示「—」；截圖存 `docs/qa/holdings-xirr-card-evidence/`

## 6. 收尾

- [x] 6.1 commit（英文）→ push → PR（帶 UI + Money 精度 → owner merge）
- [x] 6.2 CI 綠 → `/opsx:archive`（sync `portfolio-returns` 新 spec、`holdings-derivation` REMOVED）
